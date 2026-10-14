import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { notifyTeam } from '../src/lib/notify.js';

const base = {
  DATABASE_URL: 'pglite:memory',
  JWT_SECRET: 'x'.repeat(40),
  CREDENTIALS_KEY: Buffer.alloc(32, 1).toString('base64'),
  APP_URL: 'https://cf.example.it'
};

afterEach(() => { vi.unstubAllGlobals(); });

describe('notifiche Telegram al team', () => {
  it('nessun invio in test o senza configurazione', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await notifyTeam(loadEnv({ ...base, NODE_ENV: 'test', TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '1' }), { title: 'x' });
    await notifyTeam(loadEnv({ ...base, NODE_ENV: 'production' }), { title: 'x' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('invia testo escapato con bottone verso la piattaforma', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const env = loadEnv({ ...base, NODE_ENV: 'production', TELEGRAM_BOT_TOKEN: 'TOK', TELEGRAM_CHAT_ID: '42' });
    await notifyTeam(env, { title: 'Messaggio da <Mario>', lines: ['📁 Sito & app'], path: '/admin/lead' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe('https://api.telegram.org/botTOK/sendMessage');
    const body = JSON.parse(init.body) as { chat_id: string; text: string; reply_markup: { inline_keyboard: { url: string }[][] } };
    expect(body.chat_id).toBe('42');
    expect(body.text).toContain('&lt;Mario&gt;');
    expect(body.text).toContain('Sito &amp; app');
    expect(body.reply_markup.inline_keyboard[0]![0]!.url).toBe('https://cf.example.it/admin/lead');
  });

  it('un errore di rete non blocca la richiesta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const env = loadEnv({ ...base, NODE_ENV: 'production', TELEGRAM_BOT_TOKEN: 'TOK', TELEGRAM_CHAT_ID: '42' });
    await expect(notifyTeam(env, { title: 'x' })).resolves.toBeUndefined();
  });
});
