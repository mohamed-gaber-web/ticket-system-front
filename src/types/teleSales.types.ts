// ── TeleSales Agent ──────────────────────────────────────────────────────────

export type TeleSalesRole = 'user' | 'admin';
export type TeleSalesStatus = 'active' | 'inactive';

export interface TeleSalesAgent {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  role: TeleSalesRole;
  status: TeleSalesStatus;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: TeleSalesRole;
}

export interface UpdateAgentData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: TeleSalesStatus;
  role?: TeleSalesRole;
}

export interface AgentsListResponse {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: TeleSalesAgent[];
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data: TeleSalesAgent;
}

export interface AgentQueryParams {
  search?: string;
  status?: TeleSalesStatus;
  role?: TeleSalesRole;
  page?: number;
  limit?: number;
}

// ── Lead ─────────────────────────────────────────────────────────────────────

// The status union + full per-status workflow (transitions, mandatory fields,
// auto tasks) lives in src/config/leadStatusWorkflow.ts — that's the single
// source of truth, re-exported here so existing `LeadStatus` imports keep working.
import type { LeadStatus } from '@/config/leadStatusWorkflow';
export type { LeadStatus };

export type LeadPriority = 'High' | 'Medium' | 'Low';

export type LeadSource =
  | 'LinkedIn'
  | 'Website'
  | 'Referral'
  | 'Cold Call'
  | 'Exhibition'
  | 'Partner'
  | 'Other';

/**
 * The one extra detail each lead source asks for. Sources missing from this map
 * ('Website', 'Other') take no detail — the field is hidden and cleared.
 * Mirrors LEAD_SOURCE_DETAILS on the backend.
 */
export const LEAD_SOURCE_DETAILS: Partial<
  Record<LeadSource, { label: string; type: 'text' | 'url'; placeholder: string }>
> = {
  Referral: { label: 'Referrer Name', type: 'text', placeholder: 'Who referred this lead' },
  LinkedIn: { label: 'LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/in/jane-doe' },
  'Cold Call': { label: 'Data Source', type: 'text', placeholder: 'Where the number came from' },
  Exhibition: { label: 'Exhibition Name', type: 'text', placeholder: 'e.g. Cairo ICT 2026' },
  Partner: { label: 'Partner Name', type: 'text', placeholder: 'Partner company or contact' },
};

// Lenient http(s) URL check — scheme optional, host needs a dot and a 2+ char TLD.
// Mirrors URL_REGEX on the backend.
export const URL_REGEX = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i;

export function isValidUrl(raw: string | null | undefined): boolean {
  return URL_REGEX.test(String(raw ?? '').trim());
}

// ── Spec enums (tele-sales lead field specification) ──────────────────────────

// Sales_Type — where the record sits in the pipeline.
export const SALES_TYPES = ['Lead', 'Opportunity'] as const;
export type SalesType = (typeof SALES_TYPES)[number];

