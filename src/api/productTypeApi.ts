import api from './axiosConfig';
import type {
  CreateProductTypeData,
  UpdateProductTypeData,
  ProductTypeQueryParams,
  ProductTypeResponse,
  ProductTypesResponse,
} from '@/types/productType.types';

/**
 * Get all product types with optional filtering and pagination
 */
export const getProductTypes = async (params?: ProductTypeQueryParams): Promise<ProductTypesResponse> => {
  const response = await api.get('/product-types', { params });
  return response.data;
};

/**
 * Get a single product type by ID
 */
export const getProductTypeById = async (id: string): Promise<ProductTypeResponse> => {
  const response = await api.get(`/product-types/${id}`);
  return response.data;
};

/**
 * Create a new product type
 */
export const createProductType = async (data: CreateProductTypeData): Promise<ProductTypeResponse> => {
  const response = await api.post('/product-types', data);
  return response.data;
};

/**
 * Update an existing product type
 */
export const updateProductType = async (
  id: string,
  data: UpdateProductTypeData
): Promise<ProductTypeResponse> => {
  const response = await api.patch(`/product-types/${id}`, data);
  return response.data;
};

/**
 * Delete a product type
 */
export const deleteProductType = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/product-types/${id}`);
  return response.data;
};

/**
 * Toggle product type status (active/inactive)
 */
export const toggleProductTypeStatus = async (id: string): Promise<ProductTypeResponse> => {
  const response = await api.patch(`/product-types/${id}/toggle-status`);
  return response.data;
};
