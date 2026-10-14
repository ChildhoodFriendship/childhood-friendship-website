import { z } from 'zod';
import {
  CAMPAIGN_STATUSES, DOCUMENT_TYPES, DOCUMENT_TYPE_KEYS, INDEXING_STATUSES, LEAD_SERVICES, LEAD_STATUSES,
  MARKETING_CONTENT_STATUSES, MARKETING_CONTENT_TYPES, PHASES, PLATFORM_KINDS, PROJECT_STATUSES, ROLES,
  type DocumentTypeDef
} from './catalog.js';

const trimmed = (max: number) => z.string().trim().max(max);
const optText = (max: number) => trimmed(max).optional().nullable();
const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime({ offset: true });
const optUrl = z.union([z.url({ protocol: /^https?$/ }).max(500), z.literal('')]).optional().nullable();
const cents = z.number().int().min(0).max(1_000_000_000);

/* ---------- Auth ---------- */

export const passwordSchema = z.string().min(10, 'Minimo 10 caratteri').max(200)
  .regex(/[a-z]/, 'Serve almeno una minuscola')
  .regex(/[A-Z]/, 'Serve almeno una maiuscola')
  .regex(/[0-9]/, 'Serve almeno un numero');

export const loginSchema = z.object({
  email: z.email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(200)
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20).max(200),
  name: trimmed(120).min(2),
  password: passwordSchema
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema
});

/* ---------- Utenti e inviti ---------- */

export const createInviteSchema = z.object({
  email: z.email().max(254).transform((v) => v.toLowerCase()),
  role: z.enum(ROLES),
  clientId: z.uuid().optional().nullable()
}).refine((v) => v.role !== 'client' || !!v.clientId, { message: 'Un utente cliente deve essere collegato a un cliente', path: ['clientId'] });

export const updateUserSchema = z.object({
  name: trimmed(120).min(2).optional(),
  role: z.enum(ROLES).optional(),
  clientId: z.uuid().nullable().optional(),
  isActive: z.boolean().optional()
});

/* ---------- Clienti ---------- */

export const contactSchema = z.object({ tipo: trimmed(40).min(1), valore: trimmed(200).min(1) });
export const socialLinksSchema = z.object({
  instagram: optUrl, facebook: optUrl, tiktok: optUrl, linkedin: optUrl, youtube: optUrl
}).partial();

export const clientInputSchema = z.object({
  name: trimmed(200).min(1, 'Ragione sociale richiesta'),
  vatNumber: optText(32),
  address: optText(300),
  openingHours: optText(300),
  contactName: optText(120),
  contactEmail: z.union([z.email().max(254), z.literal('')]).optional().nullable(),
  contactPhone: optText(40),
  contacts: z.array(contactSchema).max(20).optional(),
  socialLinks: socialLinksSchema.optional(),
  oldWebsite: optUrl,
  notes: optText(5000)
});
export const clientPatchSchema = clientInputSchema.partial();

/* ---------- Progetti ---------- */

export const projectInputSchema = z.object({
  clientId: z.uuid(),
  name: trimmed(200).min(1, 'Nome richiesto'),
  description: optText(5000),
  status: z.enum(PROJECT_STATUSES).default('pianificazione'),
  isOnline: z.boolean().default(false),
  indexingStatus: z.enum(INDEXING_STATUSES).default('non_indicizzato'),
  targetUrl: optUrl,
  stagingUrl: optUrl,
  repositoryUrl: optUrl,
  startDate: isoDate.optional().nullable(),
  deadline: isoDate.optional().nullable(),
  marketingEnabled: z.boolean().default(false),
  marketingBudgetCents: cents.optional().nullable(),
  /** Se true genera i 22 documenti e la checklist standard. */
  withTemplate: z.boolean().default(true)
});
export const projectPatchSchema = projectInputSchema.omit({ withTemplate: true }).partial();