// Field 1: Entity_Type
export const ENTITY_TYPES = ['Hotel', 'Restaurant', 'Cafe', 'Factory', 'Company'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

// Field 3: Industry_Sector — 26 normalised sectors.
export const INDUSTRY_SECTORS = [
  'Hospitality',
  'Food & Beverage',
  'Retail',
  'Wholesale & Trade',
  'Manufacturing',
  'Construction & Real Estate',
  'Healthcare & Pharmaceuticals',
  'Education',
  'Information Technology',
  'Telecommunications',
  'Financial Services',
  'Insurance',
  'Tourism & Travel',
  'Transportation',
  'Logistics & Supply Chain',
  'Agriculture',
  'Energy & Utilities',
  'Oil & Gas',
  'Media & Entertainment',
  'Automotive',
  'Textiles & Apparel',
  'Professional Services',
  'Government & Public Sector',
  'Non-Profit & NGO',
  'Chemicals',
  'Unclassified',
] as const;
// Industry_Sector is now an admin-managed lookup (see IndustrySector setup screen),
// so the stored value is any active sector name — a plain string, not a fixed union.
// INDUSTRY_SECTORS above is kept only as the default seed list / import fallback.
export type IndustrySector = string;

// Field 8: Phone_Primary — E.164 Egypt format. Kept for the bulk-import normaliser.
export const PHONE_E164_EG_REGEX = /^\+20[\s-]?\d(?:[\s-]?\d){6,10}$/;

/**
 * Validate a Phone_Primary for manual create/update. International: accepts any
 * country (KSA, Bahrain, USA, …) — an optional leading "+" then 6–15 digits with
 * spaces, hyphens, dots or parentheses as separators. Mirrors the backend.
 */
export function isValidPhone(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const str = String(raw).trim();
  if (!str) return false;
  if (!/^\+?[0-9\s().-]+$/.test(str)) return false;
  const digits = str.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15;
}

/**
 * Normalise an Egyptian phone number to compact E.164 (+20…) when possible so
 * locally-formatted input ("01001234567", "02 2735 1234") passes the
 * Phone_Primary validator. Returns the input trimmed if it can't be confidently
 * normalised (e.g. 5-digit hotlines, foreign numbers). Mirrors the backend.
 */
export function normalizeEgyptPhone(raw: string | null | undefined): string {
  if (raw == null) return '';
  const str = String(raw).trim();
  if (!str) return '';
  let digits = str.replace(/\D/g, '');
  if (!digits) return str;
  if (digits.startsWith('0020')) digits = digits.slice(4);
  else if (digits.startsWith('20') && digits.length >= 10) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  else return str;
  if (digits.length < 7 || digits.length > 11) return str;
  return `+20${digits}`;
}

/**
 * Build a `tel:` URI for click-to-call. Strips spaces/formatting, keeping digits
 * and a leading `+`, so the OS hands it to the registered dialer / linked device.
 */
export function telHref(num: string | null | undefined): string {
  if (!num) return '';
  const cleaned = String(num).trim().replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : '';
}

export interface Lead {
  _id: string;
  customerId?: string; // auto-generated reference, e.g. CUST-2026-00042 (read-only)
  companyName: string;
  contactPersonName: string;
  email?: string;
  jobTitle?: string;
  industry?: string;
  // ── Spec fields ─────────────────────────────────────────────────────────────
  salesType?: SalesType;
  entityType?: EntityType;
  businessClassification?: string;
  industrySector?: IndustrySector;
  country?: string;
  fullAddress?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  phoneOther?: string;
  website?: string;
  dataSource?: string;
  // ────────────────────────────────────────────────────────────────────────────
  leadSource?: LeadSource;
  leadSourceDetail?: string;
  assignedTo?: TeleSalesAgent | null;
  priority: LeadPriority;
  potentialValue?: number;
  status: LeadStatus;
  lastCallDate?: string;
  nextFollowUpDate?: string;
  callAttempts: number;
  meetingsCount: number;
  firstContactDeadline?: string;
  painPoints?: string;
  customerNeeds?: string;
  budget?: string;
  isDecisionMaker?: boolean;
  tags: string[];
  createdBy: TeleSalesAgent;
  callLogs?: CallLog[];
  followUps?: FollowUp[];
  attachments?: LeadAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadData {
  companyName: string;
  contactPersonName: string;
  email?: string;
  jobTitle?: string;
  industry?: string;
  // ── Spec fields ─────────────────────────────────────────────────────────────
  salesType?: SalesType;
  entityType?: EntityType;
  businessClassification?: string;
  industrySector?: IndustrySector;
  country?: string;
  fullAddress?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  phoneOther?: string;
  website?: string;
  dataSource?: string;
  // ────────────────────────────────────────────────────────────────────────────
  leadSource?: LeadSource;
  leadSourceDetail?: string;
  assignedTo?: string;
  priority?: LeadPriority;
  potentialValue?: number;
  status?: LeadStatus;
  painPoints?: string;
  customerNeeds?: string;
  budget?: string;
  isDecisionMaker?: boolean;
  tags?: string[];
}

export interface UpdateLeadData extends Partial<CreateLeadData> {}

export interface LeadQueryParams {
  search?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  assignedTo?: string;
  tags?: string;
  salesType?: SalesType;
  entityType?: EntityType;
  industrySector?: IndustrySector;
  country?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface LeadsListResponse {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  data: Lead[];
}

export interface LeadResponse {
  success: boolean;
  message: string;
  data: Lead;
}

export interface LeadStatsResponse {
  success: boolean;
  data: {
    total: number;
    byStatus: { _id: LeadStatus; count: number }[];
  };
}

// ── Status History ────────────────────────────────────────────────────────────

/** One status change, with the dynamic field values captured for that status. */
export interface LeadStatusHistoryEntry {
  _id: string;
  lead: string;
  oldStatus: LeadStatus | null;
  newStatus: LeadStatus;
  changedBy: Pick<TeleSalesAgent, '_id' | 'firstName' | 'lastName' | 'email'> | null;
  changedByUserType: 'tele_sales' | 'consultant';
  fieldValues: Record<string, any>;
  changedAt: string;
  createdAt: string;
}

export interface LeadStatusHistoryResponse {
  success: boolean;
  total: number;
  data: LeadStatusHistoryEntry[];
}

export interface ChangeLeadStatusData {
  newStatus: LeadStatus;
  values: Record<string, any>;
}

export interface ChangeLeadStatusResponse {
  success: boolean;
  message: string;
  data: {
    lead: Lead;
    historyEntry: LeadStatusHistoryEntry;
    followUp: FollowUp | null;
  };
}

export interface ChangeLeadStatusError {
  success: false;
  message: string;
  errors?: { field: string; label: string; message: string }[];
  allowed?: LeadStatus[];
}

// ── Call Log ──────────────────────────────────────────────────────────────────

export interface CallLog {
  _id: string;
  lead: string;
  calledBy: TeleSalesAgent;
  callDate: string;
  duration?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCallLogData {
  callDate?: string;
  duration?: number;
  notes?: string;
}

export interface CallLogsResponse {
  success: boolean;
  total: number;
  data: CallLog[];
}

// Recent Calls: a global, cross-lead view where `lead` is populated
export interface RecentCall extends Omit<CallLog, 'lead'> {
  lead: Pick<Lead, '_id' | 'companyName' | 'contactPersonName' | 'phonePrimary' | 'phoneSecondary' | 'status'>;
}

export interface RecentCallsResponse {
  success: boolean;
  total: number;
  data: RecentCall[];
}

// ── Follow-up ─────────────────────────────────────────────────────────────────

export type FollowUpType = 'Call' | 'WhatsApp' | 'Email' | 'Meeting';
export type FollowUpStatus = 'Pending' | 'Done';

export interface FollowUp {
  _id: string;
  lead: string | Lead;
  reminderDate: string;
  followUpType: FollowUpType;
  status: FollowUpStatus;
  notes?: string;
  createdBy: TeleSalesAgent;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFollowUpData {
  reminderDate: string;
  followUpType: FollowUpType;
  notes?: string;
  status?: FollowUpStatus;
}

export interface FollowUpsResponse {
  success: boolean;
  total: number;
  data: FollowUp[];
}

// ── Lead Attachment ───────────────────────────────────────────────────────────

export interface LeadAttachment {
  _id: string;
  lead: string;
  fileId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy: TeleSalesAgent;
  createdAt: string;
}

export interface AttachmentsResponse {
  success: boolean;
  total: number;
  data: LeadAttachment[];
}

// ── Lead Email ────────────────────────────────────────────────────────────────

/** A file already stored in GridFS, referenced by an outgoing email. */
export interface EmailAttachment {
  fileId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
}

export interface LeadEmail {
  _id: string;
  lead: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  /** Sanitised HTML exactly as it was sent. */
  body: string;
  attachments: EmailAttachment[];
  sentBy: Pick<TeleSalesAgent, '_id' | 'firstName' | 'lastName' | 'email'> | string;
  sentByType: 'TeleSalesAgent' | 'Consultant';
  sentByName?: string;
  sentByEmail?: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  messageId?: string;
  sentAt: string;
  createdAt: string;
}

export interface SendLeadEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  /** HTML body from the compose editor. Sanitised server-side. */
  message: string;
  attachments?: EmailAttachment[];
}

export interface LeadEmailsResponse {
  success: boolean;
  total: number;
  data: LeadEmail[];
}

export interface LeadEmailResponse {
  success: boolean;
  message: string;
  data: LeadEmail;
}

// ── Import ────────────────────────────────────────────────────────────────────

/** A single parsed row ready to be imported. Mirrors the importable Lead fields. */
export interface ImportLeadRow {
  companyName?: string;
  contactPersonName: string;
  email?: string;
  jobTitle?: string;
  industry?: string;
  department?: string;
  // ── Spec fields ─────────────────────────────────────────────────────────────
  salesType?: string;
  entityType?: string;
  businessClassification?: string;
  industrySector?: string;
  country?: string;
  fullAddress?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  phoneOther?: string;
  website?: string;
  dataSource?: string;
  // ────────────────────────────────────────────────────────────────────────────
  leadSource?: LeadSource;
  leadSourceDetail?: string;
  priority?: LeadPriority;
  status?: LeadStatus;
  tags?: string[];
}

export interface ImportLeadsRequest {
  leads: ImportLeadRow[];
  assignedTo?: string;
  status?: LeadStatus;
  leadSource?: LeadSource;
  skipDuplicates?: boolean;
}

export interface ImportError {
  row: number | null;
  reason: string;
  duplicate?: boolean;
}

export interface ImportLeadsResponse {
  success: boolean;
  message: string;
  inserted: number;
  skipped: number;
  duplicates: number;
  total: number;
  errors: ImportError[];
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface LeadStats {
  total: number;
  byStatus: { _id: LeadStatus; count: number }[];
}
