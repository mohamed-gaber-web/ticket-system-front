import api from './axiosConfig';
import type {
  ServiceType,
  CreateServiceTypeDto,
  UpdateServiceTypeDto,
  ServiceTypeQueryParams,
  ServiceTypeResponse,
} from '../types/serviceType.types';

export const serviceTypeApi = {
  getAll: async (params?: ServiceTypeQueryParams): Promise<ServiceTypeResponse> => {
    const response = await api.get('/service-types', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ServiceType> => {
    const response = await api.get(`/service-types/${id}`);
    return response.data;
  },

  create: async (data: CreateServiceTypeDto): Promise<ServiceType> => {
    const response = await api.post('/service-types', data);
    return response.data;
  },

  update: async (id: string, data: UpdateServiceTypeDto): Promise<ServiceType> => {
    const response = await api.patch(`/service-types/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/service-types/${id}`);
  },

  toggleStatus: async (id: string): Promise<ServiceType> => {
    const response = await api.patch(`/service-types/${id}/toggle-status`);
    return response.data;
  },
};
