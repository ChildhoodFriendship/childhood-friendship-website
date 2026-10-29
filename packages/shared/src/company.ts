/**
 * Profilo aziendale: UNICA fonte dei dati identificativi di Childhood Friendship
 * (informativa privacy, e in seguito contratto, email e documenti di pagamento).
 *
 * Regola: nessun dato fiscale inventato. Finché un campo è `null` le interfacce mostrano
 * "in fase di attribuzione". Il giorno dell'apertura della partita IVA si compilano
 * `vatNumber`, `taxCode`, `registeredOffice` (ed eventualmente `pec`) e basta.
 */
export interface CompanyProfile {
  brand: string;
  /** Titolare della ditta individuale (persona fisica). */
  owner: string;
  legalForm: 'ditta individuale';
  /** Partita IVA (11 cifre, senza prefisso IT). */
  vatNumber: string | null;
  /** Codice fiscale del titolare. */
  taxCode: string | null;
  /** Sede legale completa (via, CAP, comune, provincia). */
  registeredOffice: string | null;
  city: string;
  email: string;
  pec: string | null;
  /** Regime fiscale previsto. */
  taxRegime: 'forfettario';
  /** Collaboratori che operano per conto del titolare (autorizzati al trattamento, art. 29 GDPR). */
  collaborators: readonly string[];
}

export const COMPANY: CompanyProfile = {
  brand: 'Childhood Friendship',
  owner: 'Lorenzo Garoffolo',
  legalForm: 'ditta individuale',
  vatNumber: null,
  taxCode: null,
  registeredOffice: null,
  city: 'Padova (PD)',
  email: 'lorenzo@cfofficial.it',
  pec: null,
  taxRegime: 'forfettario',
  collaborators: ['Mirko']
};

export const VAT_PENDING_LABEL = 'P.IVA in fase di attribuzione';

/** "P.IVA 01234567890" oppure l'etichetta di attesa: mai un numero inventato. */
export function vatLabel(c: CompanyProfile = COMPANY): string {
  return c.vatNumber ? `P.IVA ${c.vatNumber}` : VAT_PENDING_LABEL;
}

/** Profilo fiscale completo: solo allora si possono attivare pagamenti e fatturazione. */
export function isFiscallyActive(c: CompanyProfile = COMPANY): boolean {
  return Boolean(c.vatNumber && /^\d{11}$/.test(c.vatNumber) && c.taxCode && c.registeredOffice);
}
