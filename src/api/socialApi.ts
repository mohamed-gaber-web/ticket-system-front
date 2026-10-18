import api from './axiosConfig';
import type {
  ImportCommitResult,
  ImportOptions,
  ImportPreview,
  ImportRow,
  MetricValues,
  SocialBatch,
  SocialCompareItem,
  SocialDashboard,
  SocialFilters,
  SocialMeta,
  SocialPost,
  SocialPostDetail,
  SocialPostInput,
  SocialPostRow,
  SocialView,
} from '@/types/social.types';

// Marketing › Social Pulse API (/api/social). Reads need the marketing module;
// writes are for admins and the marketing roles (the API answers 403 otherwise).

interface ApiOne<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface SocialQuery extends Partial<SocialFilters> {
  q?: string;
  view?: SocialView;
  month?: string;
}

/** Drop empty params so the URL stays clean and the server sees no blanks. */
const clean = (p: object) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null)) as Record<string, string>;

export const getSocialMeta = async () => (await api.get<ApiOne<SocialMeta>>('/social/meta')).data.data;

export const getSocialPosts = async (params: SocialQuery & { sort?: string; dir?: 'asc' | 'desc' }) =>
  (await api.get<ApiOne<SocialPostRow[]>>('/social/posts', { params: clean(params) })).data.data;

export const getSocialPost = async (id: string) =>
  (await api.get<ApiOne<SocialPostDetail>>(`/social/posts/${id}`)).data.data;

export const createSocialPost = async (body: SocialPostInput & { snapshot: Partial<MetricValues> & { month: string } }) =>
  (await api.post<ApiOne<SocialPost>>('/social/posts', body)).data.data;

export const updateSocialPost = async (id: string, body: Partial<SocialPostInput>) =>
  (await api.patch<ApiOne<SocialPost>>(`/social/posts/${id}`, body)).data.data;

export const deleteSocialPost = async (id: string) => (await api.delete(`/social/posts/${id}`)).data;

export const putSocialSnapshot = async (id: string, month: string, values: Partial<MetricValues>) =>
  (await api.put<ApiOne<SocialPostDetail>>(`/social/posts/${id}/snapshots/${month}`, values)).data.data;

export const deleteSocialSnapshot = async (id: string, month: string) =>
  (await api.delete<ApiOne<SocialPostDetail>>(`/social/posts/${id}/snapshots/${month}`)).data.data;

export const getSocialDashboard = async (params: SocialQuery) =>
  (await api.get<ApiOne<SocialDashboard>>('/social/dashboard', { params: clean(params) })).data.data;

export const getSocialCompare = async (ids: string[], view: SocialView, month?: string) =>
  (
    await api.get<ApiOne<{ view: SocialView; month: string | null; items: SocialCompareItem[] }>>('/social/compare', {
      params: clean({ ids: ids.join(','), view, month }),
    })
  ).data.data;

export const getSocialBatch = async (month: string, filters: Partial<SocialFilters> = {}) =>
  (await api.get<ApiOne<SocialBatch>>('/social/batch', { params: clean({ ...filters, month }) })).data.data;

export const saveSocialBatch = async (month: string, rows: { postId: string; values: Partial<MetricValues> }[]) =>
  (
    await api.post<ApiOne<{ saved: number; failed: { postId: string; error: string }[] }>>('/social/batch', {
      month,
      rows,
    })
  ).data.data;

export const previewSocialImport = async (body: ImportOptions & { rows: ImportRow[] }) =>
  (await api.post<ApiOne<ImportPreview>>('/social/import/preview', body)).data.data;

export const commitSocialImport = async (
  body: ImportOptions & { rows: ImportRow[]; excludedRowIndexes: number[]; commitRowIndexes?: number[]; fileName?: string },
) => (await api.post<ApiOne<ImportCommitResult>>('/social/import/commit', body)).data.data;

export const getSocialMapping = async (signature: string) =>
  (await api.get<ApiOne<{ mapping: Record<string, number> }>>(`/social/import/mappings/${signature}`)).data.data;

export const putSocialMapping = async (signature: string, mapping: Record<string, number>) =>
  (await api.put(`/social/import/mappings/${signature}`, { mapping })).data;

export const downloadSocialCsv = async (filters: SocialQuery) =>
  (await api.get<Blob>('/social/export.csv', { params: clean(filters), responseType: 'blob' })).data;

export const deleteSocialSamples = async () =>
  (await api.delete<ApiOne<{ deleted: number }>>('/social/samples')).data.data;
