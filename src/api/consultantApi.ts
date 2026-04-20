import api from './axiosConfig';
import type {
  ConsultantListResponse,
  ConsultantResponse,
  ConsultantStatsResponse,
  ConsultantQueryParams,
  CreateConsultantData,
  UpdateConsultantData,
  DeleteResponse,
} from '../types/consultant.types';

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
