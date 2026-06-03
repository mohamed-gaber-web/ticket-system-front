import api from './axiosConfig';
import type {
  EmployeeRequestsListResponse,
  EmployeeRequestResponse,
  CreateEmployeeRequestData,
  EmployeeRequestQueryParams,
} from '@/types/employeeRequest.types';

export const getEmployeeRequests = async (
  params?: EmployeeRequestQueryParams
): Promise<EmployeeRequestsListResponse> => {
  const response = await api.get('/employee-requests', { params });
  return response.data;
};

export const getEmployeeRequestById = async (
  id: string
): Promise<EmployeeRequestResponse> => {
  const response = await api.get(`/employee-requests/${id}`);
  return response.data;
};

export const createEmployeeRequest = async (
  data: CreateEmployeeRequestData
): Promise<EmployeeRequestResponse> => {
  const response = await api.post('/employee-requests', data);
  return response.data;
};

export const approveEmployeeRequest = async (
  id: string,
  reviewNote?: string
): Promise<EmployeeRequestResponse> => {
  const response = await api.patch(`/employee-requests/${id}/approve`, { reviewNote });
  return response.data;
};

export const rejectEmployeeRequest = async (
  id: string,
  reviewNote?: string
): Promise<EmployeeRequestResponse> => {
  const response = await api.patch(`/employee-requests/${id}/reject`, { reviewNote });
  return response.data;
};

export const cancelEmployeeRequest = async (
  id: string
): Promise<EmployeeRequestResponse> => {
  const response = await api.patch(`/employee-requests/${id}/cancel`);
  return response.data;
};

export const deleteEmployeeRequest = async (id: string): Promise<void> => {
  await api.delete(`/employee-requests/${id}`);
};
