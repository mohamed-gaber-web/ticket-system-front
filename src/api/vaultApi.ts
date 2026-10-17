import api from './axiosConfig';
import type {
  VaultClient,
  VaultClientInput,
  VaultDashboard,
  VaultEntry,
  VaultEntryDetail,
  VaultEntryInput,
  VaultLog,
  VaultLogDetail,
  VaultLookup,
  VaultLookupInput,
  VaultLookupPatch,
  VaultLookupsByType,
  VaultPaged,
  VaultSendInput,
  VaultSendPreview,
  VaultSendResult,
  VaultUser,
} from '@/types/vault.types';

// Credentials Vault API (/api/vault). Only `revealPassword` ever returns a
// password — callers keep it in local component state, never in Redux.

const noCache = { headers: { 'Cache-Control': 'no-cache' } };

interface ApiOne<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ── Lookups ──────────────────────────────────────────────────────────────────

export const getVaultLookups = async () =>
  (await api.get<ApiOne<VaultLookupsByType>>('/vault/lookups', noCache)).data;

export const createVaultLookup = async (body: VaultLookupInput) =>
  (await api.post<ApiOne<VaultLookup>>('/vault/lookups', body)).data;

export const updateVaultLookup = async (id: string, body: VaultLookupPatch) =>
  (await api.patch<ApiOne<VaultLookup>>(`/vault/lookups/${id}`, body)).data;

export const deleteVaultLookup = async (id: string) =>
  (await api.delete<ApiOne<null>>(`/vault/lookups/${id}`)).data;

// ── Clients (ticketing companies) ────────────────────────────────────────────

export const getVaultClients = async () =>
  (await api.get<ApiOne<VaultClient[]>>('/vault/clients', noCache)).data;

export const createVaultClient = async (body: VaultClientInput) =>
  (await api.post<ApiOne<VaultClient>>('/vault/clients', body)).data;

export const updateVaultClient = async (id: string, body: Partial<VaultClientInput>) =>
  (await api.patch<ApiOne<VaultClient>>(`/vault/clients/${id}`, body)).data;

export const deleteVaultClient = async (id: string) =>
  (await api.delete<ApiOne<null>>(`/vault/clients/${id}`)).data;

// ── Employees ────────────────────────────────────────────────────────────────

export const getVaultUsers = async () =>
  (await api.get<ApiOne<VaultUser[]>>('/vault/users', noCache)).data;

// ── Entries ──────────────────────────────────────────────────────────────────

export interface VaultEntryListParams {
  q?: string;
  ownerType?: string;
  client?: string;
  category?: string;
  environment?: string;
  sensitivity?: string;
  page?: number;
  limit?: number;
}

export const getVaultEntries = async (params: VaultEntryListParams) =>
  (await api.get<VaultPaged<VaultEntry>>('/vault/entries', { params, ...noCache })).data;

export const getVaultEntry = async (id: string) =>
  (await api.get<ApiOne<VaultEntryDetail>>(`/vault/entries/${id}`, noCache)).data;

export const createVaultEntry = async (body: VaultEntryInput) =>
  (await api.post<ApiOne<VaultEntry>>('/vault/entries', body)).data;

export const updateVaultEntry = async (id: string, body: VaultEntryInput) =>
  (await api.patch<ApiOne<VaultEntry>>(`/vault/entries/${id}`, body)).data;

export const deleteVaultEntry = async (id: string) =>
  (await api.delete<ApiOne<null>>(`/vault/entries/${id}`)).data;

/** The only call that returns a plaintext password. Logged server-side. */
export const revealPassword = async (id: string, action: 'reveal' | 'copy') =>
  (await api.post<ApiOne<{ password: string }>>(`/vault/entries/${id}/reveal`, { action })).data;

// ── Send ─────────────────────────────────────────────────────────────────────

export const previewVaultSend = async (body: VaultSendInput) =>
  (await api.post<ApiOne<VaultSendPreview>>('/vault/send/preview', body)).data;

export const sendVaultCredentials = async (body: VaultSendInput) =>
  (await api.post<ApiOne<VaultSendResult>>('/vault/send', body)).data;

// ── Log ──────────────────────────────────────────────────────────────────────

export interface VaultLogListParams {
  q?: string;
  sentBy?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const getVaultLogs = async (params: VaultLogListParams) =>
  (await api.get<VaultPaged<VaultLog>>('/vault/logs', { params, ...noCache })).data;

export const getVaultLog = async (id: string) =>
  (await api.get<ApiOne<VaultLogDetail>>(`/vault/logs/${id}`, noCache)).data;

// ── Dashboard ────────────────────────────────────────────────────────────────

export const getVaultDashboard = async () =>
  (await api.get<ApiOne<VaultDashboard>>('/vault/dashboard', noCache)).data;
