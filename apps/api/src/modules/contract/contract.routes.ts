import { Router } from 'express';
import crypto from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AppContext } from '../../context.js';
import { contractSignatures } from '../../db/schema.js';
import { badRequest } from '../../lib/http-error.js';
import { serialize } from '../../lib/serialize.js';
import { currentProject } from '../projects/access.js';
import { appUrl, renderContractExecutedMail } from '../../lib/mailer.js';
import { audit } from '../../lib/audit.js';

export function contractRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;

  /** Ottiene l'ultima firma valida del contratto per il progetto */
  router.get('/', async (req, res) => {
    const project = currentProject(res);
    const [sig] = await db
      .select()
      .from(contractSignatures)
      .where(eq(contractSignatures.projectId, project.id))
      .orderBy(desc(contractSignatures.signedAt))
      .limit(1);

    res.json(serialize({ signed: !!sig, signature: sig || null }));
  });

  /** Sottoscrizione con valore legale ex US E-SIGN Act, UETA & EU eIDAS */
  router.post('/sign', async (req, res) => {
    const project = currentProject(res);
    const bodySchema = z.object({
      signerName: z.string().min(3, 'Il nome del firmatario deve contenere almeno 3 caratteri'),
      vexatiousAccepted: z.literal(true, { message: 'Devi accettare espressamente le clausole speciali' })
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || 'Dati firma non validi');
    }

    const { signerName } = parsed.data;
    const signerEmail = req.user?.email || 'client@official.com';
    const signerRole = req.user?.role || 'client';

    // Rileva IP reale
    const forwarded = req.headers['x-forwarded-for'];
    const signerIp = (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null) ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const signerUserAgent = req.headers['user-agent'] || 'Browser Client';
    const now = new Date();

    // Genera Hash SHA-256 crittografico
    const rawPayload = `${project.id}|${signerEmail}|${signerName}|${now.toISOString()}|${signerIp}|${signerUserAgent}|B2B_AGREEMENT_V1`;
    const hashHex = crypto.createHash('sha256').update(rawPayload).digest('hex').toUpperCase();
    const signatureHash = `ESIGN-SHA256-${hashHex.substring(0, 16)}-${hashHex.substring(16, 32)}`;

    const [row] = await db.insert(contractSignatures).values({
      projectId: project.id,
      contractVersion: '1.0',
      signerName,
      signerEmail,
      signerRole,
      signerIp,
      signerUserAgent,
      signatureHash,
      signedAt: now,
      legalConsentText: 'Affirmative Electronic Assent pursuant to US E-SIGN Act (15 U.S.C. § 7001), UETA & EU eIDAS.',
      metadata: {
        projectName: project.name,
        signerName,
        nonRefundableDeposit: true,
        deemedAcceptance10Days: true,
        retentionOfTitle: true,
        vatExemptionArt7ter: true
      }
    }).returning();

    // Audit log
    await audit(db, req, {
      action: 'project.contract_signed' as any,
      entity: 'contract_signature',
      entityId: row!.id,
      projectId: project.id,
      meta: { signerName, signerEmail, signatureHash, signerIp }
    });

    // Invia email transazionale a cliente e studio via Resend
    if (ctx.mailer) {
      const isUsProject = /us|usa|america|miami|new york|california|las vegas|vegas|los angeles|austin|dollar|\$/i.test(
        (project.description || '') + ' ' + (project.name || '')
      );
      const portalUrl = appUrl(ctx.env, `portale/progetti/${project.id}`);
      const mailMsg = renderContractExecutedMail({
        projectName: project.name,
        signerName,
        signerEmail,
        signedAtIso: now.toISOString(),
        ipAddress: signerIp,
        userAgent: signerUserAgent,
        signatureHash,
        portalUrl,
        isEn: isUsProject
      });

      // Spedisci a entrambi: cliente e studio
      void ctx.mailer.send({
        to: [signerEmail, 'childhood.friendship.official@gmail.com'],
        ...mailMsg
      }).catch((err) => console.error('[mail] Errore invio contratto firmato:', err));
    }

    res.status(201).json(serialize({ signed: true, signature: row }));
  });

  return router;
}
