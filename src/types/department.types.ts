// Department entity interface
export interface Department {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Create department DTO
export interface CreateDepartmentDto {
  name: string;
  isActive?: boolean;
}

// Update department DTO
export interface UpdateDepartmentDto {
  name?: string;
  isActive?: boolean;
}

// Query parameters for filtering and pagination
export interface DepartmentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

// API response for list
export interface DepartmentResponse {
  departments?: Department[];
  data?: Department[];
  total: number;
  page: number;
  totalPages: number;
  count?: number;
}
