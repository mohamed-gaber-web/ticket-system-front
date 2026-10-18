import api from './axiosConfig';
import type {
  Analytics,
  ChequeInput,
  Cheque,
  CollectMeta,
  CollectSettings,
  CollectionFilter,
  CollectionResult,
  ContractDetail,
  ContractDocument,
  ContractInput,
  ContractStatus,
  ContractSummary,
  ContractType,
  Customer,
  CustomerInput,
  EmailTemplate,
  Outbox,
  ReminderRule,
  SentLog,
  SignatureStatus,
  SignaturesData,
  Totals,
} from '@/types/collect.types';

// Grow Path Collect API (/api/collect). Needs the `collect` module; settings,
// types, clause library, rules, templates and data tools are admin-only.

interface One<T> {
  success: boolean;
  data: T;
  message?: string;
}

const clean = (p: object) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null && v !== 'all')) as Record<string, string>;

// ── Meta, settings ───────────────────────────────────────────────────────────
export const getCollectMeta = async () => (await api.get<One<CollectMeta>>('/collect/meta')).data.data;
export const getCollectSettings = async () => (await api.get<One<CollectSettings>>('/collect/settings')).data.data;
export const putCollectSettings = async (body: Partial<Omit<CollectSettings, 'document'>> & { document?: Partial<CollectSettings['document']> }) =>
  (await api.put<One<CollectSettings>>('/collect/settings', body)).data;
export const resetCollectClauses = async () => (await api.post<One<CollectSettings>>('/collect/settings/clauses/reset')).data;

// ── Types ────────────────────────────────────────────────────────────────────
export const getContractTypes = async () => (await api.get<One<ContractType[]>>('/collect/types')).data.data;
export const createContractType = async (body: Partial<ContractType>) => (await api.post<One<ContractType>>('/collect/types', body)).data;
export const updateContractType = async (id: string, body: Partial<ContractType>) =>
  (await api.put<One<ContractType>>(`/collect/types/${id}`, body)).data;
export const deleteContractType = async (id: string) => (await api.delete(`/collect/types/${id}`)).data;

// ── Customers ────────────────────────────────────────────────────────────────
export const getCollectCustomers = async (all = false) =>
  (await api.get<One<Customer[]>>('/collect/customers', { params: all ? { all: 1 } : {} })).data.data;
export const createCollectCustomer = async (body: CustomerInput) => (await api.post<One<Customer>>('/collect/customers', body)).data;
export const updateCollectCustomer = async (id: string, body: CustomerInput) =>
  (await api.put<One<Customer>>(`/collect/customers/${id}`, body)).data;
export const removeCollectCustomer = async (id: string) => (await api.delete(`/collect/customers/${id}`)).data;

// ── Contracts ────────────────────────────────────────────────────────────────
export const getContracts = async (params: { status?: string; type?: string; customer?: string; q?: string; unsigned?: boolean }) =>
  (
    await api.get<One<ContractSummary[]> & { totals: Totals; today: string }>('/collect/contracts', {
      params: clean({ ...params, unsigned: params.unsigned ? 1 : '' }),
    })
  ).data;
export const getNextContractNo = async () => (await api.get<One<{ no: string }>>('/collect/contracts/next-no')).data.data.no;
export const getContract = async (id: string) => (await api.get<One<ContractDetail>>(`/collect/contracts/${id}`)).data.data;
export const createContract = async (body: ContractInput) => (await api.post<One<ContractDetail>>('/collect/contracts', body)).data;
export const updateContract = async (id: string, body: ContractInput) =>
  (await api.put<One<ContractDetail>>(`/collect/contracts/${id}`, body)).data;
export const deleteContract = async (id: string) => (await api.delete(`/collect/contracts/${id}`)).data;
export const regenerateInstallments = async (id: string) =>
  (await api.post<One<ContractDetail>>(`/collect/contracts/${id}/generate-installments`)).data;
export const addPayment = async (id: string, instId: string, body: { amount: number; date: string; method: string }) =>
  (await api.post<One<ContractDetail>>(`/collect/contracts/${id}/installments/${instId}/payments`, body)).data;
export const deletePayment = async (id: string, instId: string, payId: string) =>
  (await api.delete<One<ContractDetail>>(`/collect/contracts/${id}/installments/${instId}/payments/${payId}`)).data;
export const renewContract = async (id: string, body: { upliftPct: number; startDate: string; endDate: string }) =>
  (await api.post<One<ContractDetail>>(`/collect/contracts/${id}/renew`, body)).data;
