import api from './axiosConfig';
import type {
  CreateBusinessClassificationData,
  UpdateBusinessClassificationData,
  BusinessClassificationQueryParams,
  BusinessClassificationResponse,
  BusinessClassificationsResponse,
} from '@/types/businessClassification.types';

export const getBusinessClassifications = async (
  params?: BusinessClassificationQueryParams
): Promise<BusinessClassificationsResponse> => {
  const response = await api.get('/business-classifications', { params });
  return response.data;
};

export const getBusinessClassificationById = async (
  id: string
): Promise<BusinessClassificationResponse> => {
  const response = await api.get(`/business-classifications/${id}`);
  return response.data;
};

export const createBusinessClassification = async (
  data: CreateBusinessClassificationData
): Promise<BusinessClassificationResponse> => {
  const response = await api.post('/business-classifications', data);
  return response.data;
};

export const updateBusinessClassification = async (
  id: string,
  data: UpdateBusinessClassificationData
): Promise<BusinessClassificationResponse> => {
  const response = await api.patch(`/business-classifications/${id}`, data);
  return response.data;
};

export const deleteBusinessClassification = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/business-classifications/${id}`);
  return response.data;
};

export const toggleBusinessClassificationStatus = async (
  id: string
): Promise<BusinessClassificationResponse> => {
  const response = await api.patch(`/business-classifications/${id}/toggle-status`);
  return response.data;
};
