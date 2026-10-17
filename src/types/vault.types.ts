// Credentials Vault — shapes of the /api/vault endpoints. Mirrors the API
// contract field for field. Passwords never appear in these types except in the
// write payload and the reveal response.

export type VaultLookupType =
  | 'category'
  | 'environment'
  | 'accessLevel'
  | 'mfaMethod'
  | 'sensitivity'
  | 'sendPurpose';

export type VaultOwnerType = 'client' | 'company';

export interface VaultLookup {
  _id: string;
  type: VaultLookupType;
  name: string;
  requiresApproval: boolean;
  isNone: boolean;
  sortOrder: number;
  isActive: boolean;
  usageCount: number;
}

export type VaultLookupsByType = Record<VaultLookupType, VaultLookup[]>;

export interface VaultLookupInput {
  type: VaultLookupType;
  name: string;
  requiresApproval?: boolean;
  isNone?: boolean;
}

export interface VaultLookupPatch {
  name?: string;
  requiresApproval?: boolean;
  isNone?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface VaultClient {
  _id: string;
  name: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  usageCount: number;
}

export interface VaultClientInput {
  name: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface VaultUser {
  _id: string;
  name: string;
  email: string;
  jobTitle?: string;
}

export interface VaultRef {
  _id: string;
  name: string;
}

/** GET /vault/departments — the company's real departments (HR), sorted by name. */
export type VaultDepartment = VaultRef;

/** A file kept with an account (detail view). Stored encrypted server-side. */
export interface VaultAttachment {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: VaultRef | null;
}

/** POST /vault/attachments response — uploaded, not yet attached to an entry. */
export interface VaultUploadedFile {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export type VaultDueKind = 'validUntil' | 'renewal';

export interface VaultEntry {
  _id: string;
  ownerType: VaultOwnerType;
  client: VaultRef | null;
  project?: string;
  department: VaultRef | null;
  accountOwner: (VaultRef & { email?: string }) | null;
  platform: string;
  category: VaultRef | null;
  environment: VaultRef | null;
  url?: string;
  username: string;
  mfaMethod: (VaultRef & { isNone?: boolean }) | null;
  mfaHolder?: string;
  accessLevel: VaultRef | null;
  recoveryContact?: string;
  sensitivity: (VaultRef & { requiresApproval?: boolean }) | null;
  grantedBy?: string;
  validUntil?: string | null;
  renewalDate?: string | null;
  cost?: string;
  notes?: string;
  passwordChangedAt: string;
  createdAt: string;
  updatedAt: string;
  ownerLabel: string;
  passwordAgeDays: number;
  dueDate: string | null;
  dueKind: VaultDueKind | null;
  dueInDays: number | null;
  requiresApproval: boolean;
  sendCount: number;
  /** List view only — the detail view sends `attachments` instead. */
  attachmentCount?: number;
}

export interface VaultSendHistoryRow {
  _id: string;
  recipientName: string;
  recipientEmail: string;
  sentAt: string;
}

export interface VaultEntryDetail extends VaultEntry {
  sendHistory: VaultSendHistoryRow[];
  attachments: VaultAttachment[];
}

/**
 * Body of POST/PATCH /entries — refs as ids, dates as yyyy-mm-dd, `password`
 * only when set. On PATCH a cleared ref/date is sent as null, a cleared text as ''.
 * `attachments` is the full list to keep (the server rebuilds names/sizes and
 * deletes files dropped from it); omitted = unchanged.
 */
export type VaultEntryInput = {
  ownerType: VaultOwnerType;
  password?: string;
  attachments?: { fileId: string }[];
} &Partial<Record<Exclude<VaultFieldKey, 'password'>, string | null>>;

export type VaultFieldKey =
  | 'client'
  | 'project'
  | 'department'
  | 'accountOwner'
  | 'platform'
  | 'category'
  | 'environment'
  | 'url'
  | 'username'
  | 'password'
  | 'mfaMethod'
  | 'mfaHolder'
  | 'accessLevel'
  | 'recoveryContact'
  | 'sensitivity'
  | 'grantedBy'
  | 'validUntil'
  | 'renewalDate'
  | 'cost'
  | 'notes';

export interface VaultEntryFilters {
  q: string;
  ownerType: VaultOwnerType | '';
  client: string;
  category: string;
  environment: string;
  sensitivity: string;
  page: number;
}

export interface VaultPaged<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pages: number;
}

// ── Send ─────────────────────────────────────────────────────────────────────

export interface VaultApproval {
  confirmed: boolean;
  approverName: string;
}

export interface VaultSendInput {
  recipientName: string;
  recipientEmail: string;
  purposeId?: string;
  entryIds: string[];
  includePasswords: boolean;
  approval?: VaultApproval;
}

export interface VaultSendPreview {
  from: string;
  to: string;
  subject: string;
  body: string;
  passwordsEmail: { subject: string; body: string } | null;
  requiresApproval: boolean;
}

export interface VaultSendResult {
  logId: string;
  deliveryStatus: VaultDeliveryStatus;
}

// ── Log ──────────────────────────────────────────────────────────────────────

/** pending = recorded but never confirmed; partial = details delivered, passwords email failed. */
export type VaultDeliveryStatus = 'pending' | 'sent' | 'partial' | 'failed';

export interface VaultLogEntrySnapshot {
  entry: string;
  platform: string;
  ownerLabel: string;
  environment: string;
}

export interface VaultLog {
  _id: string;
  sentAt: string;
  sentBy: VaultRef | null;
  recipientName: string;
  recipientEmail: string;
  purpose: VaultRef | null;
  entries: VaultLogEntrySnapshot[];
  includedPasswords: boolean;
  approvalRequired: boolean;
  approverName?: string;
  subject: string;
  deliveryStatus: VaultDeliveryStatus;
  deliveryError?: string;
}

export interface VaultLogDetail extends VaultLog {
  bodyRedacted: string;
}

export interface VaultLogFilters {
  q: string;
  sentBy: string;
  from: string;
  to: string;
  page: number;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface VaultDashboard {
  kpis: {
    totalEntries: number;
    companyEntries: number;
    clientsWithEntries: number;
    sendsThisMonth: number;
    stalePasswords: number;
    dueSoon: number;
  };
  sendsPerDay: { date: string; count: number }[];
  dueList: { entryId: string; platform: string; ownerLabel: string; dueDate: string; dueInDays: number; kind: VaultDueKind }[];
  /** `purpose` is the purpose name; an object is tolerated in case the API populates it. */
  recentSends: { recipientName: string; entriesCount: number; purpose: string | VaultRef | null; sentAt: string }[];
  topShared: { entryId: string; platform: string; count: number }[];
  sendsByUser: { userId: string; name: string; count: number }[];
  entriesBySensitivity: { id: string; name: string; count: number }[];
  entriesByCategory: { id: string; name: string; count: number }[];
  stalePasswordList: { entryId: string; platform: string; ownerLabel: string; ageDays: number }[];
}
