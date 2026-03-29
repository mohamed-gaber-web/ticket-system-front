import api from './axiosConfig';
import type {
  CreateSourceData,
  UpdateSourceData,
  SourceQueryParams,
  SourceResponse,
  SourcesResponse,
} from '@/types/source.types';

export const getSources = async (params?: SourceQueryParams): Promise<SourcesResponse> => {
  const response = await api.get('/sources', { params });
  return response.data;
};

export const getSourceById = async (id: string): Promise<SourceResponse> => {
  const response = await api.get(`/sources/${id}`);
  return response.data;
};

export const createSource = async (data: CreateSourceData): Promise<SourceResponse> => {
  const response = await api.post('/sources', data);
  return response.data;
};

export const updateSource = async (
  id: string,
  data: UpdateSourceData
): Promise<SourceResponse> => {
  const response = await api.patch(`/sources/${id}`, data);
  return response.data;
};

export const deleteSource = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/sources/${id}`);
  return response.data;
};

export const toggleSourceStatus = async (id: string): Promise<SourceResponse> => {
  const response = await api.patch(`/sources/${id}/toggle-status`);
  return response.data;
};
