import type { Env } from '../../config/env.js';
import { isAiConfigured } from '../../config/env.js';
import { HttpError } from '../../lib/http-error.js';

export interface AiRequest {
  system: string;
  prompt: string;
  json?: boolean;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface AiProvider {
  readonly name: string;
  generate(req: AiRequest): Promise<string>;
}

const TIMEOUT_MS = 45_000;

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new HttpError(502, 'ai_unreachable', `Servizio AI non raggiungibile: ${(err as Error).message}`);
  }
  if (res.status === 429) throw new HttpError(429, 'ai_rate_limited', 'Il provider AI ha limitato le richieste. Riprova tra poco.');
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[ai] errore provider', res.status, text.slice(0, 500));
    throw new HttpError(502, 'ai_error', `Il provider AI ha risposto con errore ${res.status}`);
  }
  return res.json();
}

class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  constructor(private readonly apiKey: string, private readonly model: string) {}
  async generate(req: AiRequest): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const data = await postJson(url, { 'x-goog-api-key': this.apiKey }, {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
      generationConfig: {
        temperature: req.temperature ?? 0.6,
        maxOutputTokens: req.maxOutputTokens ?? 2048,
        ...(req.json && { responseMimeType: 'application/json' })
      }
    }) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text.trim()) throw new HttpError(502, 'ai_empty', 'Il provider AI non ha restituito contenuto');
    return text;
  }
}

/** Groq, OpenRouter e qualsiasi API compatibile OpenAI. */
class OpenAiCompatibleProvider implements AiProvider {
  readonly name = 'openai-compatible';
  constructor(private readonly baseUrl: string, private readonly apiKey: string, private readonly model: string) {}
  async generate(req: AiRequest): Promise<string> {
    const data = await postJson(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, { authorization: `Bearer ${this.apiKey}` }, {
      model: this.model,
      temperature: req.temperature ?? 0.6,
      max_tokens: req.maxOutputTokens ?? 2048,
      messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.prompt }],
      ...(req.json && { response_format: { type: 'json_object' } })
    }) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) throw new HttpError(502, 'ai_empty', 'Il provider AI non ha restituito contenuto');
    return text;
  }
}

export function createAiProvider(env: Env): AiProvider | null {
  if (!isAiConfigured(env)) return null;
  if (env.AI_PROVIDER === 'gemini') return new GeminiProvider(env.GEMINI_API_KEY!, env.AI_MODEL);
  return new OpenAiCompatibleProvider(env.AI_BASE_URL!, env.AI_API_KEY!, env.AI_MODEL);
}

/** Estrae e valida JSON anche se il modello lo avvolge in ```json ... ``` */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.search(/[[{]/);
  try {
    return JSON.parse(start > 0 ? raw.slice(start) : raw);
  } catch {
    throw new HttpError(502, 'ai_bad_json', 'Risposta AI non interpretabile, riprova');
  }
}
