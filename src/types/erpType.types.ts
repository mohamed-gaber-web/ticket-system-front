export interface ErpType {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErpTypeDto {
  name: string;
  isActive?: boolean;
}

export interface UpdateErpTypeDto {
  name?: string;
  isActive?: boolean;
}

export interface ErpTypeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface ErpTypeResponse {
  erpTypes: ErpType[];
  total: number;
  page: number;
  totalPages: number;
}
