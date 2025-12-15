export interface Scope {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScopeData {
  name: string;
  isActive?: boolean;
}

export interface UpdateScopeData {
  name?: string;
  isActive?: boolean;
}

export interface ScopeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface ScopeResponse {
  success: boolean;
  message?: string;
  data: Scope;
}

export interface ScopesResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  data: Scope[];
}
