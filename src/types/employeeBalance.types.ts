import type { EmployeeModel, EmployeePerson } from './employeeRequest.types';

export interface EmployeeBalance {
  _id: string;
  // null when the employee was deleted (or the record predates the employee migration)
  employee: EmployeePerson | string | null;
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
