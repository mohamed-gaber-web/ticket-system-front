export interface CustomizedSolution {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomizedSolutionData {
  name: string;
  isActive?: boolean;
}

export interface UpdateCustomizedSolutionData {
  name?: string;
  isActive?: boolean;
}

export interface CustomizedSolutionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CustomizedSolutionResponse {
  success: boolean;
  message?: string;
  data: CustomizedSolution;
}

export interface CustomizedSolutionsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  data: CustomizedSolution[];
}
