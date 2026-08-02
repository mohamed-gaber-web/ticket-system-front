export interface BusinessClassification {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessClassificationData {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateBusinessClassificationData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface BusinessClassificationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface BusinessClassificationResponse {
  success: boolean;
  message?: string;
  data: BusinessClassification;
}

export interface BusinessClassificationsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  totalPages: number;
  data: BusinessClassification[];
}
