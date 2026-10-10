import api from './axiosConfig';
import type {
  CampaignContact,
  CampaignContactInput,
  CampaignContactsResponse,
  CampaignImportResult,
  CampaignPreview,
  CampaignSettings,
  CampaignTemplate,
  CustomerSurvey,
  SurveyCompany,
  SurveyPayload,
  SurveySummary,
} from '@/types/marketing.types';

const noCache = { headers: { 'Cache-Control': 'no-cache' } };
const base = '/marketing';

interface ApiOne<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ── CSP (customer satisfaction surveys) ──────────────────────────────────────

export const getSurveyCompanies = async () =>
  (await api.get<ApiOne<SurveyCompany[]>>(`${base}/companies`, noCache)).data;

export const getSurveys = async (params: { company?: string; page?: number; limit?: number }) =>
  (await api.get<ApiOne<CustomerSurvey[]> & { total: number }>(`${base}/surveys`, { params, ...noCache })).data;

export const getSurveySummary = async (company: string) =>
  (await api.get<ApiOne<SurveySummary>>(`${base}/surveys/summary`, { params: { company }, ...noCache })).data;

export const createSurvey = async (payload: SurveyPayload) =>
  (await api.post<ApiOne<CustomerSurvey>>(`${base}/surveys`, payload)).data;

export const updateSurvey = async (id: string, payload: SurveyPayload) =>
  (await api.put<ApiOne<CustomerSurvey>>(`${base}/surveys/${id}`, payload)).data;

export const deleteSurvey = async (id: string) =>
  (await api.delete<ApiOne<object>>(`${base}/surveys/${id}`)).data;

// ── Email campaign ───────────────────────────────────────────────────────────

export const getCampaignContacts = async (params: { status?: string; search?: string; page?: number; limit?: number }) =>
  (await api.get<CampaignContactsResponse>(`${base}/campaign/contacts`, { params, ...noCache })).data;

export const importCampaignContacts = async (contacts: CampaignContactInput[], source?: string) =>
  (await api.post<ApiOne<CampaignImportResult>>(`${base}/campaign/contacts/import`, { contacts, source })).data;

export const setCampaignContactStatus = async (id: string, status: 'pending' | 'excluded') =>
  (await api.patch<ApiOne<CampaignContact>>(`${base}/campaign/contacts/${id}`, { status })).data;

/** Mark contacts as already emailed so the campaign never picks them. */
export const markCampaignContactsSent = async (ids: string[]) =>
  (await api.post<ApiOne<{ marked: number; skipped: number }>>(`${base}/campaign/contacts/mark-sent`, { ids })).data;

export const deleteCampaignContact = async (id: string) =>
  (await api.delete<ApiOne<object>>(`${base}/campaign/contacts/${id}`)).data;

export const getCampaignSettings = async () =>
  (await api.get<ApiOne<CampaignSettings>>(`${base}/campaign/settings`, noCache)).data;

export const updateCampaignSettings = async (
  payload: Partial<Pick<CampaignSettings, 'sendHours' | 'attachCatalog' | 'enabled'>> & { template?: string | null },
) => (await api.put<ApiOne<CampaignSettings>>(`${base}/campaign/settings`, payload)).data;

export const getCampaignTemplates = async () =>
  (await api.get<ApiOne<CampaignTemplate[]>>(`${base}/campaign/templates`, noCache)).data;

export const getCampaignPreview = async () =>
  (await api.get<ApiOne<CampaignPreview>>(`${base}/campaign/preview`, noCache)).data;
