/**
 * Catalogo di dominio senza dipendenze runtime.
 * Importabile sia dall'API sia dal frontend Angular (nessun peso extra nel bundle).
 */

export const ROLES = ['admin', 'staff', 'client'] as const;
export type Role = (typeof ROLES)[number];

export const PROJECT_STATUSES = ['in_sviluppo', 'lanciato'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  in_sviluppo: 'In sviluppo',
  lanciato: 'Lanciato'
};

export const INDEXING_STATUSES = ['non_indicizzato', 'in_indicizzazione', 'indicizzato', 'errore'] as const;
export type IndexingStatus = (typeof INDEXING_STATUSES)[number];

export const INDEXING_STATUS_LABELS: Record<IndexingStatus, string> = {
  non_indicizzato: 'Non indicizzato',
  in_indicizzazione: 'In indicizzazione',
  indicizzato: 'Indicizzato',
  errore: 'Errore'
};

export const DOCUMENT_STATUSES = ['bozza', 'in_revisione', 'approvato', 'modifiche_richieste'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  bozza: 'Bozza',
  in_revisione: 'In revisione cliente',
  approvato: 'Approvato',
  modifiche_richieste: 'Modifiche richieste'
};

export const PHASES = ['strategia', 'progettazione', 'realizzazione', 'rilascio', 'post_lancio'] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_LABELS: Record<Phase, string> = {
  strategia: 'Strategia',
  progettazione: 'Progettazione',
  realizzazione: 'Realizzazione',
  rilascio: 'Rilascio',
  post_lancio: 'Post-lancio'
};

/** Tipi di campo supportati dall'editor dinamico dei documenti. */
export type DocumentFieldKind = 'text' | 'textarea' | 'list' | 'url';

export interface DocumentFieldDef {
  readonly key: string;
  readonly label: string;
  readonly kind: DocumentFieldKind;
  readonly required?: boolean;
  readonly placeholder?: string;
}

export interface DocumentTypeDef {
  readonly type: string;
  readonly label: string;
  readonly phase: Phase;
  /** Visibile al cliente nel portale. */
  readonly clientVisible: boolean;
  /** Richiede approvazione esplicita del cliente. */
  readonly requiresApproval: boolean;
  readonly fields: readonly DocumentFieldDef[];
}

const list = (key: string, label: string, required = false): DocumentFieldDef => ({ key, label, kind: 'list', required });
const text = (key: string, label: string, required = false): DocumentFieldDef => ({ key, label, kind: 'text', required });
const area = (key: string, label: string, required = false): DocumentFieldDef => ({ key, label, kind: 'textarea', required });
const url = (key: string, label: string): DocumentFieldDef => ({ key, label, kind: 'url' });

