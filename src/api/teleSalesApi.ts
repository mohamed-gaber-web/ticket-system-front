import api from './axiosConfig';
import type {
  AgentsListResponse,
  AgentResponse,
  AgentQueryParams,
  CreateAgentData,
  UpdateAgentData,
  LeadsListResponse,
  LeadResponse,
  LeadStatsResponse,
  LeadQueryParams,
  CreateLeadData,
  UpdateLeadData,
  ImportLeadsRequest,
  ImportLeadsResponse,
  CallLogsResponse,
  RecentCallsResponse,
  CreateCallLogData,
  FollowUpsResponse,
  CreateFollowUpData,
  AttachmentsResponse,
  LeadEmailsResponse,
  LeadEmailResponse,
  SendLeadEmailData,
  ChangeLeadStatusData,
  ChangeLeadStatusResponse,
  LeadStatusHistoryResponse,
  TeamsListResponse,
  TeamResponse,
  CreateTeamData,
  UpdateTeamData,
  EmailInboxResponse,
  EmailInboxFilter,
} from '@/types/teleSales.types';

// ── Teams ─────────────────────────────────────────────────────────────────────
// Readable by everyone in the module (the UI needs team names to label records),
// but the API only ever returns the caller's own team unless they are a super
// admin. Creating and editing teams is super-admin only.

export const getTeams = (params?: { isActive?: boolean; search?: string }): Promise<TeamsListResponse> =>
  api.get('/tele-sales-teams', { params }).then((r) => r.data);

export const getTeamById = (id: string): Promise<TeamResponse> =>
  api.get(`/tele-sales-teams/${id}`).then((r) => r.data);

export const createTeam = (data: CreateTeamData): Promise<TeamResponse> =>
  api.post('/tele-sales-teams', data).then((r) => r.data);

export const updateTeam = (id: string, data: UpdateTeamData): Promise<TeamResponse> =>
  api.patch(`/tele-sales-teams/${id}`, data).then((r) => r.data);

export const deleteTeam = (id: string): Promise<{ success: boolean; message: string }> =>
  api.delete(`/tele-sales-teams/${id}`).then((r) => r.data);

export const toggleTeamStatus = (id: string): Promise<TeamResponse> =>
  api.patch(`/tele-sales-teams/${id}/toggle-status`).then((r) => r.data);

// ── Agents ────────────────────────────────────────────────────────────────────

export const getAgents = (params?: AgentQueryParams): Promise<AgentsListResponse> =>
  api.get('/tele-sales-agents', { params }).then((r) => r.data);

export const getAgentById = (id: string): Promise<AgentResponse> =>
  api.get(`/tele-sales-agents/${id}`).then((r) => r.data);

export const createAgent = (data: CreateAgentData): Promise<AgentResponse> =>
  api.post('/tele-sales-agents', data).then((r) => r.data);

export const updateAgent = (id: string, data: UpdateAgentData): Promise<AgentResponse> =>
  api.patch(`/tele-sales-agents/${id}`, data).then((r) => r.data);

export const deleteAgent = (id: string): Promise<{ success: boolean; message: string }> =>
  api.delete(`/tele-sales-agents/${id}`).then((r) => r.data);

export const toggleAgentStatus = (id: string): Promise<AgentResponse> =>
  api.patch(`/tele-sales-agents/${id}/toggle-status`).then((r) => r.data);

// ── Leads ─────────────────────────────────────────────────────────────────────

export const getLeads = (params?: LeadQueryParams): Promise<LeadsListResponse> =>
  api.get('/leads', { params }).then((r) => r.data);

export const getLeadById = (id: string): Promise<LeadResponse> =>
  api.get(`/leads/${id}`).then((r) => r.data);

export const getLeadStats = (): Promise<LeadStatsResponse> =>
  api.get('/leads/stats').then((r) => r.data);

export const createLead = (data: CreateLeadData): Promise<LeadResponse> =>
  api.post('/leads', data).then((r) => r.data);

export const updateLead = (id: string, data: UpdateLeadData): Promise<LeadResponse> =>
  api.patch(`/leads/${id}`, data).then((r) => r.data);

export const deleteLead = (id: string): Promise<{ success: boolean; message: string }> =>
  api.delete(`/leads/${id}`).then((r) => r.data);

export const importLeads = (data: ImportLeadsRequest): Promise<ImportLeadsResponse> =>
  api.post('/leads/import', data).then((r) => r.data);

export const backfillCustomerIds = (): Promise<{ success: boolean; message: string; updated: number; total?: number }> =>
  api.post('/leads/backfill-customer-ids').then((r) => r.data);

// ── Status Workflow ───────────────────────────────────────────────────────────

export const changeLeadStatus = (leadId: string, data: ChangeLeadStatusData): Promise<ChangeLeadStatusResponse> =>
  api.post(`/leads/${leadId}/status`, data).then((r) => r.data);

