export interface IndustrySector {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIndustrySectorData {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateIndustrySectorData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface IndustrySectorQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface IndustrySectorResponse {
  success: boolean;
  message?: string;
  data: IndustrySector;
}

export interface IndustrySectorsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  totalPages: number;
  data: IndustrySector[];
}
