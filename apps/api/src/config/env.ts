import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL mancante'),
  APP_URL: z.url().default('http://localhost:4200'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve avere almeno 32 caratteri'),
  CREDENTIALS_KEY: z.string().refine((v) => Buffer.from(v, 'base64').length === 32, 'CREDENTIALS_KEY deve essere 32 byte in base64'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().min(1).max(60).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
  INVITE_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(72),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  AI_PROVIDER: z.enum(['gemini', 'openai-compatible']).default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gemini-2.5-flash'),
  AI_BASE_URL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_DAILY_LIMIT: z.coerce.number().int().min(0).default(50),
  // Notifiche al team su Telegram (opzionali)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  // Integrazione n8n (lead da prospezione): token condiviso, almeno 24 caratteri
  LEADS_INGEST_TOKEN: z.string().min(24).optional(),
  // Vercel Blob per i materiali dei progetti
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  // Email transazionali (Resend): mittente su dominio verificato, es. "Childhood Friendship <noreply@dominio.it>"
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configurazione non valida:\n${issues}`);
  }
  return parsed.data;
}

export function isAiConfigured(env: Env): boolean {
  return env.AI_PROVIDER === 'gemini' ? !!env.GEMINI_API_KEY : !!(env.AI_BASE_URL && env.AI_API_KEY);
}
