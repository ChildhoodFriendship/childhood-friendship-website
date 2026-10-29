import { Router } from 'express';
import crypto from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { documentLanguage, type Currency } from '@cf/shared/billing';
import { COMPANY } from '@cf/shared/company';
import { buildContract, contractPlainText, CONTRACT_VERSION } from '@cf/shared/contract';
import { contractSignSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { clients, contractSignatures } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { conflict, forbidden } from '../../lib/http-error.js';
import { appUrl, renderContractExecutedMail } from '../../lib/mailer.js';
import { notifyTeam } from '../../lib/notify.js';
import { serialize } from '../../lib/serialize.js';
import { parse } from '../../lib/validate.js';
import { assertWritable, currentProject, type ProjectRow } from '../projects/access.js';

/** Colonne restituite: il testo firmato resta nel database ed è inviato via email, non serve al portale. */
const signatureColumns = {
  id: contractSignatures.id, contractVersion: contractSignatures.contractVersion, signerName: contractSignatures.signerName,
  signerEmail: contractSignatures.signerEmail, signerIp: contractSignatures.signerIp, signerUserAgent: contractSignatures.signerUserAgent,
  signatureHash: contractSignatures.signatureHash, signedAt: contractSignatures.signedAt
};

const currencyOf = (p: ProjectRow): Currency => (p.currency === 'USD' ? 'USD' : 'EUR');

export function contractRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;
  const company = () => ctx.company ?? COMPANY;

  async function clientName(project: ProjectRow): Promise<string> {
    const [c] = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, project.clientId));
    return c?.name ?? 'Committente';
  }

  /** Testo canonico del contratto per il progetto: identico a quello mostrato nel portale. */
  async function contractFor(project: ProjectRow) {
    const currency = currencyOf(project);
    const doc = buildContract({
      lang: documentLanguage(currency), projectName: project.name, clientName: await clientName(project),
      currency, items: project.quoteItems, company: company()
    });
    return { doc, text: contractPlainText(doc) };
  }

  /** Ultima firma per la versione corrente del contratto. */
  router.get('/', async (_req, res) => {
    const project = currentProject(res);
    const [sig] = await db.select(signatureColumns).from(contractSignatures)
      .where(and(eq(contractSignatures.projectId, project.id), eq(contractSignatures.contractVersion, CONTRACT_VERSION)))
      .orderBy(desc(contractSignatures.signedAt)).limit(1);
    res.json(serialize({ signed: !!sig, version: CONTRACT_VERSION, signature: sig ?? null }));
  });

  /**
   * Firma elettronica semplice (art. 20 CAD, art. 25 eIDAS; E-SIGN Act per i clienti USA): solo il cliente del progetto.
   * Il server ricostruisce il testo dal preventivo salvato e ne salva testo e impronta SHA-256.
   */
  router.post('/sign', async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    if (req.user?.role !== 'client') throw forbidden('Il contratto lo firma il cliente dal portale');
    const { signerName } = parse(contractSignSchema, req.body);
    if (!project.quoteItems.some((i) => i.priceCents > 0)) throw conflict('Il preventivo non è ancora pronto: non è possibile firmare');

    const [existing] = await db.select({ id: contractSignatures.id }).from(contractSignatures)
      .where(and(eq(contractSignatures.projectId, project.id), eq(contractSignatures.contractVersion, CONTRACT_VERSION))).limit(1);
    if (existing) throw conflict('Contratto già firmato');

    const { doc, text } = await contractFor(project);
    const textSha256 = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
    const signerEmail = req.user.email;
    const signerIp = req.ip ?? 'sconosciuto';
    const signerUserAgent = String(req.headers['user-agent'] ?? 'sconosciuto').slice(0, 300);
    const now = new Date();
    // Impronta della firma: testo firmato + firmatario + istante
    const signatureHash = crypto.createHash('sha256')
      .update([textSha256, project.id, signerEmail, signerName, now.toISOString()].join('|'), 'utf8').digest('hex');
    const consent = doc.lang === 'en'
      ? 'The signer read the agreement and Annex A, specifically approved the clauses listed, and signed electronically from the client portal.'
      : 'Il firmatario ha letto il contratto e l\'Allegato A, ha approvato specificamente le clausole indicate e ha firmato elettronicamente dal portale.';

    const [row] = await db.insert(contractSignatures).values({
      projectId: project.id, contractVersion: CONTRACT_VERSION, signerName, signerEmail, signerRole: 'client',
      signerIp, signerUserAgent, signatureHash, signedAt: now, legalConsentText: consent,
      metadata: { language: doc.lang, currency: currencyOf(project), textSha256, contractText: text, quoteItems: project.quoteItems }
    }).returning(signatureColumns);

    await audit(db, req, {
      action: 'project.contract_signed', entity: 'contract_signature', entityId: row!.id, projectId: project.id,
      meta: { version: CONTRACT_VERSION, textSha256 }
    });
    void notifyTeam(ctx.env, {
      title: 'Contratto firmato',
      lines: [`Progetto: ${project.name}`, `Da fare entro i termini: fattura e link di pagamento dell'acconto`],
      path: `/admin/progetti/${project.id}/preventivo`
    });

    if (ctx.mailer) {
      const mail = renderContractExecutedMail({
        projectName: project.name, signerName, signerEmail, signedAtIso: now.toISOString(), ipAddress: signerIp,
        userAgent: signerUserAgent, signatureHash, portalUrl: appUrl(ctx.env, `portale/progetti/${project.id}`), isEn: doc.lang === 'en'
      });
      const fileName = `${doc.lang === 'en' ? 'Agreement' : 'Contratto'}-${project.id.slice(0, 8).toUpperCase()}.txt`;
      const evidence = [
        text, '', '----------------------------------------',
        `${doc.lang === 'en' ? 'Signed by' : 'Firmato da'}: ${signerName} <${signerEmail}>`,
        `${doc.lang === 'en' ? 'Date (UTC)' : 'Data (UTC)'}: ${now.toISOString()}`,
        `IP: ${signerIp}`, `User agent: ${signerUserAgent}`,
        `SHA-256 ${doc.lang === 'en' ? 'of the text' : 'del testo'}: ${textSha256}`,
        `${doc.lang === 'en' ? 'Signature hash' : 'Impronta della firma'}: ${signatureHash}`
      ].join('\n');
      void ctx.mailer.send({ to: [signerEmail, company().email], ...mail, attachments: [{ filename: fileName, content: evidence }] })
        .catch((err) => console.error('[mail] contratto firmato:', err));
    }

    res.status(201).json(serialize({ signed: true, version: CONTRACT_VERSION, signature: row }));
  });

  return router;
}
