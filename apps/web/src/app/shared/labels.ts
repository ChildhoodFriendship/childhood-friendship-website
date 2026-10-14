import {
  CAMPAIGN_STATUSES, DOCUMENT_STATUS_LABELS, INDEXING_STATUS_LABELS, LEAD_STATUSES, PHASE_LABELS, PROJECT_STATUS_LABELS,
  type CampaignStatus, type DocumentStatus, type IndexingStatus, type LeadStatus, type Phase, type ProjectStatus, type Role
} from '@cf/shared/catalog';

export type BadgeTone = 'violet' | 'green' | 'amber' | 'red' | 'blue' | 'neutral';

export const projectStatus = (s: ProjectStatus) => ({ label: PROJECT_STATUS_LABELS[s], tone: ({
  pianificazione: 'blue', in_sviluppo: 'violet', in_revisione: 'amber', lanciato: 'green', in_pausa: 'neutral'
} as const)[s] as BadgeTone });

export const documentStatus = (s: DocumentStatus) => ({ label: DOCUMENT_STATUS_LABELS[s], tone: ({
  bozza: 'neutral', in_revisione: 'amber', approvato: 'green', modifiche_richieste: 'red'
} as const)[s] as BadgeTone });

export const indexingStatus = (s: IndexingStatus) => ({ label: INDEXING_STATUS_LABELS[s], tone: ({
  non_indicizzato: 'neutral', in_indicizzazione: 'amber', indicizzato: 'green', errore: 'red'
} as const)[s] as BadgeTone });

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = { nuovo: 'Nuovo', contattato: 'Contattato', qualificato: 'Qualificato', convertito: 'Convertito', perso: 'Perso' };
export const leadStatus = (s: LeadStatus) => ({ label: LEAD_STATUS_LABELS[s], tone: ({
  nuovo: 'violet', contattato: 'blue', qualificato: 'amber', convertito: 'green', perso: 'neutral'
} as const)[s] as BadgeTone });
export { LEAD_STATUSES, CAMPAIGN_STATUSES };

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = { pianificata: 'Pianificata', attiva: 'Attiva', in_pausa: 'In pausa', completata: 'Completata', annullata: 'Annullata' };
export const campaignStatus = (s: CampaignStatus) => ({ label: CAMPAIGN_STATUS_LABELS[s], tone: ({
  pianificata: 'blue', attiva: 'green', in_pausa: 'amber', completata: 'violet', annullata: 'neutral'
} as const)[s] as BadgeTone });

export const ROLE_LABELS: Record<Role, string> = { admin: 'Admin', staff: 'Staff', client: 'Cliente' };
export const phaseLabel = (p: Phase) => PHASE_LABELS[p];

export const LEAD_SERVICE_LABELS: Record<string, string> = { landing: 'Landing page', webapp: 'Web app', mobile: 'App mobile', manutenzione: 'Manutenzione', altro: 'Altro' };

export function euro(cents: number | null | undefined): string {
  // useGrouping 'always': in italiano "1.200 €" (di default le 4 cifre non vengono separate)
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }).format((cents ?? 0) / 100);
}

export function percent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
