/** DTO restituiti dall'API (solo tipi: nessun costo nel bundle). */
import type {
  AnalysisKind, CampaignStatus, DocumentStatus, DocumentType, IndexingStatus, LeadService, LeadStatus,
  MarketingContentStatus, MarketingContentType, Phase, PlatformKind, ProjectStatus, Role
} from './catalog.js';

export interface Paginated<T> { items: T[]; total: number; page: number; pageSize: number; }
export interface ApiErrorBody { error: { code: string; message: string; details?: unknown } }

export interface SessionUser {
  id: string; email: string; name: string; role: Role; clientId: string | null;
}

export interface UserDto extends SessionUser { isActive: boolean; lastLoginAt: string | null; createdAt: string; }
export interface InviteDto { id: string; email: string; role: Role; clientId: string | null; expiresAt: string; acceptedAt: string | null; createdAt: string; }
export interface InviteCreatedDto extends InviteDto { /** Link da inviare: mostrato una sola volta. */ acceptUrl: string; }

export interface ClientDto {
  id: string; name: string; vatNumber: string | null; address: string | null; openingHours: string | null;
  contactName: string | null; contactEmail: string | null; contactPhone: string | null;
  contacts: { tipo: string; valore: string }[]; socialLinks: Record<string, string | null | undefined>;
  oldWebsite: string | null; notes: string | null; createdAt: string; updatedAt: string; projectCount?: number;
}

export interface ProjectDto {
  id: string; clientId: string; clientName?: string; name: string; description: string | null;
  status: ProjectStatus; isOnline: boolean; indexingStatus: IndexingStatus;
  targetUrl: string | null; stagingUrl: string | null; repositoryUrl: string | null;
  startDate: string | null; deadline: string | null;
  marketingEnabled: boolean; marketingBudgetCents: number | null;
  archivedAt: string | null; createdAt: string; updatedAt: string;
  progress?: { tasksDone: number; tasksTotal: number; documentsApproved: number; documentsTotal: number };
}

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

export interface AppointmentDto { id: string; projectId: string; title: string; startsAt: string; kind: string | null; notes: string | null; }

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
  id: string; name: string; email: string; phone: string | null; company: string | null; service: LeadService;
  message: string; status: LeadStatus; notes: string | null; source: string; clientId: string | null; createdAt: string;
}

export interface AuditDto { id: string; actorId: string | null; actorName: string | null; action: string; entity: string; entityId: string | null; meta: Record<string, unknown>; createdAt: string; }

export interface DashboardDto {
  projectsByStatus: Record<ProjectStatus, number>;
  upcomingDeadlines: { projectId: string; projectName: string; deadline: string }[];
  overdueTasks: { taskId: string; projectId: string; projectName: string; title: string; dueDate: string }[];
  documentsInReview: { documentId: string; projectId: string; projectName: string; title: string; status: DocumentStatus }[];
  newLeads: number;
  upcomingAppointments: { id: string; projectId: string; projectName: string; title: string; startsAt: string }[];
  recentActivity: AuditDto[];
}

export interface AiUsageDto { usedToday: number; dailyLimit: number; enabled: boolean; }
export interface AiTextResult { text: string; }

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
}
