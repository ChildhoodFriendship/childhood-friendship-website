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
