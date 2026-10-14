import { relations, sql } from 'drizzle-orm';
import {
  boolean, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid
} from 'drizzle-orm/pg-core';
import {
  ANALYSIS_KINDS, CAMPAIGN_STATUSES, DOCUMENT_STATUSES, INDEXING_STATUSES, LEAD_SERVICES, LEAD_STATUSES,
  MARKETING_CONTENT_STATUSES, MARKETING_CONTENT_TYPES, PHASES, PLATFORM_KINDS, PROJECT_STATUSES, ROLES
} from '@cf/shared/catalog';

export const roleEnum = pgEnum('role', ROLES);
export const projectStatusEnum = pgEnum('project_status', PROJECT_STATUSES);
export const indexingStatusEnum = pgEnum('indexing_status', INDEXING_STATUSES);
export const documentStatusEnum = pgEnum('document_status', DOCUMENT_STATUSES);
export const phaseEnum = pgEnum('phase', PHASES);
export const platformKindEnum = pgEnum('platform_kind', PLATFORM_KINDS);
export const contentTypeEnum = pgEnum('content_type', MARKETING_CONTENT_TYPES);
export const contentStatusEnum = pgEnum('content_status', MARKETING_CONTENT_STATUSES);
export const campaignStatusEnum = pgEnum('campaign_status', CAMPAIGN_STATUSES);
export const analysisKindEnum = pgEnum('analysis_kind', ANALYSIS_KINDS);
export const leadStatusEnum = pgEnum('lead_status', LEAD_STATUSES);
export const leadServiceEnum = pgEnum('lead_service', LEAD_SERVICES);

const id = () => uuid().primaryKey().defaultRandom();
const createdAt = () => timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow();
const updatedAt = () => timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow().$onUpdate(() => new Date());
const ts = () => timestamp({ withTimezone: true, mode: 'date' });

export type Target = { age?: string | null; sex?: 'maschio' | 'femmina' | 'tutti' | null; audience?: string | null };

/* ---------- Clienti e utenti ---------- */

