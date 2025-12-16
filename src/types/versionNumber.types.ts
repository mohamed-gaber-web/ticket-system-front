export interface VersionNumber {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVersionNumberDto {
  name: string;
  isActive?: boolean;
}

export interface UpdateVersionNumberDto {
  name?: string;
  isActive?: boolean;
}

export interface VersionNumberQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface VersionNumberResponse {
  data: VersionNumber[];
  total: number;
  page: number;
  totalPages: number;
  count: number;
}