export const getLeadStatusHistory = (leadId: string): Promise<LeadStatusHistoryResponse> =>
  api.get(`/leads/${leadId}/status-history`).then((r) => r.data);

// ── Call Logs ─────────────────────────────────────────────────────────────────

export const getCallsByLead = (leadId: string): Promise<CallLogsResponse> =>
  api.get(`/leads/${leadId}/calls`).then((r) => r.data);

export const addCall = (leadId: string, data: CreateCallLogData) =>
  api.post(`/leads/${leadId}/calls`, data).then((r) => r.data);

export const updateCall = (leadId: string, callId: string, data: Partial<CreateCallLogData>) =>
  api.patch(`/leads/${leadId}/calls/${callId}`, data).then((r) => r.data);

export const deleteCall = (leadId: string, callId: string) =>
  api.delete(`/leads/${leadId}/calls/${callId}`).then((r) => r.data);

export const getRecentCalls = (limit = 50): Promise<RecentCallsResponse> =>
  api.get('/calls/recent', { params: { limit } }).then((r) => r.data);

// ── Follow-ups ────────────────────────────────────────────────────────────────

export const getFollowUpsByLead = (leadId: string): Promise<FollowUpsResponse> =>
  api.get(`/leads/${leadId}/followups`).then((r) => r.data);

export const addFollowUp = (leadId: string, data: CreateFollowUpData) =>
  api.post(`/leads/${leadId}/followups`, data).then((r) => r.data);

export const updateFollowUp = (leadId: string, followUpId: string, data: Partial<CreateFollowUpData> & { status?: string }) =>
  api.patch(`/leads/${leadId}/followups/${followUpId}`, data).then((r) => r.data);

export const deleteFollowUp = (leadId: string, followUpId: string) =>
  api.delete(`/leads/${leadId}/followups/${followUpId}`).then((r) => r.data);

export const getUpcomingFollowUps = (): Promise<FollowUpsResponse> =>
  api.get('/followups/upcoming').then((r) => r.data);

// ── Attachments ───────────────────────────────────────────────────────────────

export const getAttachments = (leadId: string): Promise<AttachmentsResponse> =>
  api.get(`/leads/${leadId}/attachments`).then((r) => r.data);

export const addAttachment = (leadId: string, data: { fileId: string; fileName: string; fileType?: string; fileSize?: number }) =>
  api.post(`/leads/${leadId}/attachments`, data).then((r) => r.data);

export const deleteAttachment = (leadId: string, attachmentId: string) =>
  api.delete(`/leads/${leadId}/attachments/${attachmentId}`).then((r) => r.data);

// ── Emails ────────────────────────────────────────────────────────────────────

export const getLeadEmails = (leadId: string): Promise<LeadEmailsResponse> =>
  api.get(`/leads/${leadId}/emails`).then((r) => r.data);

export const sendLeadEmail = (leadId: string, data: SendLeadEmailData): Promise<LeadEmailResponse> =>
  api.post(`/leads/${leadId}/emails`, data).then((r) => r.data);

/** Send a message that isn't tied to a specific lead (leads toolbar compose). */
export const sendComposedEmail = (data: SendLeadEmailData): Promise<LeadEmailResponse> =>
  api.post('/emails/compose', data).then((r) => r.data);

export const deleteLeadEmail = (leadId: string, emailId: string) =>
  api.delete(`/leads/${leadId}/emails/${emailId}`).then((r) => r.data);

/** Reply in-thread to a message of the lead's conversation. */
export const replyLeadEmail = (leadId: string, emailId: string, data: SendLeadEmailData): Promise<LeadEmailResponse> =>
  api.post(`/leads/${leadId}/emails/${emailId}/reply`, data).then((r) => r.data);

export const markLeadEmailRead = (leadId: string, emailId: string): Promise<LeadEmailResponse> =>
  api.patch(`/leads/${leadId}/emails/${emailId}/read`).then((r) => r.data);

/** Pull new replies from the shared mailbox right now. */
export const syncLeadInbox = (): Promise<{ success: boolean; message: string; data: { processed: number; filed: number } }> =>
  api.post('/leads/emails/sync').then((r) => r.data);

export const getEmailInbox = (params: { filter?: EmailInboxFilter; search?: string; page?: number; limit?: number }): Promise<EmailInboxResponse> =>
  api.get('/leads/emails/inbox', { params }).then((r) => r.data);

// Step 1 of adding an attachment: push the raw file to GridFS and get back its fileId.
export const uploadFile = (
  file: File,
): Promise<{
  success: boolean;
  data: { fileId: string; fileName: string; filePath: string; fileSize: number; fileType: string; url: string };
}> => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload', formData).then((r) => r.data);
};

// Fetch a stored file as a blob (auth header is added by the axios interceptor).
export const downloadFile = (fileId: string): Promise<Blob> =>
  api.get(`/files/${fileId}`, { responseType: 'blob' }).then((r) => r.data);
