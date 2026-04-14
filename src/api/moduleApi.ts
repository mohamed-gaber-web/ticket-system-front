import api from './axiosConfig';
import type {
  CreateModuleData,
  UpdateModuleData,
  ModuleQueryParams,
  ModuleResponse,
  ModulesResponse,
} from '@/types/module.types';

/**
 * Get all modules with optional filtering and pagination
 */
export const getModules = async (params?: ModuleQueryParams): Promise<ModulesResponse> => {
  const response = await api.get('/scopes', { params });
  return response.data;
};

/**
 * Get a single module by ID
 */
export const getModuleById = async (id: string): Promise<ModuleResponse> => {
  const response = await api.get(`/scopes/${id}`);
  return response.data;
};

/**
 * Create a new module
 */
export const createModule = async (data: CreateModuleData): Promise<ModuleResponse> => {
  const response = await api.post('/scopes', data);
  return response.data;
};

/**
 * Update an existing module
 */
export const updateModule = async (
  id: string,
  data: UpdateModuleData
): Promise<ModuleResponse> => {
  const response = await api.patch(`/scopes/${id}`, data);
  return response.data;
};

/**
 * Delete a module
 */
export const deleteModule = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/scopes/${id}`);
  return response.data;
};

/**
 * Toggle module status (active/inactive)
 */
export const toggleModuleStatus = async (id: string): Promise<ModuleResponse> => {
  const response = await api.patch(`/scopes/${id}/toggle-status`);
  return response.data;
};
