export interface ProductType {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductTypeData {
  name: string;
  isActive?: boolean;
}

export interface UpdateProductTypeData {
  name?: string;
  isActive?: boolean;
}

export interface ProductTypeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface ProductTypeResponse {
  success: boolean;
  message?: string;
  data: ProductType;
}

export interface ProductTypesResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  data: ProductType[];
}
