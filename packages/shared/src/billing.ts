/**
 * Calcolo del preventivo e delle tranche di pagamento, condiviso da API (che decide gli importi da incassare)
 * e web (che li mostra). Regime forfettario: nessuna IVA; marca da bollo di 2 € sulle fatture oltre 77,47 €,
 * addebitata al cliente su ogni tranche che la richiede.
 */
export const CURRENCIES = ['EUR', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const STAMP_DUTY_CENTS = 200;
export const STAMP_DUTY_THRESHOLD_CENTS = 7747;
/** Quota dell'acconto alla firma (percentuale del totale una tantum). */
export const DEPOSIT_RATE = 0.5;

export type BillingTranche = 'acconto' | 'saldo';

export interface QuoteLike { priceCents: number; monthly: boolean }

export interface TrancheCalc {
  tranche: BillingTranche;
  /** Compenso della tranche (senza bollo). */
  netCents: number;
  /** Bollo addebitato (0 se sotto soglia). */
  stampDutyCents: number;
  /** Totale da pagare = compenso + bollo. */
  totalCents: number;
  /** true se la tranche è già coperta dai pagamenti registrati. */
  paid: boolean;
}

export interface QuoteCalc {
  oneOffCents: number;
  monthlyCents: number;
  paidNetCents: number;
  remainingNetCents: number;
  fullyPaid: boolean;
  tranches: TrancheCalc[];
  /** Prossima tranche da pagare, se esiste. */
  next: TrancheCalc | null;
}

export function stampDutyFor(netCents: number): number {
  return netCents > STAMP_DUTY_THRESHOLD_CENTS ? STAMP_DUTY_CENTS : 0;
}

/** Totali e tranche (acconto 50% + saldo) a partire dalle voci e da quanto già incassato (al netto dei bolli). */
export function computeQuote(items: readonly QuoteLike[], paidNetCents: number | null | undefined): QuoteCalc {
  const oneOffCents = items.filter((i) => !i.monthly).reduce((a, i) => a + Math.max(0, Math.round(i.priceCents)), 0);
  const monthlyCents = items.filter((i) => i.monthly).reduce((a, i) => a + Math.max(0, Math.round(i.priceCents)), 0);
  const paid = Math.max(0, paidNetCents ?? 0);
  const deposit = Math.round(oneOffCents * DEPOSIT_RATE);
  const balance = oneOffCents - deposit;
  const mk = (tranche: BillingTranche, netCents: number, paidFlag: boolean): TrancheCalc => {
    const stampDutyCents = stampDutyFor(netCents);
    return { tranche, netCents, stampDutyCents, totalCents: netCents + stampDutyCents, paid: paidFlag };
  };
  const tranches = oneOffCents > 0
    ? [mk('acconto', deposit, paid >= deposit), mk('saldo', balance, paid >= oneOffCents)].filter((t) => t.netCents > 0)
    : [];
  const remainingNetCents = Math.max(0, oneOffCents - paid);
  return {
    oneOffCents,
    monthlyCents,
    paidNetCents: paid,
    remainingNetCents,
    fullyPaid: oneOffCents > 0 && remainingNetCents === 0,
    tranches,
    next: tranches.find((t) => !t.paid) ?? null
  };
}

/** Giorni entro cui, dopo la firma, il cliente riceve fattura e link di pagamento dell'acconto. */
export const INVOICE_WITHIN_DAYS = 10;

export const FLAT_RATE_NOTICE = {
  it: 'Operazione senza applicazione dell\'IVA, effettuata ai sensi dell\'art. 1, commi da 54 a 89, della Legge n. 190/2014 (regime forfettario).',
  en: 'Transaction without Italian VAT under Art. 1, paragraphs 54-89, of Italian Law no. 190/2014 (flat-rate scheme).'
} as const;

/** Importo nella valuta del progetto: mai convertito e mai legato alla lingua dell'interfaccia. */
export function formatMoney(cents: number, currency: Currency): string {
  const value = cents / 100;
  return currency === 'USD'
    ? '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

/** Lingua dei documenti del progetto (contratto, riepilogo): dollaro = cliente USA = inglese. */
export function documentLanguage(currency: Currency): 'it' | 'en' {
  return currency === 'USD' ? 'en' : 'it';
}
