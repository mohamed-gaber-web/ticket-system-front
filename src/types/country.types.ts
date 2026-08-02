export interface Country {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCountryData {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCountryData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CountryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CountryResponse {
  success: boolean;
  message?: string;
  data: Country;
}

export interface CountriesResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  totalPages: number;
  data: Country[];
}
