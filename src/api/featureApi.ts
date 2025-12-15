import api from './axiosConfig';
import type {
  CreateFeatureData,
  UpdateFeatureData,
  FeatureQueryParams,
  FeatureResponse,
  FeaturesResponse,
} from '@/types/feature.types';

/**
 * Get all features with optional filtering and pagination
 */
export const getFeatures = async (params?: FeatureQueryParams): Promise<FeaturesResponse> => {
  const response = await api.get('/features', { params });
  return response.data;
};

/**
 * Get a single feature by ID
 */
export const getFeatureById = async (id: string): Promise<FeatureResponse> => {
  const response = await api.get(`/features/${id}`);
  return response.data;
};

/**
 * Create a new feature
 */
export const createFeature = async (data: CreateFeatureData): Promise<FeatureResponse> => {
  const response = await api.post('/features', data);
  return response.data;
};

/**
 * Update an existing feature
 */
export const updateFeature = async (
  id: string,
  data: UpdateFeatureData
): Promise<FeatureResponse> => {
  const response = await api.patch(`/features/${id}`, data);
  return response.data;
};

/**
 * Delete a feature
 */
export const deleteFeature = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/features/${id}`);
  return response.data;
};

/**
 * Toggle feature status (active/inactive)
 */
export const toggleFeatureStatus = async (id: string): Promise<FeatureResponse> => {
  const response = await api.patch(`/features/${id}/toggle-status`);
  return response.data;
};
