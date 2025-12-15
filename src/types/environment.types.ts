export interface Environment {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvironmentData {
  name: string;
  description: string;
  isActive?: boolean;
}

export interface UpdateEnvironmentData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface EnvironmentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface EnvironmentResponse {
  success: boolean;
  message?: string;
  data: Environment;
}

export interface EnvironmentsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Environment[];
}
