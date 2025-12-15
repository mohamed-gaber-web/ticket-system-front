export interface ServiceType {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceTypeDto {
  name: string;
  isActive?: boolean;
}

export interface UpdateServiceTypeDto {
  name?: string;
  isActive?: boolean;
}

export interface ServiceTypeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface ServiceTypeResponse {
  serviceTypes: ServiceType[];
  total: number;
  page: number;
  totalPages: number;
}
