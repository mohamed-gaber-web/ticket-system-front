import api from './axiosConfig';
import type {
  VersionNumber,
  CreateVersionNumberDto,
  UpdateVersionNumberDto,
  VersionNumberQueryParams,
  VersionNumberResponse,
} from '../types/versionNumber.types';

export const versionNumberApi = {
  getAll: async (params?: VersionNumberQueryParams): Promise<VersionNumberResponse> => {
    const response = await api.get('/version-numbers', { params });
    return response.data;
  },

  getById: async (id: string): Promise<VersionNumber> => {
    const response = await api.get(`/version-numbers/${id}`);
    return response.data;
  },

  create: async (data: CreateVersionNumberDto): Promise<VersionNumber> => {
    const response = await api.post('/version-numbers', data);
    return response.data;
  },

  update: async (id: string, data: UpdateVersionNumberDto): Promise<VersionNumber> => {
    const response = await api.patch(`/version-numbers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/version-numbers/${id}`);
  },

  toggleStatus: async (id: string): Promise<VersionNumber> => {
    const response = await api.patch(`/version-numbers/${id}/toggle-status`);
    return response.data;
  },
};
