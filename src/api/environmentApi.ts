import api from './axiosConfig';
import type {
  CreateEnvironmentData,
  UpdateEnvironmentData,
  EnvironmentQueryParams,
  EnvironmentResponse,
  EnvironmentsResponse,
} from '@/types/environment.types';

/**
 * Get all environments with optional filtering and pagination
 */
export const getEnvironments = async (params?: EnvironmentQueryParams): Promise<EnvironmentsResponse> => {
  const response = await api.get('/environments', { params });
  return response.data;
};

/**
 * Get a single environment by ID
 */
export const getEnvironmentById = async (id: string): Promise<EnvironmentResponse> => {
  const response = await api.get(`/environments/${id}`);
  return response.data;
};

/**
 * Create a new environment
 */
export const createEnvironment = async (data: CreateEnvironmentData): Promise<EnvironmentResponse> => {
  const response = await api.post('/environments', data);
  return response.data;
};

/**
 * Update an existing environment
 */
export const updateEnvironment = async (
  id: string,
  data: UpdateEnvironmentData
): Promise<EnvironmentResponse> => {
  const response = await api.patch(`/environments/${id}`, data);
  return response.data;
};

/**
 * Delete an environment
 */
export const deleteEnvironment = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/environments/${id}`);
  return response.data;
};

/**
 * Toggle environment status (active/inactive)
 */
export const toggleEnvironmentStatus = async (id: string): Promise<EnvironmentResponse> => {
  const response = await api.patch(`/environments/${id}/toggle-status`);
  return response.data;
};
