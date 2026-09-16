// User Types — two kinds of people log in. The token carries `userType`; every
// member of staff is an "employee" whatever their role.
export type UserType = 'employee' | 'customer';

export type { CustomerRole } from './customer.types';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'on_leave';

/**
 * Employee roles — one flat list. The role decides which modules open by
 * default (see src/lib/access.ts); an admin may override the module list per
 * employee. Roles ending in `_manager` run their "family" (sales_manager runs
 * the sales people).
 */
export type EmployeeRole =
  | 'admin'
  | 'consultant'
  | 'sales'
  | 'sales_manager'
  | 'marketing'
  | 'marketing_manager'
  | 'developer'
  | 'developer_manager';

export type RoleFamily = 'admin' | 'consultant' | 'sales' | 'marketing' | 'developer';

export type ModuleKey = 'tickets' | 'telesales' | 'tasks' | 'admin' | 'development';

// Base User Interface
export interface User {
  _id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  userType: UserType;
  status: UserStatus;
  profilePicture?: string | null;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// Customer specific fields
export interface Customer extends User {
  userType: 'customer';
  slaMapping?: string;
  role?: import('./customer.types').CustomerRole;
}

export interface TeleSalesTeamRef {
  _id: string;
  name: string;
  code?: string;
  isActive?: boolean;
}

// Employee specific fields
export interface Employee extends User {
  userType: 'employee';
  firstName?: string;
  lastName?: string;
  position?: string;
  role: EmployeeRole;
  /** Resolved by the API: the role defaults, or the admin's override. */
  modules?: ModuleKey[];
  department?: { _id: string; name: string } | string | null;
  teleSalesTeam?: TeleSalesTeamRef | string | null;
  monthlyTargetHours?: number | null;
}

/** @deprecated use Employee */
export type Consultant = Employee;

// Authentication Request/Response Types
export interface SignupRequest {
  companyName: string;
  contactPerson: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  userType: UserType;
}

// The e-mail alone decides the account; userType is optional (legacy clients).
export interface SigninRequest {
  email: string;
  password: string;
  userType?: UserType;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: User | Customer | Employee;
  token: string;
  refreshToken?: string;
  userType: UserType;
}

export interface ProfileResponse {
  success: boolean;
  userType: UserType;
  data: User | Customer | Employee;
}

export interface UpdateProfileRequest {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: UserStatus;
  slaMapping?: string;
  profilePicture?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
  userType?: UserType;
}

export interface ResetPasswordRequest {
  newPassword: string;
  userType: UserType;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  userType?: UserType;
}

/** @deprecated use EmployeeRole */
export type ConsultantRole = EmployeeRole;

// Auth State Interface
export interface AuthState {
  user: User | Customer | Employee | null;
  token: string | null;
  refreshToken: string | null;
  userType: UserType | null;
  customerRole: import('./customer.types').CustomerRole | null;
  /** The employee's role (null for customers). Kept under its historical name. */
  consultantRole: EmployeeRole | null;
  /** The employee's department name, lowercased (display only — never gates access). */
  consultantDepartment: string | null;
  /** The modules this employee may open, as resolved by the API. */
  modules: ModuleKey[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