export const DOCUMENT_TYPES = [
  { type: 'definizioneObiettivi', label: 'Definizione obiettivi', phase: 'strategia', clientVisible: true, requiresApproval: true,
    fields: [list('obiettiviPrincipali', 'Obiettivi principali', true), list('obiettiviSecondari', 'Obiettivi secondari'), text('tempiPrevisti', 'Tempi previsti'), text('budget', 'Budget')] },
  { type: 'analisiTarget', label: 'Analisi target', phase: 'strategia', clientVisible: true, requiresApproval: true,
    fields: [text('targetPrimario', 'Target primario', true), list('caratteristicheDemografiche', 'Caratteristiche demografiche'), list('comportamentiOnline', 'Comportamenti online'), list('bisogniChiave', 'Bisogni chiave', true)] },
  { type: 'analisiConcorrenza', label: 'Analisi della concorrenza', phase: 'strategia', clientVisible: true, requiresApproval: false,
    fields: [list('concorrentiPrincipali', 'Concorrenti principali'), list('puntiDiForza', 'Punti di forza'), list('puntiDeboli', 'Punti deboli'), list('opportunita', 'Opportunità')] },
  { type: 'definizioneUSP', label: 'Definizione USP', phase: 'strategia', clientVisible: true, requiresApproval: true,
    fields: [area('propostaDiValore', 'Proposta di valore', true), list('vantaggiCompetitivi', 'Vantaggi competitivi'), text('targetSpecifico', 'Target specifico')] },
  { type: 'documentoFRD', label: 'Documento FRD', phase: 'progettazione', clientVisible: true, requiresApproval: true,
    fields: [list('requisitiTecnici', 'Requisiti tecnici', true), list('funzionalitaChiave', 'Funzionalità chiave', true), list('integrazioniRichieste', 'Integrazioni richieste')] },
  { type: 'sceltaCMS', label: 'Scelta del CMS / stack', phase: 'progettazione', clientVisible: true, requiresApproval: false,
    fields: [text('piattaformaScelta', 'Piattaforma scelta', true), area('motivazione', 'Motivazione'), text('costi', 'Costi')] },
  { type: 'dominio', label: 'Dominio', phase: 'progettazione', clientVisible: true, requiresApproval: false,
    fields: [text('nomeDominio', 'Nome dominio', true), text('registrar', 'Registrar'), text('costoAnnuale', 'Costo annuale')] },
  { type: 'hosting', label: 'Hosting', phase: 'progettazione', clientVisible: true, requiresApproval: false,
    fields: [text('provider', 'Provider', true), text('pianoHosting', 'Piano'), text('costoMensile', 'Costo mensile')] },
  { type: 'strutturaSito', label: 'Struttura del sito', phase: 'progettazione', clientVisible: true, requiresApproval: true,
    fields: [area('mappaDelSito', 'Mappa del sito', true), list('sezioniPrincipali', 'Sezioni principali'), list('funzionalitaSpeciali', 'Funzionalità speciali')] },
  { type: 'brandIdentity', label: 'Brand identity', phase: 'progettazione', clientVisible: true, requiresApproval: true,
    fields: [list('coloriPrincipali', 'Colori principali', true), list('font', 'Font'), text('toneOfVoice', 'Tone of voice'), area('lineeGuida', 'Linee guida')] },
  { type: 'designUxUi', label: 'Design UX/UI', phase: 'progettazione', clientVisible: true, requiresApproval: true, fields: [url('linkDesign', 'Link al design')] },
  { type: 'prototipo', label: 'Prototipo', phase: 'progettazione', clientVisible: true, requiresApproval: true, fields: [url('linkPrototipo', 'Link al prototipo')] },
  { type: 'creazioneContenuti', label: 'Creazione dei contenuti', phase: 'realizzazione', clientVisible: true, requiresApproval: true, fields: [] },
  { type: 'sviluppo', label: 'Sviluppo', phase: 'realizzazione', clientVisible: false, requiresApproval: false, fields: [url('repository', 'Repository'), url('ambienteStaging', 'Ambiente di staging')] },
  { type: 'test', label: 'Test', phase: 'realizzazione', clientVisible: false, requiresApproval: false, fields: [] },
  { type: 'seoBase', label: 'SEO base', phase: 'realizzazione', clientVisible: true, requiresApproval: false, fields: [list('keywordTarget', 'Keyword target')] },
  { type: 'revisione', label: 'Revisione', phase: 'rilascio', clientVisible: true, requiresApproval: true, fields: [] },
  { type: 'deploy', label: 'Deploy', phase: 'rilascio', clientVisible: false, requiresApproval: false, fields: [url('urlProduzione', 'URL di produzione')] },
  { type: 'pagamento', label: 'Pagamento', phase: 'rilascio', clientVisible: true, requiresApproval: false, fields: [] },
  { type: 'lancio', label: 'Lancio', phase: 'rilascio', clientVisible: true, requiresApproval: false, fields: [] },
  { type: 'monitoraggioPerformance', label: 'Monitoraggio performance', phase: 'post_lancio', clientVisible: true, requiresApproval: false, fields: [] },
  { type: 'conclusione', label: 'Conclusione', phase: 'post_lancio', clientVisible: true, requiresApproval: true, fields: [] },
  { type: 'generico', label: 'Documento libero', phase: 'realizzazione', clientVisible: true, requiresApproval: false, fields: [] }
] as const satisfies readonly DocumentTypeDef[];

