import type { Env } from '../config/env.js';

const esc = (s: unknown): string => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface TeamNotice {
  /** Riga di titolo, già senza HTML (verrà escapata). */
  title: string;
  /** Righe di dettaglio in chiaro (verranno escapate). */
  lines?: (string | null | undefined)[];
  /** Percorso dell'app (es. /admin/lead) per il bottone "Apri". */
  path?: string;
  buttonLabel?: string;
}

/**
 * Notifica il team sul bot Telegram (elitespaceweb).
 * Minimizzazione dei dati: solo titoli e riferimenti, mai il contenuto di messaggi, commenti o contatti
 * (quelli restano nella piattaforma). Mai bloccante per l'utente: timeout breve, errori solo loggati. No-op in test o senza configurazione.
 */
export async function notifyTeam(env: Env, notice: TeamNotice): Promise<void> {
  if (env.NODE_ENV === 'test' || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const parts = [`<b>${esc(notice.title)}</b>`];
  for (const l of notice.lines ?? []) if (l) parts.push(esc(l));
  const body: Record<string, unknown> = {
    chat_id: env.TELEGRAM_CHAT_ID,
    text: parts.join('\n'),
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  // Telegram accetta solo URL pubblici https nei bottoni
  if (notice.path && env.APP_URL.startsWith('https://')) {
    const url = new URL(notice.path, env.APP_URL).toString();
    body['reply_markup'] = { inline_keyboard: [[{ text: notice.buttonLabel ?? 'Apri nella piattaforma', url }]] };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3500)
    });
    if (!res.ok) console.error('[notify] Telegram ha risposto', res.status);
  } catch (err) {
    console.error('[notify] invio fallito', (err as Error).name);
  }
}
