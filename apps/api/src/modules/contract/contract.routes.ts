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

      // Certificati ed allegati legali
      const auditCertificateContent = [
        '================================================================================',
        'E-SIGN AUDIT & EXECUTION CERTIFICATE',
        'Statutory Authority: 15 U.S.C. § 7001 (US E-SIGN Act), UETA & EU eIDAS',
        '================================================================================',
        `PROJECT ID:        ${project.id}`,
        `PROJECT NAME:      ${project.name}`,
        `SIGNER NAME:       ${signerName}`,
        `SIGNER EMAIL:      ${signerEmail}`,
        `SIGNER ROLE:       ${signerRole}`,
        `EXECUTION TIME:    ${now.toISOString()} (UTC)`,
        `REMOTE IP ADDRESS: ${signerIp}`,
        `USER AGENT:        ${signerUserAgent}`,
        `SIGNATURE HASH:    ${signatureHash}`,
        '',
        'SPECIAL COMMERCIAL TERMS AFFIRMATIVELY ACCEPTED:',
        '- Section 2: 50% Non-Refundable Kickoff Deposit',
        '- Section 3: Conditioned IP Assignment & Retention of Title (Art. 1523 c.c. / UCC)',
        '- Section 4: 10-Day Deemed Acceptance (Silenzio-Assenso)',
        '- Section 5: 30-Day Post-Launch Technical Warranty',
        '- Section 8: Chargeback Waiver & Dispute Venue (Court of Padua, Italy)',
        '- Section 9: IRS Form W-8BEN-E Article 7 Treaty Exemption (0% Withholding)',
        '',
        'LEGAL ATTESTATION:',
        'The signer affirmatively attested electronic signature intent and agreed to conduct',
        'business transactions electronically pursuant to 15 U.S.C. § 7001 et seq.',
        '================================================================================',
        'Childhood Friendship Studio · P.IVA IT04982710284 · Padua, Italy'
      ].join('\n');

      const w8benExemptionContent = [
        '================================================================================',
        'UNITED STATES INTERNAL REVENUE SERVICE (IRS) FORM W-8BEN-E',
        'CERTIFICATE OF FOREIGN STATUS OF BENEFICIAL OWNER',
        'United States - Italy Income Tax Convention (Article 7 - Business Profits)',
        '================================================================================',
        'BENEFICIAL OWNER:   Childhood Friendship (Independent Software Studio)',
        'COUNTRY OF ORIGIN:  Italy (European Union)',
        'VAT ID / TIN:       IT04982710284',
        'HEADQUARTERS:       Via Roma 99, 35122 Padova (PD), Italy',
        'CHAPTER 3 STATUS:   Active NFFE / Foreign Service Provider',
        'CHAPTER 4 (FATCA):  Active NFFE (Section 1472)',
        'US PE STATUS:       ZERO Permanent Establishment in the United States',
        'TREATY CLAIM:       Article 7 (Business Profits)',
        'US WITHHOLDING:     0% (Zero Percent Rate of Backup Withholding)',
        `PROJECT SCOPE:      ${project.name} (Ref: ${project.id.slice(0, 8)})`,
        '',
        'Under penalties of perjury, the provider certifies that it is an Italian resident',
        'legal enterprise entitled to treaty benefits, and services are performed cross-border',
        'ex Art. 7-ter of Italian Presidential Decree 633/1972.',
        '================================================================================'
      ].join('\n');

      // Spedisci a entrambi: cliente e studio con allegati legali
      void ctx.mailer.send({
        to: [signerEmail, 'childhood.friendship.official@gmail.com'],
        ...mailMsg,
        attachments: [
          {
            filename: `E-SIGN-Certificate-${project.id.slice(0, 8).toUpperCase()}.txt`,
            content: auditCertificateContent
          },
          {
            filename: `IRS-Form-W-8BEN-E-Exemption-${project.id.slice(0, 8).toUpperCase()}.txt`,
            content: w8benExemptionContent
          }
        ]
      }).catch((err) => console.error('[mail] Errore invio contratto firmato:', err));
    }

    res.status(201).json(serialize({ signed: true, signature: row }));
  });

  return router;
}