export const clients = pgTable('clients', {
  id: id(),
  name: text().notNull(),
  vatNumber: text(),
  address: text(),
  openingHours: text(),
  contactName: text(),
  contactEmail: text(),
  contactPhone: text(),
  contacts: jsonb().$type<{ tipo: string; valore: string }[]>().notNull().default([]),
  socialLinks: jsonb().$type<Record<string, string | null | undefined>>().notNull().default({}),
  oldWebsite: text(),
  notes: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [index('clients_name_idx').on(t.name)]);

export const users = pgTable('users', {
  id: id(),
  email: text().notNull(),
  name: text().notNull(),
  passwordHash: text().notNull(),
  role: roleEnum().notNull().default('client'),
  clientId: uuid().references(() => clients.id, { onDelete: 'set null' }),
  isActive: boolean().notNull().default(true),
  failedLogins: integer().notNull().default(0),
  lockedUntil: ts(),
  lastLoginAt: ts(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [uniqueIndex('users_email_uq').on(sql`lower(${t.email})`)]);

/** Refresh token opachi: salviamo solo l'hash, rotazione a ogni refresh. */
export const sessions = pgTable('sessions', {
  id: id(),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text().notNull(),
  expiresAt: ts().notNull(),
  revokedAt: ts(),
  replacedById: uuid(),
  userAgent: text(),
  createdAt: createdAt()
}, (t) => [uniqueIndex('sessions_token_uq').on(t.tokenHash), index('sessions_user_idx').on(t.userId)]);

export const invites = pgTable('invites', {
  id: id(),
  email: text().notNull(),
  role: roleEnum().notNull(),
  clientId: uuid().references(() => clients.id, { onDelete: 'cascade' }),
  tokenHash: text().notNull(),
  expiresAt: ts().notNull(),
  acceptedAt: ts(),
  revokedAt: ts(),
  createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt()
}, (t) => [uniqueIndex('invites_token_uq').on(t.tokenHash)]);

/* ---------- Progetti ---------- */

export const projects = pgTable('projects', {
  id: id(),
  clientId: uuid().notNull().references(() => clients.id, { onDelete: 'restrict' }),
  name: text().notNull(),
  description: text(),
  status: projectStatusEnum().notNull().default('pianificazione'),
  type: leadServiceEnum().notNull().default('altro'),
  /** Preventivo interno: [{ id, name, priceCents, monthly }] */
  quoteItems: jsonb().$type<{ id: string; name: string; priceCents: number; monthly: boolean }[]>().notNull().default([]),
  isOnline: boolean().notNull().default(false),
  indexingStatus: indexingStatusEnum().notNull().default('non_indicizzato'),
  targetUrl: text(),
  stagingUrl: text(),
  repositoryUrl: text(),
  startDate: date({ mode: 'string' }),
  deadline: date({ mode: 'string' }),
  marketingEnabled: boolean().notNull().default(false),
  marketingBudgetCents: integer(),
  archivedAt: ts(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [index('projects_client_idx').on(t.clientId), index('projects_status_idx').on(t.status)]);

export const tasks = pgTable('tasks', {
  id: id(),
  projectId: uuid().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  phase: phaseEnum().notNull().default('realizzazione'),
  done: boolean().notNull().default(false),
  dueDate: date({ mode: 'string' }),
  assigneeId: uuid().references(() => users.id, { onDelete: 'set null' }),
  documentId: uuid().references(() => documents.id, { onDelete: 'set null' }),
  position: integer().notNull().default(0),
  completedAt: ts(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [index('tasks_project_idx').on(t.projectId, t.position)]);

export const documents = pgTable('documents', {
  id: id(),
  projectId: uuid().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  type: text().notNull(),
  title: text().notNull(),
  content: text().notNull().default(''),
  data: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  status: documentStatusEnum().notNull().default('bozza'),
  clientVisible: boolean().notNull().default(true),
  version: integer().notNull().default(1),
  reviewComment: text(),
  reviewedAt: ts(),
  reviewedById: uuid().references(() => users.id, { onDelete: 'set null' }),
  updatedById: uuid().references(() => users.id, { onDelete: 'set null' }),
  position: integer().notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [index('documents_project_idx').on(t.projectId, t.position)]);

export const documentVersions = pgTable('document_versions', {
  id: id(),
  documentId: uuid().notNull().references(() => documents.id, { onDelete: 'cascade' }),
  version: integer().notNull(),
  title: text().notNull(),
  content: text().notNull(),
  data: jsonb().$type<Record<string, unknown>>().notNull(),
  createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt()
}, (t) => [uniqueIndex('document_versions_uq').on(t.documentId, t.version)]);

export const messages = pgTable('messages', {
  id: id(),
  projectId: uuid().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  authorId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: text().notNull(),
  createdAt: createdAt()
}, (t) => [index('messages_project_idx').on(t.projectId, t.createdAt)]);

export const credentials = pgTable('credentials', {
  id: id(),
  projectId: uuid().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  service: text().notNull(),
  url: text(),
  username: text(),
  /** AES-256-GCM: iv.tag.ciphertext (base64url). Mai in chiaro. */
  secretEnc: text(),
  notes: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [index('credentials_project_idx').on(t.projectId)]);

/* ---------- Marketing ---------- */

export const marketingPlatforms = pgTable('marketing_platforms', {
  id: id(),
  projectId: uuid().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  kind: platformKindEnum().notNull(),
  name: text().notNull(),
  profileUrl: text(),
  enabled: boolean().notNull().default(true),
  frequency: jsonb().$type<{ posts?: number; stories?: number; reels?: number }>().notNull().default({}),
  createdAt: createdAt()
}, (t) => [index('mkt_platforms_project_idx').on(t.projectId)]);

export const marketingCampaigns = pgTable('marketing_campaigns', {
  id: id(),
  projectId: uuid().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  platformId: uuid().references(() => marketingPlatforms.id, { onDelete: 'set null' }),
  name: text().notNull(),
  objective: text().notNull(),
  status: campaignStatusEnum().notNull().default('pianificata'),
  budgetCents: integer().notNull().default(0),
  spentCents: integer().notNull().default(0),
  startDate: date({ mode: 'string' }),
  endDate: date({ mode: 'string' }),
  kpi: text(),
  target: jsonb().$type<Target>().notNull().default({}),
  metrics: jsonb().$type<{ impressions?: number; clicks?: number; conversions?: number }>().notNull().default({}),
  results: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [index('mkt_campaigns_project_idx').on(t.projectId)]);

export const marketingContents = pgTable('marketing_contents', {
  id: id(),
  projectId: uuid().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  platformId: uuid().references(() => marketingPlatforms.id, { onDelete: 'set null' }),
  campaignId: uuid().references(() => marketingCampaigns.id, { onDelete: 'set null' }),
  scheduledFor: date({ mode: 'string' }).notNull(),
  contentType: contentTypeEnum().notNull(),
  status: contentStatusEnum().notNull().default('pianificato'),
  title: text().notNull(),
  body: text(),
  notes: text(),
  target: jsonb().$type<Target>().notNull().default({}),
  aiGenerated: boolean().notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [index('mkt_contents_project_idx').on(t.projectId, t.scheduledFor)]);

export const marketingAnalyses = pgTable('marketing_analyses', {
  id: id(),
  projectId: uuid().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  kind: analysisKindEnum().notNull(),
  data: jsonb().$type<Record<string, string[]>>().notNull(),
  createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt()
}, (t) => [index('mkt_analyses_project_idx').on(t.projectId, t.createdAt)]);

/* ---------- Lead, audit, AI ---------- */

export const leads = pgTable('leads', {
  id: id(),
  name: text().notNull(),
  /** Facoltativa: i lead trovati da n8n (Google Maps) di solito hanno solo il telefono. */
  email: text(),
  phone: text(),
  company: text(),
  service: leadServiceEnum().notNull().default('altro'),
  message: text(),
  status: leadStatusEnum().notNull().default('nuovo'),
  notes: text(),
  source: text().notNull().default('sito'),
  clientId: uuid().references(() => clients.id, { onDelete: 'set null' }),
  /** Versione dell'informativa accettata dal form del sito e momento dell'accettazione (accountability GDPR). */
  privacyVersion: text(),
  privacyAcceptedAt: ts(),
  /* Prospezione automatica (n8n) */
  placeId: text(),
  score: integer(),
  category: text(),
  address: text(),
  website: text(),
  mapsUrl: text(),
  outreachMessage: text(),
  waLink: text(),
  /* Esito commerciale */
  priceCents: integer(),
  offeredService: text(),
  contactedAt: ts(),
  closedAt: ts(),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (t) => [index('leads_status_idx').on(t.status, t.createdAt), uniqueIndex('leads_place_id_uq').on(t.placeId)]);

/** Materiali caricati su un progetto (logo, foto, testi): file su Vercel Blob, metadati qui. */
export const projectFiles = pgTable('project_files', {
  id: id(),
  projectId: uuid().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  uploadedById: uuid().references(() => users.id, { onDelete: 'set null' }),
  name: text().notNull(),
  contentType: text().notNull(),
  sizeBytes: integer().notNull(),
  url: text().notNull(),
  pathname: text().notNull(),
  createdAt: createdAt()
}, (t) => [index('project_files_project_idx').on(t.projectId, t.createdAt), uniqueIndex('project_files_pathname_uq').on(t.pathname)]);

export const auditLog = pgTable('audit_log', {
  id: id(),
  actorId: uuid().references(() => users.id, { onDelete: 'set null' }),
  action: text().notNull(),
  entity: text().notNull(),
  entityId: uuid(),
  projectId: uuid(),
  meta: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  ipHash: text(),
  createdAt: createdAt()
}, (t) => [index('audit_entity_idx').on(t.entity, t.entityId), index('audit_created_idx').on(t.createdAt)]);

/** Contatori del rate limit condivisi tra istanze (vedi lib/rate-limit.ts). */
export const rateLimits = pgTable('rate_limits', {
  key: text().primaryKey(),
  hits: integer().notNull().default(0),
  resetAt: timestamp({ withTimezone: true, mode: 'date' }).notNull()
});

export const aiUsage = pgTable('ai_usage', {
  id: id(),
  userId: uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  feature: text().notNull(),
  projectId: uuid(),
  inputChars: integer().notNull().default(0),
  outputChars: integer().notNull().default(0),
  createdAt: createdAt()
}, (t) => [index('ai_usage_user_idx').on(t.userId, t.createdAt)]);

/* ---------- Relazioni ---------- */

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  tasks: many(tasks),
  documents: many(documents)
}));
export const tasksRelations = relations(tasks, ({ one }) => ({ project: one(projects, { fields: [tasks.projectId], references: [projects.id] }) }));
export const documentsRelations = relations(documents, ({ one }) => ({ project: one(projects, { fields: [documents.projectId], references: [projects.id] }) }));
