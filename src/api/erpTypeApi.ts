import api from './axiosConfig';
import type {
  ErpType,
  CreateErpTypeDto,
  UpdateErpTypeDto,
  ErpTypeQueryParams,
  ErpTypeResponse,
} from '../types/erpType.types';

export const erpTypeApi = {
  getAll: async (params?: ErpTypeQueryParams): Promise<ErpTypeResponse> => {
    const response = await api.get('/erp-types', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ErpType> => {
    const response = await api.get(`/erp-types/${id}`);
    return response.data;
  },

  create: async (data: CreateErpTypeDto): Promise<ErpType> => {
    const response = await api.post('/erp-types', data);
    return response.data;
  },

  update: async (id: string, data: UpdateErpTypeDto): Promise<ErpType> => {
    const response = await api.patch(`/erp-types/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/erp-types/${id}`);
  },

  toggleStatus: async (id: string): Promise<ErpType> => {
    const response = await api.patch(`/erp-types/${id}/toggle-status`);
    return response.data;
  },
};
