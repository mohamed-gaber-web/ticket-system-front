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

export interface Customer {
  _id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  status: 'active' | 'inactive' | 'suspended';
  erpType?: ERPTypeRef | string;
  versionNumber?: VersionNumberRef | string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  companyName: string;
  contactPerson: string;
  email: string;
  password: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  erpType?: string;
  versionNumber?: string;
}

export interface UpdateCustomerData {
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: 'active' | 'inactive' | 'suspended';
  erpType?: string;
  versionNumber?: string;
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
}
