export interface Source {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSourceData {
  name: string;
  description: string;
  isActive?: boolean;
}

export interface UpdateSourceData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface SourceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface SourceResponse {
  success: boolean;
  message?: string;
  data: Source;
}

export interface SourcesResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Source[];
}
