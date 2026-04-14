import api from './axiosConfig';
import type {
  CreateCustomizedSolutionData,
  UpdateCustomizedSolutionData,
  CustomizedSolutionQueryParams,
  CustomizedSolutionResponse,
  CustomizedSolutionsResponse,
} from '@/types/customizedSolution.types';

/**
 * Get all customized solutions with optional filtering and pagination
 */
export const getCustomizedSolutions = async (params?: CustomizedSolutionQueryParams): Promise<CustomizedSolutionsResponse> => {
  const response = await api.get('/features', { params });
  return response.data;
};

/**
 * Get a single customized solution by ID
 */
export const getCustomizedSolutionById = async (id: string): Promise<CustomizedSolutionResponse> => {
  const response = await api.get(`/features/${id}`);
  return response.data;
};

/**
 * Create a new customized solution
 */
export const createCustomizedSolution = async (data: CreateCustomizedSolutionData): Promise<CustomizedSolutionResponse> => {
  const response = await api.post('/features', data);
  return response.data;
};

/**
 * Update an existing customized solution
 */
export const updateCustomizedSolution = async (
  id: string,
  data: UpdateCustomizedSolutionData
): Promise<CustomizedSolutionResponse> => {
  const response = await api.patch(`/features/${id}`, data);
  return response.data;
};

/**
 * Delete a customized solution
 */
export const deleteCustomizedSolution = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/features/${id}`);
  return response.data;
};

/**
 * Toggle customized solution status (active/inactive)
 */
export const toggleCustomizedSolutionStatus = async (id: string): Promise<CustomizedSolutionResponse> => {
  const response = await api.patch(`/features/${id}/toggle-status`);
  return response.data;
};