export const projectListQuerySchema = z.object({
  q: trimmed(100).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  clientId: z.uuid().optional(),
  archived: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

/* ---------- Task / checklist ---------- */

export const taskInputSchema = z.object({
  title: trimmed(300).min(1),
  phase: z.enum(PHASES).default('realizzazione'),
  done: z.boolean().default(false),
  dueDate: isoDate.optional().nullable(),
  assigneeId: z.uuid().optional().nullable(),
  documentId: z.uuid().optional().nullable(),
  position: z.number().int().min(0).optional()
});
export const taskPatchSchema = taskInputSchema.partial();

/* ---------- Documenti ---------- */

function dataSchemaFor(def: DocumentTypeDef) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of def.fields) {
    let s: z.ZodType;
    switch (f.kind) {
      case 'list': s = z.array(trimmed(500).min(1)).max(50); break;
      case 'url': s = z.union([z.url({ protocol: /^https?$/ }).max(500), z.literal('')]); break;
      case 'textarea': s = trimmed(10_000); break;
      default: s = trimmed(500);
    }
    shape[f.key] = s.optional();
  }
  return z.object(shape).strict();
}

const DOCUMENT_DATA_SCHEMAS = new Map(DOCUMENT_TYPES.map((d) => [d.type as string, dataSchemaFor(d)]));

/** Valida il campo `data` in base al tipo del documento. */
export function documentDataSchema(type: string) {
  return DOCUMENT_DATA_SCHEMAS.get(type) ?? z.object({}).strict();
}

export const documentCreateSchema = z.object({
  type: z.enum(DOCUMENT_TYPE_KEYS).default('generico'),
  title: trimmed(200).min(1),
  content: trimmed(100_000).default(''),
  data: z.record(z.string(), z.unknown()).default({}),
  clientVisible: z.boolean().optional()
});

export const documentPatchSchema = z.object({
  title: trimmed(200).min(1).optional(),
  content: trimmed(100_000).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  clientVisible: z.boolean().optional(),
  /** Versione su cui si basa la modifica: protegge da sovrascritture concorrenti. */
  baseVersion: z.number().int().min(1)
});

export const documentReviewSchema = z.object({
  decision: z.enum(['approve', 'request_changes']),
  comment: optText(2000)
});

/* ---------- Messaggi ---------- */

export const messageInputSchema = z.object({ body: trimmed(4000).min(1, 'Messaggio vuoto') });
export const messageListQuerySchema = z.object({
  before: isoDateTime.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

/* ---------- Credenziali (cifrate a riposo) ---------- */

export const credentialInputSchema = z.object({
  service: trimmed(120).min(1),
  url: optUrl,
  username: optText(200),
  secret: z.string().max(2000).optional().nullable(),
  notes: optText(2000)
});
export const credentialPatchSchema = credentialInputSchema.partial();

/* ---------- Appuntamenti ---------- */


/* ---------- Marketing ---------- */

const targetSchema = z.object({
  age: optText(40),
  sex: z.enum(['maschio', 'femmina', 'tutti']).optional().nullable(),
  audience: optText(500)
}).partial();

export const platformInputSchema = z.object({
  kind: z.enum(PLATFORM_KINDS),
  name: trimmed(80).min(1),
  profileUrl: optUrl,
  enabled: z.boolean().default(true),
  frequency: z.object({ posts: z.number().int().min(0).max(100), stories: z.number().int().min(0).max(100), reels: z.number().int().min(0).max(100) }).partial().optional()
});
export const platformPatchSchema = platformInputSchema.partial();

export const contentInputSchema = z.object({
  platformId: z.uuid().optional().nullable(),
  campaignId: z.uuid().optional().nullable(),
  scheduledFor: isoDate,
  contentType: z.enum(MARKETING_CONTENT_TYPES),
  status: z.enum(MARKETING_CONTENT_STATUSES).default('pianificato'),
  title: trimmed(200).min(1),
  body: trimmed(5000).optional().nullable(),
  notes: optText(2000),
  target: targetSchema.optional(),
  aiGenerated: z.boolean().default(false)
});
export const contentPatchSchema = contentInputSchema.partial();

export const campaignInputSchema = z.object({
  platformId: z.uuid().optional().nullable(),
  name: trimmed(200).min(1),
  objective: trimmed(1000).min(1),
  status: z.enum(CAMPAIGN_STATUSES).default('pianificata'),
  budgetCents: cents.default(0),
  spentCents: cents.default(0),
  startDate: isoDate.optional().nullable(),
  endDate: isoDate.optional().nullable(),
  kpi: optText(500),
  target: targetSchema.optional(),
  metrics: z.object({ impressions: z.number().int().min(0), clicks: z.number().int().min(0), conversions: z.number().int().min(0) }).partial().optional(),
  results: optText(5000)
}).refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, { message: 'La data di fine precede l\'inizio', path: ['endDate'] });
export const campaignPatchSchema = z.object(campaignInputSchema.shape).partial();

/* ---------- Lead (form pubblico) ---------- */

export const leadPublicSchema = z.object({
  name: trimmed(120).min(2, 'Nome richiesto'),
  email: z.email('Email non valida').max(254).transform((v) => v.toLowerCase()),
  phone: optText(40),
  company: optText(200),
  service: z.enum(LEAD_SERVICES).default('altro'),
  message: trimmed(5000).min(10, 'Descrivi brevemente il progetto'),
  privacyAccepted: z.literal(true, { error: 'Devi accettare l\'informativa privacy' }),
  /** Honeypot: deve restare vuoto. */
  website: z.string().max(0).optional()
});

export const leadPatchSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: optText(5000),
  priceCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  offeredService: optText(200)
});

