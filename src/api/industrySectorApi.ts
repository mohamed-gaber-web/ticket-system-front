import api from './axiosConfig';
import type {
  CreateIndustrySectorData,
  UpdateIndustrySectorData,
  IndustrySectorQueryParams,
  IndustrySectorResponse,
  IndustrySectorsResponse,
} from '@/types/industrySector.types';

export const getIndustrySectors = async (
  params?: IndustrySectorQueryParams
): Promise<IndustrySectorsResponse> => {
  const response = await api.get('/industry-sectors', { params });
  return response.data;
};

export const getIndustrySectorById = async (id: string): Promise<IndustrySectorResponse> => {
  const response = await api.get(`/industry-sectors/${id}`);
  return response.data;
};

export const createIndustrySector = async (
  data: CreateIndustrySectorData
): Promise<IndustrySectorResponse> => {
  const response = await api.post('/industry-sectors', data);
  return response.data;
};

export const updateIndustrySector = async (
  id: string,
  data: UpdateIndustrySectorData
): Promise<IndustrySectorResponse> => {
  const response = await api.patch(`/industry-sectors/${id}`, data);
  return response.data;
};

export const deleteIndustrySector = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/industry-sectors/${id}`);
  return response.data;
};

export const toggleIndustrySectorStatus = async (
  id: string
): Promise<IndustrySectorResponse> => {
  const response = await api.patch(`/industry-sectors/${id}/toggle-status`);
  return response.data;
};
