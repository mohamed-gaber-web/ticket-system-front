import api from './axiosConfig';
import type {
  ConsultantListResponse,
  ConsultantResponse,
  ConsultantStatsResponse,
  ConsultantQueryParams,
  CreateConsultantData,
  UpdateConsultantData,
  DeleteResponse,
  EmployeeDocument,
} from '../types/consultant.types';
import type { EmployeeDocumentType } from '@/lib/hr';

// Get all consultants
export const getConsultants = async (params?: ConsultantQueryParams): Promise<ConsultantListResponse> => {
  const response = await api.get<ConsultantListResponse>('/consultants', { params });
  return response.data;
};

// Get consultant statistics
export const getConsultantStats = async (): Promise<ConsultantStatsResponse> => {
  const response = await api.get<ConsultantStatsResponse>('/consultants/stats');
  return response.data;
};

// Get consultant by ID
export const getConsultantById = async (id: string): Promise<ConsultantResponse> => {
  const response = await api.get<ConsultantResponse>(`/consultants/${id}`);
  return response.data;
};

// Create new consultant
export const createConsultant = async (data: CreateConsultantData): Promise<ConsultantResponse> => {
  const response = await api.post<ConsultantResponse>('/consultants', data);
  return response.data;
};

// Update consultant
export const updateConsultant = async (id: string, data: UpdateConsultantData): Promise<ConsultantResponse> => {
  const response = await api.put<ConsultantResponse>(`/consultants/${id}`, data);
  return response.data;
};

// Delete consultant
export const deleteConsultant = async (id: string): Promise<DeleteResponse> => {
  const response = await api.delete<DeleteResponse>(`/consultants/${id}`);
  return response.data;
};

// Reset consultant password (admin)
export const resetConsultantPassword = async (id: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.put(`/consultants/${id}/password`, { newPassword });
  return response.data;
};

// Get consultant total actual hours (all time, across all related tickets)
export const getConsultantTotalHours = async (
  id: string,
): Promise<{ success: boolean; data: { totalHours: number; ticketCount: number } }> => {
  const response = await api.get(`/consultants/${id}/total-hours`);
  return response.data;
};

// Get consultant total actual hours for a given month
// month is 0-indexed (0 = January)
export const getConsultantMonthlyHours = async (
  id: string,
  year?: number,
  month?: number,
): Promise<{ success: boolean; data: { year: number; month: number; totalHours: number; ticketCount: number } }> => {
  const response = await api.get(`/consultants/${id}/monthly-hours`, {
    params: { year, month },
  });
  return response.data;
};

// ── HR documents (admins and HR only; everyone else gets 404) ────────────────

export const getEmployeeDocuments = async (
  id: string,
): Promise<{ success: boolean; total: number; data: EmployeeDocument[] }> => {
  const response = await api.get(`/consultants/${id}/documents`);
  return response.data;
};

/** Upload one or more files as documents of one type. */
export const uploadEmployeeDocuments = async (
  id: string,
  input: { type: EmployeeDocumentType; files: File[]; expiryDate?: string; notes?: string },
  onProgress?: (percent: number) => void,
): Promise<{ success: boolean; message: string; data: EmployeeDocument[] }> => {
  const form = new FormData();
  form.append('type', input.type);
  if (input.expiryDate) form.append('expiryDate', input.expiryDate);
  if (input.notes) form.append('notes', input.notes);
  input.files.forEach((f) => form.append('files', f));
  const response = await api.post(`/consultants/${id}/documents`, form, {
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
  return response.data;
};

/** The file as a Blob (the request needs the auth header, so no plain link). */
export const getEmployeeDocumentFile = async (id: string, docId: string): Promise<Blob> => {
  const response = await api.get(`/consultants/${id}/documents/${docId}/file`, { responseType: 'blob' });
  return response.data;
};

export const deleteEmployeeDocument = async (id: string, docId: string): Promise<{ success: boolean }> => {
  const response = await api.delete(`/consultants/${id}/documents/${docId}`);
  return response.data;
};
