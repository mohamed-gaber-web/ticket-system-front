import api from './axiosConfig';
import type {
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentQueryParams,
  DepartmentResponse,
} from '../types/department.types';

export const departmentApi = {
  getAll: async (params?: DepartmentQueryParams): Promise<DepartmentResponse> => {
    const response = await api.get('/departments', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Department> => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  create: async (data: CreateDepartmentDto): Promise<Department> => {
    const response = await api.post('/departments', data);
    return response.data;
  },

  update: async (id: string, data: UpdateDepartmentDto): Promise<Department> => {
    const response = await api.patch(`/departments/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },

  toggleStatus: async (id: string): Promise<Department> => {
    const response = await api.patch(`/departments/${id}/toggle-status`);
    return response.data;
  },
};
