import { and, eq } from 'drizzle-orm';
import type { Env } from '../config/env.js';
import type { Database } from '../db/client.js';
import { users } from '../db/schema.js';

export interface MailMessage { to: string[]; subject: string; text: string; html: string; }

/** Invio email: implementazione reale (Resend) in produzione, finta nei test. */
export interface Mailer { send(msg: MailMessage): Promise<boolean>; }

const esc = (s: unknown): string => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Resend via API HTTPS. null se non configurato: le email sono opzionali e mai bloccanti. */
export function createMailer(env: Env): Mailer | null {
  if (env.NODE_ENV === 'test' || !env.RESEND_API_KEY || !env.MAIL_FROM) return null;
  return {
    async send(msg) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: env.MAIL_FROM, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html }),
          signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) console.error('[mail] Resend ha risposto', res.status);
        return res.ok;
      } catch (err) {
        console.error('[mail] invio fallito', (err as Error).name);
        return false;
      }
    }
  };
}

export interface MailContent {
  subject: string;
  heading: string;
  /** Paragrafi in chiaro (verranno escapati). */
  paragraphs: string[];
  /** Citazione opzionale (messaggio, commento). */
  quote?: string | null;
  /** URL assoluto del bottone. */
  url: string;
  cta: string;
}

/** Email semplice con i colori del brand: testo escapato, nessuna risorsa esterna. */
export function renderMail(c: MailContent): Pick<MailMessage, 'subject' | 'text' | 'html'> {
  const quote = c.quote?.trim() ? c.quote.trim().slice(0, 1500) : '';
  const text = [c.heading, '', ...c.paragraphs, ...(quote ? ['', `«${quote}»`] : []), '', `${c.cta}: ${c.url}`, '', '— Childhood Friendship'].join('\n');
  const html = `<!doctype html><html lang="it"><body style="margin:0;background:#f6f1ff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1a1033">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#7c3aed;font-weight:700">Childhood Friendship</td></tr>
<tr><td style="padding-top:12px;font-size:22px;font-weight:700">${esc(c.heading)}</td></tr>
${c.paragraphs.map((p) => `<tr><td style="padding-top:12px;font-size:15px;line-height:1.55">${esc(p)}</td></tr>`).join('')}
${quote ? `<tr><td style="padding-top:16px"><div style="border-left:3px solid #7c3aed;padding:8px 14px;background:#f6f1ff;border-radius:6px;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(quote)}</div></td></tr>` : ''}
<tr><td style="padding-top:24px"><a href="${esc(c.url)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${esc(c.cta)}</a></td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#6b6480">Ricevi questa email perché hai un account nell'area clienti di Childhood Friendship.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: c.subject, text, html };
}

export function appUrl(env: Env, path: string): string {
  return new URL(path, env.APP_URL.endsWith('/') ? env.APP_URL : `${env.APP_URL}/`).toString();
}

/** Avvisa via email gli utenti attivi del cliente. Mai bloccante: errori solo loggati. */
export async function notifyClient(db: Database, mailer: Mailer | null | undefined, clientId: string, content: MailContent): Promise<void> {
  if (!mailer) return;
  const rows = await db.select({ email: users.email }).from(users)
    .where(and(eq(users.clientId, clientId), eq(users.role, 'client'), eq(users.isActive, true)));
  if (!rows.length) return;
  await mailer.send({ to: rows.map((r) => r.email), ...renderMail(content) });
}


export interface WelcomeMailOptions {
  name: string;
  email: string;
  portalUrl: string;
  serviceName?: string;
}

