/** DTO restituiti dall'API (solo tipi: nessun costo nel bundle). */
import type {
  AnalysisKind, CampaignStatus, DocumentStatus, DocumentType, IndexingStatus, LeadService, LeadStatus,
  MarketingContentStatus, MarketingContentType, Phase, PlatformKind, ProjectStatus, ProjectType, Role
} from './catalog.js';

export type { Role } from './catalog.js';

export interface Paginated<T> { items: T[]; total: number; page: number; pageSize: number; }
export interface ApiErrorBody { error: { code: string; message: string; details?: unknown } }

export interface SessionUser {
  id: string; email: string; name: string; role: Role; clientId: string | null;
}

export interface UserDto extends SessionUser { isActive: boolean; lastLoginAt: string | null; createdAt: string; }
export interface InviteDto { id: string; email: string; role: Role; clientId: string | null; expiresAt: string; acceptedAt: string | null; createdAt: string; }
export interface InviteCreatedDto extends InviteDto {
  /** Link da inviare: mostrato una sola volta. */
  acceptUrl: string;
  /** true se il link è già stato inviato via email all'invitato. */
  emailSent: boolean;
}

export interface ClientDto {
  id: string; name: string; vatNumber: string | null; address: string | null; openingHours: string | null;
  contactName: string | null; contactEmail: string | null; contactPhone: string | null;
  contacts: { tipo: string; valore: string }[]; socialLinks: Record<string, string | null | undefined>;
  oldWebsite: string | null; notes: string | null; createdAt: string; updatedAt: string; projectCount?: number;
}

export interface ProjectDto {
  id: string; clientId: string; clientName?: string; name: string; description: string | null;
  status: ProjectStatus; type: ProjectType; isOnline: boolean; indexingStatus: IndexingStatus;
  /** Preventivo interno: voci e prezzi (non visibili al cliente). */
  quoteItems: QuoteItem[];
  paidAmountCents?: number | null;
  paymentDeadline?: string | null;
  targetUrl: string | null; stagingUrl: string | null; repositoryUrl: string | null;
  startDate: string | null; deadline: string | null;
  marketingEnabled: boolean; marketingBudgetCents: number | null;
  archivedAt: string | null; createdAt: string; updatedAt: string;
  progress?: { tasksDone: number; tasksTotal: number; documentsApproved: number; documentsTotal: number };
}

/** Vista del progetto per il cliente: senza campi interni (repo, staging, budget, indicizzazione). */
export type PortalProjectDto = Omit<ProjectDto, 'stagingUrl' | 'repositoryUrl' | 'marketingEnabled' | 'marketingBudgetCents' | 'indexingStatus'>;

export interface QuoteItem { id: string; name: string; priceCents: number; monthly: boolean; }

export interface TaskDto {
  id: string; projectId: string; title: string; phase: Phase; done: boolean; dueDate: string | null;
  assigneeId: string | null; documentId: string | null; position: number; completedAt: string | null;
}

export interface DocumentSummaryDto {
  id: string; projectId: string; type: DocumentType; title: string; status: DocumentStatus;
  clientVisible: boolean; version: number; updatedAt: string;
}
export interface DocumentDto extends DocumentSummaryDto {
  content: string; data: Record<string, unknown>; reviewComment: string | null; reviewedAt: string | null; updatedByName: string | null;
}
export interface DocumentVersionDto { version: number; title: string; createdAt: string; createdByName: string | null; }

export interface MessageDto { id: string; projectId: string; authorId: string; authorName: string; authorRole: Role; body: string; createdAt: string; }

export interface CredentialDto { id: string; service: string; url: string | null; username: string | null; hasSecret: boolean; notes: string | null; updatedAt: string; }

/** Il cliente non vede gli assegnatari dei task. */
export type PortalTaskDto = Omit<TaskDto, 'assigneeId'>;

