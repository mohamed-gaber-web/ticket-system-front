export interface Company {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyData {
  name: string;
  description: string;
  isActive?: boolean;
}

export interface UpdateCompanyData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CompanyQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CompanyResponse {
  success: boolean;
  message?: string;
  data: Company;
}

export interface CompaniesResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Company[];
}
