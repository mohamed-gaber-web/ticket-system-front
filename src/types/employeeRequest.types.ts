export type EmployeeModel = 'Consultant' | 'TeamMember' | 'TeleSalesAgent';
export type EmployeeRequestType = 'vacation' | 'excuse';
export type EmployeeRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface EmployeePerson {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface EmployeeRequestDepartment {
  _id: string;
  name: string;
}

export interface EmployeeRequest {
  _id: string;
  employee: EmployeePerson | string;
  employeeModel: EmployeeModel;
  department?: EmployeeRequestDepartment | string | null;
  type: EmployeeRequestType;
  reason?: string;
  // vacation
  startDate?: string | null;
  endDate?: string | null;
  days?: number | null;
  // excuse
  date?: string | null;
  fromTime?: string | null;
  toTime?: string | null;
  hours?: number | null;
  status: EmployeeRequestStatus;
  reviewedBy?: EmployeePerson | string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVacationRequestData {
  type: 'vacation';
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface CreateExcuseRequestData {
  type: 'excuse';
  date: string;
  fromTime: string;
  toTime: string;
  reason?: string;
}

export type CreateEmployeeRequestData =
  | CreateVacationRequestData
  | CreateExcuseRequestData;

export type RequestScope = 'mine' | 'approvals' | 'all';

export interface EmployeeRequestQueryParams {
  scope?: RequestScope;
  type?: EmployeeRequestType;
  status?: EmployeeRequestStatus;
  employeeModel?: EmployeeModel;
  department?: string;
  page?: number;
  limit?: number;
}

export interface EmployeeRequestsListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: EmployeeRequest[];
}

export interface EmployeeRequestResponse {
  success: boolean;
  data: EmployeeRequest;
  message?: string;
}