/** Lead dalla prospezione automatica (n8n / Google Maps). */
export const leadIngestSchema = z.object({
  placeId: trimmed(200).min(3),
  name: trimmed(200).min(1),
  category: optText(200),
  address: optText(300),
  phone: optText(40),
  website: optText(500),
  mapsUrl: optText(1000),
  score: z.number().int().min(-100).max(1000).nullable().optional(),
  signals: optText(1000),
  outreachMessage: optText(2000),
  waLink: optText(3000),
  source: trimmed(40).default('n8n')
});
export const leadIngestBatchSchema = z.object({ leads: z.array(leadIngestSchema).min(1).max(200) });
export const leadIngestStatusSchema = z.object({
  placeId: trimmed(200).min(3),
  status: z.enum(['contattato', 'qualificato', 'convertito', 'perso', 'nuovo'])
});

export const fileUploadRequestSchema = z.object({
  name: trimmed(200).min(1, 'Nome file richiesto'),
  contentType: trimmed(120).min(3),
  size: z.number().int().min(1).max(25 * 1024 * 1024, 'File troppo grande (max 25 MB)')
});
export const fileRegisterSchema = z.object({
  pathname: trimmed(400).min(5),
  name: trimmed(200).min(1)
});

export const leadListQuerySchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  source: trimmed(40).optional(),
  q: trimmed(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

/* ---------- AI ---------- */

export const aiDocumentSchema = z.object({ action: z.enum(['generate', 'enhance']), instructions: optText(2000) });

/* ---------- Audit ---------- */

export const auditListQuerySchema = z.object({
  entity: trimmed(40).optional(),
  entityId: z.uuid().optional(),
  actorId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateInviteInput = z.input<typeof createInviteSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ClientInput = z.input<typeof clientInputSchema>;
export type ProjectInput = z.input<typeof projectInputSchema>;
export type ProjectPatch = z.input<typeof projectPatchSchema>;
export type TaskInput = z.input<typeof taskInputSchema>;
export type TaskPatch = z.input<typeof taskPatchSchema>;
export type DocumentCreateInput = z.input<typeof documentCreateSchema>;
export type DocumentPatch = z.input<typeof documentPatchSchema>;
export type DocumentReviewInput = z.input<typeof documentReviewSchema>;
export type CredentialInput = z.input<typeof credentialInputSchema>;
export type PlatformInput = z.input<typeof platformInputSchema>;
export type ContentInput = z.input<typeof contentInputSchema>;
export type CampaignInput = z.input<typeof campaignInputSchema>;
export type LeadPublicInput = z.input<typeof leadPublicSchema>;
export type LeadPatch = z.input<typeof leadPatchSchema>;
export type AiDocumentInput = z.input<typeof aiDocumentSchema>;