/** Template email di benvenuto personalizzato con design scuro/viola brand Childhood Friendship. */
export function renderWelcomeMail(opts: WelcomeMailOptions): Pick<MailMessage, 'subject' | 'text' | 'html'> {
  const firstName = opts.name.trim().split(' ')[0] || 'Cliente';
  const subject = `Benvenuto a bordo di Childhood Friendship, ${firstName}! 🚀`;
  const text = [
    `Ciao ${firstName},`,
    '',
    'Grazie per averci contattato! Lorenzo e Mirko hanno preso in carico la tua richiesta e stanno già studiando i dettagli.',
    'Presto riceverai un messaggio (o un vocale su WhatsApp!) o una mail con il tuo preventivo su misura, chiaro e senza fronzoli.',
    '',
    'Nel frattempo abbiamo configurato per te l\'accesso all\'Area Riservata:',
    `Accedi subito: ${opts.portalUrl}`,
    '',
    'Dall\'area riservata potrai seguire lo stato del progetto, visualizzare le quietanze commerciali B2B, caricare materiali e chattare direttamente con noi.',
    '',
    'A presto,',
    'Lorenzo & Mirko — Childhood Friendship',
    'Email: childhood.friendship.official@gmail.com · Padova (PD)'
  ].join('\n');

  const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0616;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f0fa;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#0b0616;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#160e29;border:1px solid #2d1d4f;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.6);">
          <!-- Top Accent Bar -->
          <tr>
            <td style="height:6px;background:linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%);"></td>
          </tr>
          <!-- Header Brand -->
          <tr>
            <td style="padding:36px 36px 20px 36px;text-align:center;">
              <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#a855f7;font-weight:700;margin-bottom:6px;">CHILDHOOD FRIENDSHIP</div>
              <div style="font-size:13px;color:#8d83a8;">Studio di Sviluppo Software, Soluzioni Digitali & 3D</div>
            </td>
          </tr>
          <!-- Hero Title -->
          <tr>
            <td style="padding:0 36px 24px 36px;text-align:center;">
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;line-height:1.25;">Benvenuto a bordo, ${esc(firstName)}! 🚀</h1>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#c2b9d6;">
                Abbiamo ricevuto la tua idea e siamo già con le mani sul codice. Presto ti invieremo un preventivo su misura e senza fronzoli.
              </p>
            </td>
          </tr>
          <!-- Highlight Box -->
          <tr>
            <td style="padding:0 36px 28px 36px;">
              <div style="background-color:#20143a;border:1px solid #3b2569;border-radius:16px;padding:22px 24px;">
                <div style="font-size:14px;font-weight:700;color:#a855f7;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">🔐 La tua Area Riservata Dedicata</div>
                <div style="font-size:14px;line-height:1.55;color:#d8d0ea;margin-bottom:18px;">
                  Nel tuo portale potrai consultare i dettagli del preventivo, lo scontrino commerciale B2B, caricare file e loghi, e chattare direttamente con il team.
                </div>
                <div style="text-align:center;">
                  <a href="${esc(opts.portalUrl)}" style="display:inline-block;background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;box-shadow:0 8px 24px rgba(124,58,237,0.35);">
                    Accedi all'Area Riservata ↗
                  </a>
                </div>
              </div>
            </td>
          </tr>
          <!-- Account Summary -->
          <tr>
            <td style="padding:0 36px 28px 36px;">
              <div style="font-size:13px;color:#8d83a8;line-height:1.5;background:#130b24;padding:12px 18px;border-radius:10px;border-left:3px solid #7c3aed;">
                Email account associata: <strong style="color:#ffffff;">${esc(opts.email)}</strong>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px 36px 36px;border-top:1px solid #23163d;text-align:center;font-size:12px;line-height:1.6;color:#6b5f85;">
              <strong style="color:#8d83a8;">Childhood Friendship</strong> · P.IVA IT04982710284 · Padova (PD)<br>
              Email ufficiale: <a href="mailto:childhood.friendship.official@gmail.com" style="color:#a855f7;text-decoration:none;">childhood.friendship.official@gmail.com</a><br>
              Ricevi questa email perché hai inviato una richiesta di preventivo su <a href="https://childhood-friendship-website-pi.vercel.app" style="color:#a855f7;text-decoration:none;">childhoodfriendship.it</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export interface PasswordResetMailOptions {
  name: string;
  resetUrl: string;
}

/** Template email di reset password coerente con il brand Childhood Friendship. */
export function renderPasswordResetMail(opts: PasswordResetMailOptions): Pick<MailMessage, 'subject' | 'text' | 'html'> {
  const firstName = opts.name.trim().split(' ')[0] || 'Utente';
  const subject = 'Reimposta la password del tuo account — Childhood Friendship';
  const text = [
    `Ciao ${firstName},`,
    '',
    'Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account su Childhood Friendship.',
    'Clicca sul seguente link per impostare una nuova password (il link è valido per 1 ora):',
    opts.resetUrl,
    '',
    'Se non hai richiesto tu il ripristino della password, ignora questa email: la tua password attuale rimarrà invariata e al sicuro.',
    '',
    'Childhood Friendship Team',
    'childhood.friendship.official@gmail.com'
  ].join('\n');

  const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0616;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f0fa;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#0b0616;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:540px;background-color:#160e29;border:1px solid #2d1d4f;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.6);">
          <tr>
            <td style="height:6px;background:linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%);"></td>
          </tr>
          <tr>
            <td style="padding:36px 36px 20px 36px;text-align:center;">
              <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#a855f7;font-weight:700;margin-bottom:6px;">CHILDHOOD FRIENDSHIP</div>
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">Reimposta la tua password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 28px 36px;text-align:center;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#c2b9d6;">
                Ciao <strong style="color:#ffffff;">${esc(firstName)}</strong>, abbiamo ricevuto la richiesta di ripristino per accedere alla tua area riservata.
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.5;color:#8d83a8;">
                Clicca sul pulsante qui sotto per inserire la tua nuova password. Il link è strettamente personale e scade tra <strong>1 ora</strong>.
              </p>
              <div>
                <a href="${esc(opts.resetUrl)}" style="display:inline-block;background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;box-shadow:0 8px 24px rgba(124,58,237,0.35);">
                  Reimposta la Password ↗
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px 28px 36px;">
              <div style="background-color:#130b24;border:1px solid #23163d;border-radius:12px;padding:14px 18px;font-size:12px;line-height:1.5;color:#786c91;">
                🛡️ Se non hai richiesto tu il ripristino, puoi tranquillamente ignorare questo messaggio. Il tuo account e la password attuale sono al sicuro.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px 32px 36px;border-top:1px solid #23163d;text-align:center;font-size:12px;color:#6b5f85;">
              Childhood Friendship · <a href="mailto:childhood.friendship.official@gmail.com" style="color:#a855f7;text-decoration:none;">childhood.friendship.official@gmail.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
