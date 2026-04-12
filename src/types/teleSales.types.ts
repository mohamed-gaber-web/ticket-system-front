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

export interface LeadPhone {
  number: string;
  label?: string;
}

export interface Lead {
  _id: string;
  companyName: string;
  contactPersonName: string;
  phones: LeadPhone[];
  email?: string;
  jobTitle?: string;
  industry?: string;
  companySize?: string;
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
  phones: LeadPhone[];
  email?: string;
  jobTitle?: string;
  industry?: string;
  companySize?: string;
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

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface LeadStats {
  total: number;
  byStatus: { _id: LeadStatus; count: number }[];
}
