import type { CreateCustomerData, CustomerQueryParams, CustomerResponse, CustomersListResponse, UpdateCustomerData } from '@/types/customer.types';
import api from './axiosConfig';


// Get all customers
export const getCustomers = async (params?: CustomerQueryParams): Promise<CustomersListResponse> => {
  const response = await api.get<CustomersListResponse>('/customers', { params });
  return response.data;
};

// Get single customer by ID
export const getCustomerById = async (id: string): Promise<CustomerResponse> => {
  const response = await api.get<CustomerResponse>(`/customers/${id}`);
  return response.data;
};

// Create new customer
export const createCustomer = async (data: CreateCustomerData): Promise<CustomerResponse> => {
  const response = await api.post<CustomerResponse>('/customers', data);
  return response.data;
};

// Update customer
export const updateCustomer = async (
  id: string,
  data: UpdateCustomerData
): Promise<CustomerResponse> => {
  const response = await api.put<CustomerResponse>(`/customers/${id}`, data);
  return response.data;
};

// Delete customer
export const deleteCustomer = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/customers/${id}`);
  return response.data;
};
