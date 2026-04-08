import api from './axiosConfig';
import type {
  CreateCompanyUserData,
  UpdateCompanyUserData,
  CustomerResponse,
  CustomersListResponse,
  CustomerQueryParams,
} from '@/types/customer.types';

export const getCompanyUsers = async (params?: CustomerQueryParams): Promise<CustomersListResponse> => {
  const response = await api.get<CustomersListResponse>('/company-users', { params });
  return response.data;
};

export const getCompanyUserById = async (id: string): Promise<CustomerResponse> => {
  const response = await api.get<CustomerResponse>(`/company-users/${id}`);
  return response.data;
};

export const createCompanyUser = async (data: CreateCompanyUserData): Promise<CustomerResponse> => {
  const response = await api.post<CustomerResponse>('/company-users', data);
  return response.data;
};

export const updateCompanyUser = async (
  id: string,
  data: UpdateCompanyUserData
): Promise<CustomerResponse> => {
  const response = await api.put<CustomerResponse>(`/company-users/${id}`, data);
  return response.data;
};

export const removeCompanyUser = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/company-users/${id}`);
  return response.data;
};