export interface TargetDto { age?: string | null; sex?: 'maschio' | 'femmina' | 'tutti' | null; audience?: string | null; }
export interface PlatformDto { id: string; projectId: string; kind: PlatformKind; name: string; profileUrl: string | null; enabled: boolean; frequency: { posts?: number; stories?: number; reels?: number }; }
export interface ContentDto {
  id: string; projectId: string; platformId: string | null; campaignId: string | null; scheduledFor: string;
  contentType: MarketingContentType; status: MarketingContentStatus; title: string; body: string | null;
  notes: string | null; target: TargetDto; aiGenerated: boolean;
}
export interface CampaignDto {
  id: string; projectId: string; platformId: string | null; name: string; objective: string; status: CampaignStatus;
  budgetCents: number; spentCents: number; startDate: string | null; endDate: string | null; kpi: string | null;
  target: TargetDto; metrics: { impressions?: number; clicks?: number; conversions?: number }; results: string | null;
}
export interface AnalysisDto { id: string; projectId: string; kind: AnalysisKind; data: Record<string, string[]>; createdAt: string; }

export interface LeadDto {
  id: string; name: string; email: string | null; phone: string | null; company: string | null; service: LeadService;
  message: string | null; status: LeadStatus; notes: string | null; source: string; clientId: string | null; createdAt: string;
  placeId: string | null; score: number | null; category: string | null; address: string | null; website: string | null;
  mapsUrl: string | null; outreachMessage: string | null; waLink: string | null;
  priceCents: number | null; offeredService: string | null; contactedAt: string | null; closedAt: string | null;
  /** Consenso dal form del sito: versione dell'informativa e data. */
  privacyVersion: string | null; privacyAcceptedAt: string | null;
}

export interface ProjectFileDto {
  id: string; projectId: string; name: string; contentType: string; sizeBytes: number; url: string;
  uploadedById: string | null; uploadedByName: string | null; uploadedByRole: Role | null; createdAt: string;
}

export interface AuditDto {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole?: Role | null;
  action: string;
  entity: string;
  entityId: string | null;
  ipHash?: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardDto {
  projectsByStatus: Record<ProjectStatus, number>;
  upcomingDeadlines: { projectId: string; projectName: string; deadline: string }[];
  overdueTasks: { taskId: string; projectId: string; projectName: string; title: string; dueDate: string }[];
  documentsInReview: { documentId: string; projectId: string; projectName: string; title: string; status: DocumentStatus }[];
  newLeads: number;
  /** Lead per stato (tutte le fonti). */
  leadsByStatus: Record<LeadStatus, number>;
  /** Lead arrivati per settimana (lunedì ISO), ultime 12 settimane, divisi per fonte. */
  leadsWeekly: { week: string; sito: number; prospezione: number }[];
  /** Valore dei lead chiusi per mese (YYYY-MM), ultimi 6 mesi. */
  revenueMonthly: { month: string; cents: number; deals: number }[];
  /** Valore stimato dei lead aperti con prezzo indicato. */
  pipelineValueCents: number;
  /** Task completati per settimana, ultime 8 settimane. */
  tasksWeekly: { week: string; completed: number }[];
}

export interface AiUsageDto { usedToday: number; dailyLimit: number; enabled: boolean; }
export interface AiTextResult { text: string; }

export interface AccessProbeDto {
  service: string;
  url: string;
  online: boolean;
  status: number | null;
  latencyMs: number | null;
  error: string | null;
}

export interface ProjectHealthCheckDto {
  targetUrl: string | null;
  stagingUrl: string | null;
  siteOnline: boolean;
  siteStatus: number | null;
  siteLatencyMs: number | null;
  siteError: string | null;
  stagingOnline: boolean;
  stagingStatus: number | null;
  stagingLatencyMs: number | null;
  dbConnected: boolean;
  dbLatencyMs: number;
  checkedAt: string;
  accessProbes?: AccessProbeDto[];
}
