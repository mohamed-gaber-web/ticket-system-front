export interface Feature {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureData {
  name: string;
  isActive?: boolean;
}

export interface UpdateFeatureData {
  name?: string;
  isActive?: boolean;
}

export interface FeatureQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface FeatureResponse {
  success: boolean;
  message?: string;
  data: Feature;
}

export interface FeaturesResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  data: Feature[];
}
