import api from './axiosConfig';
import type {
  CreateCompanyData,
  UpdateCompanyData,
  CompanyQueryParams,
  CompanyResponse,
  CompaniesResponse,
} from '@/types/company.types';

export const getCompanies = async (params?: CompanyQueryParams): Promise<CompaniesResponse> => {
  const response = await api.get('/companies', { params });
  return response.data;
};

export const getCompanyById = async (id: string): Promise<CompanyResponse> => {
  const response = await api.get(`/companies/${id}`);
  return response.data;
};

export const createCompany = async (data: CreateCompanyData): Promise<CompanyResponse> => {
  const response = await api.post('/companies', data);
  return response.data;
};

export const updateCompany = async (
  id: string,
  data: UpdateCompanyData
): Promise<CompanyResponse> => {
  const response = await api.patch(`/companies/${id}`, data);
  return response.data;
};

export const deleteCompany = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/companies/${id}`);
  return response.data;
};

export const toggleCompanyStatus = async (id: string): Promise<CompanyResponse> => {
  const response = await api.patch(`/companies/${id}/toggle-status`);
  return response.data;
};
