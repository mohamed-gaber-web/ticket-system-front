import type { EmployeeRole, ModuleKey } from './auth.types';

/** The employee role list — see src/lib/access.ts. */
export type ConsultantRole = EmployeeRole;
export type ConsultantDepartment = string;

export interface ConsultantDepartmentObject {
  _id: string;
  name: string;
  isActive?: boolean;
}
export type ConsultantStatus = 'active' | 'inactive' | 'on_leave' | 'resigned' | 'terminated';

/** Person reference as the API populates it (e.g. the direct manager). */
export interface EmployeeRef {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeCode?: string;
  position?: string;
}

/**
 * The confidential HR file — the columns of the HR employee sheet. Only sent to
 * admins and HR; for everyone else `hr` is absent from the API response. Dates
 * travel as ISO strings, "" / null clears a value.
 */
export interface EmployeeHrFile {
  // Personal
  fullLegalName?: string | null;
  nationalId?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  address?: string | null;
  // Recruitment
  hiringSource?: string | null;
  recruiterName?: string | null;
  applicationDate?: string | null;
  interviewDate?: string | null;
  interviewResult?: string | null;
  // Job placement
  section?: string | null;
  directManager?: EmployeeRef | string | null;
  hireDate?: string | null;
  // Contract
  contractType?: string | null;
  contractDurationMonths?: number | null;
  probationPeriodMonths?: number | null;
  contractEndDate?: string | null;
  // Payroll
  basicSalary?: number | null;
  grossSalary?: number | null;
  netSalary?: number | null;
  salaryPaymentMethod?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  // Social insurance (null = not recorded yet)
  hasSocialInsurance?: boolean | null;
  insuranceWage?: number | null;
  employeeInsuranceShare?: number | null;
  employerInsuranceShare?: number | null;
  // Medical insurance
  hasMedicalInsurance?: boolean | null;
  medicalStartDate?: string | null;
  medicalEndDate?: string | null;
  // Subscriptions & company assets (laptop photo = document type "laptop_photo")
  hasCompanyLine?: boolean | null;
  companyLineNumber?: string | null;
  hasLaptop?: boolean | null;
  uberSubscriber?: boolean | null;
  notes?: string | null;
}

export interface Consultant {
  _id: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  /** The primary role (admin, when held, is always primary). */
  role: ConsultantRole;
  /** Roles held besides the primary one; access ORs across all of them. */
  extraRoles?: ConsultantRole[];
  /** The primary department. */
  department?: ConsultantDepartmentObject | string | null;
  /** Departments besides the primary one; tasks are visible from any of them. */
  departments?: (ConsultantDepartmentObject | string)[];
  /** Sales family only — the home tele-sales team (default owner of what they create). */
  teleSalesTeam?: { _id: string; name: string; code?: string; isActive?: boolean } | string | null;
  /** Sales family only — every tele-sales team this person sees (home team included). */
  teleSalesTeams?: ({ _id: string; name: string; code?: string; isActive?: boolean } | string)[];
  /** Admin-set override of the role's default modules; empty = defaults. */
  modules?: ModuleKey[];
  status: ConsultantStatus;
  fullName: string;
  monthlyTargetHours?: number | null;
  profilePicture?: string | null;
  lastLogin?: string;
  /** Present only for admins and HR. */
  hr?: EmployeeHrFile;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultantQueryParams {
  page?: number;
  limit?: number;
  status?: ConsultantStatus;
  role?: ConsultantRole;
  /** A whole role family, e.g. "sales" = sales + sales_manager. */
  family?: string;
  /** Employees who can open this module. */
  module?: ModuleKey;
  teleSalesTeam?: string;
  /** Primary or extra department id. */
  department?: string;
  search?: string;
}

export interface ConsultantListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Consultant[];
}

export interface ConsultantResponse {
  success: boolean;
  data: Consultant;
  message?: string;
}

export interface ConsultantStats {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  byRole: RoleCount[];
}

export interface RoleCount {
  _id: ConsultantRole;
  count: number;
}

export interface ConsultantStatsResponse {
  success: boolean;
  data: ConsultantStats;
}

export interface CreateConsultantData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  position?: string;
  role: ConsultantRole;
  /** Every role, primary first — the multi-select. Takes precedence over `role`. */
  roles?: ConsultantRole[];
  department?: string | null;
  /** Every department, primary first — the multi-select. Takes precedence over `department`. */
  departments?: string[];
  teleSalesTeam?: string | null;
  teleSalesTeams?: string[];
  modules?: ModuleKey[];
  status: ConsultantStatus;
  monthlyTargetHours?: number | null;
  profilePicture?: string | null;
  employeeCode?: string;
  hr?: EmployeeHrFile;
}

export interface UpdateConsultantData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  role?: ConsultantRole;
  roles?: ConsultantRole[];
  department?: string | null;
  departments?: string[];
  teleSalesTeam?: string | null;
  teleSalesTeams?: string[];
  modules?: ModuleKey[];
  status?: ConsultantStatus;
  monthlyTargetHours?: number | null;
  profilePicture?: string | null;
  employeeCode?: string;
  hr?: EmployeeHrFile;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

/** A scanned document in the HR file (only returned to admins and HR). */
export interface EmployeeDocument {
  _id: string;
  employee: string;
  type: import('@/lib/hr').EmployeeDocumentType;
  fileId: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  expiryDate?: string | null;
  notes?: string | null;
  uploadedBy?: { _id: string; firstName: string; lastName: string } | string;
  createdAt: string;
}
