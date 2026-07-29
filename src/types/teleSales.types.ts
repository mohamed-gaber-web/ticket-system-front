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

export type LeadStatus =
  | 'New Lead'
  | 'No Answer'
  | 'Not Available'
  | 'Call Back Later'
  | 'Interested'
  | 'Not Interested'
  | 'Wrong Number'
  | 'Invalid Lead'
  | 'Follow-up'
  | 'Meeting Scheduled'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export type LeadPriority = 'High' | 'Medium' | 'Low';

export type LeadSource =
  | 'LinkedIn'
  | 'Website'
  | 'Referral'
  | 'Cold Call'
  | 'Exhibition'
  | 'Partner'
  | 'Other';

// ── Spec enums (tele-sales lead field specification) ──────────────────────────

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
export type IndustrySector = (typeof INDUSTRY_SECTORS)[number];

// Field 5: Governorate — 27 Egyptian governorates, normalised English.
export const GOVERNORATES = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Qalyubia',
  'Port Said',
  'Suez',
  'Dakahlia',
  'Sharqia',
  'Gharbia',
  'Monufia',
  'Beheira',
  'Kafr El Sheikh',
  'Damietta',
  'Ismailia',
  'Fayoum',
  'Beni Suef',
  'Minya',
  'Asyut',
  'Sohag',
  'Qena',
  'Luxor',
  'Aswan',
  'Red Sea',
  'New Valley',
  'Matrouh',
  'North Sinai',
  'South Sinai',
] as const;
export type Governorate = (typeof GOVERNORATES)[number];

// Field 8: Phone_Primary — E.164 Egypt format (matches the backend validator).
export const PHONE_E164_EG_REGEX = /^\+20[\s-]?\d(?:[\s-]?\d){6,10}$/;

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
  companySize?: string;
  // ── Spec fields ─────────────────────────────────────────────────────────────
  entityType?: EntityType;
  businessClassification?: string;
  industrySector?: IndustrySector;
  country?: string;
  governorate?: Governorate;
  cityArea?: string;
  fullAddress?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  phoneOther?: string;
  website?: string;
  dataSource?: string;
  // ────────────────────────────────────────────────────────────────────────────
  leadSource?: LeadSource;
  assignedTo?: TeleSalesAgent | null;
  priority: LeadPriority;
  potentialValue?: number;
  status: LeadStatus;
  lastCallDate?: string;
  nextFollowUpDate?: string;
  callAttempts: number;
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
  companySize?: string;
  // ── Spec fields ─────────────────────────────────────────────────────────────
  entityType?: EntityType;
  businessClassification?: string;
  industrySector?: IndustrySector;
  country?: string;
  governorate?: Governorate;
  cityArea?: string;
  fullAddress?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  phoneOther?: string;
  website?: string;
  dataSource?: string;
  // ────────────────────────────────────────────────────────────────────────────
  leadSource?: LeadSource;
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
  entityType?: EntityType;
  industrySector?: IndustrySector;
  governorate?: Governorate;
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

// ── Import ────────────────────────────────────────────────────────────────────

/** A single parsed row ready to be imported. Mirrors the importable Lead fields. */
export interface ImportLeadRow {
  companyName?: string;
  contactPersonName: string;
  email?: string;
  jobTitle?: string;
  industry?: string;
  companySize?: string;
  department?: string;
  // ── Spec fields ─────────────────────────────────────────────────────────────
  entityType?: string;
  businessClassification?: string;
  industrySector?: string;
  country?: string;
  governorate?: string;
  cityArea?: string;
  fullAddress?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  phoneOther?: string;
  website?: string;
  dataSource?: string;
  // ────────────────────────────────────────────────────────────────────────────
  leadSource?: LeadSource;
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
