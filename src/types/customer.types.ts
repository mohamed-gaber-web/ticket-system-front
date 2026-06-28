export type CustomerRole = "company_admin" | "company_user";

export interface ERPTypeRef {
  _id: string;
  name: string;
  isActive: boolean;
}

export interface VersionNumberRef {
  _id: string;
  name: string;
  isActive: boolean;
}

export interface ConsultantRef {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
}

export interface CompanyRef {
  _id: string;
  name: string;
}

export interface ProductTypeRef {
  _id: string;
  name: string;
}

export interface Customer {
  _id: string;
  companyName: string;
  company?: CompanyRef | string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  role?: CustomerRole;
  erpType?: ERPTypeRef | string;
  versionNumber?: VersionNumberRef | string;
  consultants?: ConsultantRef[] | string[];
  productTypes?: ProductTypeRef[] | string[];
  profilePicture?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  companyName?: string;
  company?: string;
  contactPerson: string;
  email: string;
  password: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  erpType?: string;
  versionNumber?: string;
  consultants?: string[];
  productTypes?: string[];
  role?: CustomerRole;
  profilePicture?: string | null;
}

export interface UpdateCustomerData {
  companyName?: string;
  company?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  erpType?: string;
  versionNumber?: string;
  consultants?: string[];
  productTypes?: string[];
  role?: CustomerRole;
  profilePicture?: string | null;
}

export interface CreateCompanyUserData {
  contactPerson: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface UpdateCompanyUserData {
  contactPerson?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface SetCustomerRoleData {
  role: CustomerRole;
}

export interface CustomerResponse {
  success: boolean;
  data: Customer;
  message: string;
}

export interface CustomersListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Customer[];
}

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  companyName?: string;
  role?: CustomerRole;
}
