import type {
  CreateCategoryData,
  UpdateCategoryData,
  CategoryResponse,
  CategoriesResponse,
  CategoryQueryParams
} from "@/types/category";
import api from './axiosConfig';

// Get all categories
export const getCategories = async (params?: CategoryQueryParams): Promise<CategoriesResponse> => {
  const response = await api.get<CategoriesResponse>('/categories', {
    params,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  console.log('Get categories API response:', response.data);
  return response.data;
};

// Get single category by ID
export const getCategoryById = async (id: string): Promise<CategoryResponse> => {
  const response = await api.get<CategoryResponse>(`/categories/${id}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Create new category
export const createCategory = async (payload: CreateCategoryData): Promise<CategoryResponse> => {
  console.log('Creating category with payload:', payload);
  const response = await api.post<CategoryResponse>('/categories', payload, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Update category
export const updateCategory = async (id: string, payload: UpdateCategoryData): Promise<CategoryResponse> => {
  const response = await api.patch<CategoryResponse>(`/categories/${id}`, payload, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Delete category
export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
};
