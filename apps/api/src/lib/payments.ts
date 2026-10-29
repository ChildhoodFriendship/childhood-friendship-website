import { createHmac } from 'node:crypto';
import type { Env } from '../config/env.js';
import { safeEqual } from './crypto.js';

export interface CheckoutInput {
  amountCents: number;
  currency: 'EUR' | 'USD';
  description: string;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
  /** Riferimenti interni (progetto, tranche): tornano nel webhook. */
  metadata: Record<string, string>;
}

export interface CheckoutSession { id: string; url: string }

/** Evento del provider già verificato. */
export interface PaymentEvent {
  type: 'checkout.completed' | 'checkout.expired' | 'ignored';
  sessionId: string | null;
  paymentIntentId: string | null;
  amountCents: number | null;
  currency: string | null;
  metadata: Record<string, string>;
}

/** Gateway di pagamento: implementazione reale su Stripe, finta nei test. */
export interface PaymentGateway {
  readonly name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  /** Verifica la firma e interpreta l'evento; lancia se la firma non è valida. */
  parseWebhook(rawBody: Buffer, signatureHeader: string | undefined): PaymentEvent;
}

const TOLERANCE_SEC = 300;

/** Verifica dell'header Stripe-Signature (t=...,v1=...) con HMAC-SHA256 sul payload grezzo. */
export function verifyStripeSignature(rawBody: Buffer, header: string | undefined, secret: string, nowSec = Math.floor(Date.now() / 1000)): void {
  if (!header) throw new Error('Firma mancante');
  const parts = header.split(',').map((p) => p.split('=') as [string, string]);
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length) throw new Error('Firma non valida');
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > TOLERANCE_SEC) throw new Error('Firma scaduta');
  const expected = createHmac('sha256', secret).update(`${t}.`).update(rawBody).digest('hex');
  if (!sigs.some((s) => safeEqual(s, expected))) throw new Error('Firma non valida');
}

export function createStripeGateway(env: Env): PaymentGateway | null {
  const key = env.STRIPE_SECRET_KEY;
  const whSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whSecret) return null;

  return {
    name: 'stripe',
    async createCheckout(input) {
      const form = new URLSearchParams();
      form.set('mode', 'payment');
      form.set('success_url', input.successUrl);
      form.set('cancel_url', input.cancelUrl);
      form.set('line_items[0][quantity]', '1');
      form.set('line_items[0][price_data][currency]', input.currency.toLowerCase());
      form.set('line_items[0][price_data][unit_amount]', String(input.amountCents));
      form.set('line_items[0][price_data][product_data][name]', input.description.slice(0, 250));
      form.set('expires_at', String(Math.floor(Date.now() / 1000) + 60 * 60 * 24));
      if (input.customerEmail) form.set('customer_email', input.customerEmail);
      for (const [k, v] of Object.entries(input.metadata)) {
        form.set(`metadata[${k}]`, v);
        form.set(`payment_intent_data[metadata][${k}]`, v);
      }
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `${input.metadata['projectId']}-${input.metadata['tranche']}-${input.amountCents}-${Math.floor(Date.now() / 60000)}` },
        body: form,
        signal: AbortSignal.timeout(15_000)
      });
      const body = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
      if (!res.ok || !body.id || !body.url) throw new Error(body.error?.message ?? `Stripe HTTP ${res.status}`);
      return { id: body.id, url: body.url };
    },
    parseWebhook(rawBody, signatureHeader) {
      verifyStripeSignature(rawBody, signatureHeader, whSecret);
      const event = JSON.parse(rawBody.toString('utf8')) as {
        type?: string;
        data?: { object?: { id?: string; payment_intent?: string | null; amount_total?: number | null; currency?: string | null; payment_status?: string; metadata?: Record<string, string> } };
      };
      const o = event.data?.object ?? {};
      const base = {
        sessionId: o.id ?? null, paymentIntentId: o.payment_intent ?? null, amountCents: o.amount_total ?? null,
        currency: o.currency ? o.currency.toUpperCase() : null, metadata: o.metadata ?? {}
      };
      if ((event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') && o.payment_status === 'paid') {
        return { type: 'checkout.completed', ...base };
      }
      if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
        return { type: 'checkout.expired', ...base };
      }
      return { type: 'ignored', ...base };
    }
  };
}