export type DocumentType = (typeof DOCUMENT_TYPES)[number]['type'];
export const DOCUMENT_TYPE_KEYS = DOCUMENT_TYPES.map((d) => d.type) as [DocumentType, ...DocumentType[]];

/** Documenti creati automaticamente con ogni nuovo progetto (tutti tranne il libero). */
export const DEFAULT_PROJECT_DOCUMENTS: readonly DocumentTypeDef[] = DOCUMENT_TYPES.filter((d) => d.type !== 'generico');

export function getDocumentTypeDef(type: string): DocumentTypeDef | undefined {
  return DOCUMENT_TYPES.find((d) => d.type === type);
}

export const MARKETING_CONTENT_TYPES = ['post', 'story', 'reel', 'video', 'articolo', 'newsletter', 'altro'] as const;
export type MarketingContentType = (typeof MARKETING_CONTENT_TYPES)[number];

export const MARKETING_CONTENT_STATUSES = ['idea', 'pianificato', 'pubblicato'] as const;
export type MarketingContentStatus = (typeof MARKETING_CONTENT_STATUSES)[number];

export const CAMPAIGN_STATUSES = ['pianificata', 'attiva', 'in_pausa', 'completata', 'annullata'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const PLATFORM_KINDS = ['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'google_ads', 'meta_ads', 'newsletter', 'blog', 'altro'] as const;
export type PlatformKind = (typeof PLATFORM_KINDS)[number];

export const ANALYSIS_KINDS = ['swot', 'pestel', 'suggerimenti'] as const;
export type AnalysisKind = (typeof ANALYSIS_KINDS)[number];

export const LEAD_STATUSES = ['nuovo', 'contattato', 'qualificato', 'convertito', 'perso'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SERVICES = ['landing', 'webapp', 'mobile', 'manutenzione', 'altro'] as const;
export type LeadService = (typeof LEAD_SERVICES)[number];

/** Tipo di progetto: stesso elenco dei servizi richiesti dai lead. */
export const PROJECT_TYPES = LEAD_SERVICES;
export type ProjectType = LeadService;
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  landing: 'Sito web / landing page', webapp: 'Web app', mobile: 'App mobile', manutenzione: 'Manutenzione', altro: 'Altro'
};
/** Prezzi di partenza del listino (centesimi). La manutenzione è mensile. */
export const PROJECT_TYPE_BASE_PRICE_CENTS: Record<ProjectType, number> = {
  landing: 40_000, webapp: 80_000, mobile: 120_000, manutenzione: 2_000, altro: 0
};
/** Voci suggerite per tipo, da aggiungere con un clic al preventivo. */
export const PROJECT_TYPE_SUGGESTED_PARTS: Record<ProjectType, readonly string[]> = {
  landing: ['Design e sviluppo pagine', 'Testi e SEO di base', 'Modulo contatti', 'Dominio e hosting (anno)', 'Pagina aggiuntiva'],
  webapp: ['Analisi e progettazione', 'Area riservata e login', 'Pannello di amministrazione', 'Integrazioni e API', 'Database e backup'],
  mobile: ['Design delle schermate', 'App iOS e Android', 'Notifiche push', 'Backend e database', 'Pubblicazione sugli store'],
  manutenzione: ['Aggiornamenti e sicurezza', 'Backup', 'Piccole modifiche', 'Supporto prioritario'],
  altro: ['Consulenza', 'Formazione', 'Sviluppo su misura']
};

export const AI_FEATURES = ['document', 'suggestions', 'swot', 'pestel', 'campaign_post', 'task_due_date'] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

/** Campi del progetto che il cliente non deve ricevere dall'API. */
export const PORTAL_HIDDEN_PROJECT_FIELDS = ['stagingUrl', 'repositoryUrl', 'marketingEnabled', 'marketingBudgetCents', 'indexingStatus'] as const;
