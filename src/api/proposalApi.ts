import api from './axiosConfig';
import type { Lead } from '@/types/teleSales.types';
import type {
  CustomerOpportunity,
  FromCustomerBody,
  ImageAttachment,
  Proposal,
  ProposalCatalog,
  ProposalStatus,
  ProposalSummary,
} from '@/types/proposal.types';

const noCache = { headers: { 'Cache-Control': 'no-cache' } };

interface ApiOne<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ── Price list (catalog) ─────────────────────────────────────────────────────

export const getProposalCatalog = async () =>
  (await api.get<ApiOne<ProposalCatalog>>('/proposal-catalog', noCache)).data;

export const saveProposalCatalog = async (payload: Pick<ProposalCatalog, 'settings' | 'services' | 'skus'>) =>
  (await api.put<ApiOne<ProposalCatalog>>('/proposal-catalog', payload)).data;

// ── Proposals ────────────────────────────────────────────────────────────────

/** Multi-select filters are sent as comma lists (`status=Draft,Approved`). */
export interface ProposalListParams {
  q?: string;
  status?: ProposalStatus[];
  owner?: string[];
  preparedBy?: string[];
  leadSource?: string[];
  industry?: string[];
  country?: string[];
  page?: number;
  limit?: number;
}

export interface ProposalFilterOptions {
  statuses: ProposalStatus[];
  countries: string[];
  owners: { _id: string; name: string }[];
  preparedBy: { _id: string; name: string }[];
  leadSources: string[];
  industries: string[];
}

export const getProposals = async ({ q, page, limit, ...lists }: ProposalListParams) => {
  const params: Record<string, string | number> = {};
  if (q) params.q = q;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  for (const [key, values] of Object.entries(lists)) if (values?.length) params[key] = values.join(',');
  return (await api.get<ApiOne<ProposalSummary[]> & { total: number }>('/proposals', { params, ...noCache })).data;
};

export const getProposalFilterOptions = async () =>
  (await api.get<ApiOne<ProposalFilterOptions>>('/proposals/filter-options', noCache)).data;

export const getOpportunityProposals = async (leadId: string) =>
  (await api.get<ApiOne<ProposalSummary[]>>(`/opportunities/${leadId}/proposals`, noCache)).data;

export const createProposal = async (leadId: string, fromProposalId?: string) =>
  (await api.post<ApiOne<Proposal>>(`/opportunities/${leadId}/proposals`, fromProposalId ? { fromProposalId } : {})).data;

export const getProposal = async (id: string) =>
  (await api.get<ApiOne<Proposal>>(`/proposals/${id}`, noCache)).data;

export const saveProposal = async (id: string, payload: Proposal) =>
  (await api.put<ApiOne<Proposal>>(`/proposals/${id}`, payload)).data;

export const rebuildProposal = async (id: string) =>
  (await api.post<ApiOne<Proposal>>(`/proposals/${id}/rebuild`)).data;

export const requestProposalApproval = async (id: string) =>
  (await api.post<ApiOne<Proposal>>(`/proposals/${id}/request-approval`)).data;

export const approveProposal = async (id: string) =>
  (await api.post<ApiOne<Proposal>>(`/proposals/${id}/approve`)).data;

/** Admin only: back to Draft with the reason (required, max 1000 characters). */
export const rejectProposal = async (id: string, reason: string) =>
  (await api.post<ApiOne<Proposal>>(`/proposals/${id}/reject`, { reason })).data;

export const setProposalStatus = async (id: string, status: ProposalStatus) =>
  (await api.patch<ApiOne<Proposal>>(`/proposals/${id}/status`, { status })).data;

export const deleteProposal = async (id: string) => (await api.delete<ApiOne<null>>(`/proposals/${id}`)).data;

/** Clears the export: 403 unless the proposal is Approved, Sent or Accepted. */
export const recordProposalExport = async (id: string) =>
  (await api.post<ApiOne<{ generatedAt: string }>>(`/proposals/${id}/export`)).data;

// ── Start from an existing customer ──────────────────────────────────────────

/** The company's open opportunities the caller may see. */
export const getCustomerOpportunities = async (accountId: string) =>
  (await api.get<ApiOne<CustomerOpportunity[]>>(`/opportunities/by-customer/${accountId}`, noCache)).data;

/**
 * Creates an Opportunity for an existing customer's company + contact. Answers 400
 * `{ message, missing: [{ field, label }] }` when mandatory lead fields are still empty.
 */
export const createOpportunityFromCustomer = async (body: FromCustomerBody) =>
  (await api.post<ApiOne<Lead>>('/opportunities/from-customer', body)).data;

// ── SOW images ───────────────────────────────────────────────────────────────

export const uploadProposalImage = async (id: string, blob: Blob, width: number, height: number) => {
  const form = new FormData();
  const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
  form.append('file', blob, `sow-image.${ext}`);
  form.append('width', String(width));
  form.append('height', String(height));
  return (await api.post<ApiOne<Pick<ImageAttachment, 'fileId' | 'url' | 'width' | 'height'>>>(`/proposals/${id}/attachments`, form)).data;
};

/** SOW images are behind auth, so they are fetched as blobs and shown through object URLs. */
export const fetchProposalImage = async (id: string, fileId: string) =>
  (await api.get<Blob>(`/proposals/${id}/attachments/${fileId}`, { responseType: 'blob' })).data;