export const setContractStatus = async (id: string, status: ContractStatus) =>
  (await api.put<One<ContractDetail>>(`/collect/contracts/${id}/status`, { status })).data;
export const initContractDocument = async (id: string, fromContractId?: string) =>
  (
    await api.post<One<{ draft: ContractDocument; global: ContractDocument; scope: string; notes: string }>>(
      `/collect/contracts/${id}/document/init`,
      fromContractId ? { fromContractId } : {},
    )
  ).data.data;
export const saveContractDocument = async (id: string, body: ContractDocument & { scope?: string; notes?: string }) =>
  (await api.put<One<ContractDetail>>(`/collect/contracts/${id}/document`, body)).data;
export const resetContractDocument = async (id: string) => (await api.delete<One<ContractDetail>>(`/collect/contracts/${id}/document`)).data;
export const moveSignature = async (id: string, body: { status: SignatureStatus; date: string; followUpDate?: string | null; note?: string }) =>
  (await api.post<One<ContractDetail>>(`/collect/contracts/${id}/signature`, body)).data;
export const addSignatureFollowUp = async (id: string, body: { note: string; followUpDate: string | null; date?: string }) =>
  (await api.post<One<ContractDetail>>(`/collect/contracts/${id}/signature/followup`, body)).data;

// ── Cheques, signatures ──────────────────────────────────────────────────────
export const getSignatures = async () => (await api.get<One<SignaturesData> & { today: string }>('/collect/signatures')).data;
export const createCheque = async (body: ChequeInput) => (await api.post<One<Cheque>>('/collect/cheques', body)).data;
export const updateCheque = async (id: string, body: ChequeInput) => (await api.put<One<Cheque>>(`/collect/cheques/${id}`, body)).data;
export const setChequeStatus = async (id: string, status: Cheque['status']) =>
  (await api.patch<One<Cheque> & { posted: boolean; returned: boolean }>(`/collect/cheques/${id}/status`, { status })).data;
export const deleteCheque = async (id: string) => (await api.delete(`/collect/cheques/${id}`)).data;

// ── Analytics, collection ────────────────────────────────────────────────────
export const getAnalytics = async (params: { year: number; type?: string; customer?: string }) =>
  (await api.get<One<Analytics>>('/collect/analytics', { params: clean(params) })).data.data;
export const getCollection = async (params: { filter: CollectionFilter; q?: string; customer?: string }) =>
  (await api.get<CollectionResult>('/collect/collection', { params: clean(params) })).data;

// ── Reminders ────────────────────────────────────────────────────────────────
export const getOutbox = async () => (await api.get<One<Outbox>>('/collect/reminders/outbox')).data.data;
export const markRemindersSent = async (dedupeKeys: string[]) => (await api.post('/collect/reminders/mark-sent', { dedupeKeys })).data;
export const getReminderLog = async () => (await api.get<One<SentLog[]>>('/collect/reminders/log')).data.data;
export const getEmailTemplates = async () => (await api.get<One<EmailTemplate[]>>('/collect/templates')).data.data;
export const createEmailTemplate = async (body: Partial<EmailTemplate>) => (await api.post<One<EmailTemplate>>('/collect/templates', body)).data;
export const updateEmailTemplate = async (id: string, body: Partial<EmailTemplate>) =>
  (await api.put<One<EmailTemplate>>(`/collect/templates/${id}`, body)).data;
export const deleteEmailTemplate = async (id: string) => (await api.delete(`/collect/templates/${id}`)).data;
export const getReminderRules = async () => (await api.get<One<ReminderRule[]>>('/collect/rules')).data.data;
export const createReminderRule = async (body: Partial<ReminderRule>) => (await api.post<One<ReminderRule>>('/collect/rules', body)).data;
export const updateReminderRule = async (id: string, body: Partial<ReminderRule>) =>
  (await api.put<One<ReminderRule>>(`/collect/rules/${id}`, body)).data;
export const deleteReminderRule = async (id: string) => (await api.delete(`/collect/rules/${id}`)).data;

// ── Data tools (admin) ───────────────────────────────────────────────────────
export const exportCollect = async () => (await api.get<Blob>('/collect/export', { responseType: 'blob' })).data;
export const importCollect = async (payload: unknown) => (await api.post('/collect/import', payload)).data;
export const seedCollectDemo = async () => (await api.post('/collect/seed-demo')).data;
export const wipeCollect = async () => (await api.post('/collect/wipe')).data;
