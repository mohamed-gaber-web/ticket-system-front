import api from './axiosConfig';
import type {
  CreateCountryData,
  UpdateCountryData,
  CountryQueryParams,
  CountryResponse,
  CountriesResponse,
} from '@/types/country.types';

export const getCountries = async (params?: CountryQueryParams): Promise<CountriesResponse> => {
  const response = await api.get('/countries', { params });
  return response.data;
};

export const getCountryById = async (id: string): Promise<CountryResponse> => {
  const response = await api.get(`/countries/${id}`);
  return response.data;
};

export const createCountry = async (data: CreateCountryData): Promise<CountryResponse> => {
  const response = await api.post('/countries', data);
  return response.data;
};

export const updateCountry = async (
  id: string,
  data: UpdateCountryData
): Promise<CountryResponse> => {
  const response = await api.patch(`/countries/${id}`, data);
  return response.data;
};

export const deleteCountry = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/countries/${id}`);
  return response.data;
};

export const toggleCountryStatus = async (id: string): Promise<CountryResponse> => {
  const response = await api.patch(`/countries/${id}/toggle-status`);
  return response.data;
};
