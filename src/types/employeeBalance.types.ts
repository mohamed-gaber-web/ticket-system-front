import type { EmployeeModel, EmployeePerson } from './employeeRequest.types';

export interface EmployeeBalance {
  _id: string;
  employee: EmployeePerson | string;
  employeeModel: EmployeeModel;
  year: number;
  annualAllotment: number;
  carriedOver: number;
  usedVacationDays: number;
  usedExcuseHours: number;
  remainingDays: number; // virtual from backend
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeBalanceQueryParams {
  year?: number;
  employee?: string;
  employeeModel?: EmployeeModel;
}

export interface UpsertBalanceData {
  employee: string;
  employeeModel: EmployeeModel;
  year: number;
  annualAllotment?: number;
  carriedOver?: number;
}

export interface EmployeeBalanceListResponse {
  success: boolean;
  count: number;
  data: EmployeeBalance[];
}

export interface EmployeeBalanceResponse {
  success: boolean;
  data: EmployeeBalance;
  message?: string;
}
