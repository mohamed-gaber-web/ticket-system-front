import api from './axiosConfig';
import type {
  EmployeeBalanceListResponse,
  EmployeeBalanceResponse,
  EmployeeBalanceQueryParams,
  UpsertBalanceData,
} from '@/types/employeeBalance.types';

export const getEmployeeBalances = async (
  params?: EmployeeBalanceQueryParams
): Promise<EmployeeBalanceListResponse> => {
  const response = await api.get('/employee-balances', { params });
  return response.data;
};

export const getMyBalance = async (
  year?: number
): Promise<EmployeeBalanceResponse> => {
  const response = await api.get('/employee-balances/me', { params: { year } });
  return response.data;
};

export const upsertEmployeeBalance = async (
  data: UpsertBalanceData
): Promise<EmployeeBalanceResponse> => {
  const response = await api.put('/employee-balances', data);
  return response.data;
};
