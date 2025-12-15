import api from './axiosConfig';
import type {
  CreateScopeData,
  UpdateScopeData,
  ScopeQueryParams,
  ScopeResponse,
  ScopesResponse,
} from '@/types/scope.types';

/**
 * Get all scopes with optional filtering and pagination
 */
export const getScopes = async (params?: ScopeQueryParams): Promise<ScopesResponse> => {
  const response = await api.get('/scopes', { params });
  return response.data;
};

/**
 * Get a single scope by ID
 */
export const getScopeById = async (id: string): Promise<ScopeResponse> => {
  const response = await api.get(`/scopes/${id}`);
  return response.data;
};

/**
 * Create a new scope
 */
export const createScope = async (data: CreateScopeData): Promise<ScopeResponse> => {
  const response = await api.post('/scopes', data);
  return response.data;
};

/**
 * Update an existing scope
 */
export const updateScope = async (
  id: string,
  data: UpdateScopeData
): Promise<ScopeResponse> => {
  const response = await api.patch(`/scopes/${id}`, data);
  return response.data;
};

/**
 * Delete a scope
 */
export const deleteScope = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/scopes/${id}`);
  return response.data;
};

/**
 * Toggle scope status (active/inactive)
 */
export const toggleScopeStatus = async (id: string): Promise<ScopeResponse> => {
  const response = await api.patch(`/scopes/${id}/toggle-status`);
  return response.data;
};
