import type {
  CreateTaskCategoryData,
  UpdateTaskCategoryData,
  TaskCategoryResponse,
  TaskCategoriesResponse,
  TaskCategoryQueryParams,
} from "@/types/taskCategory";
import api from './axiosConfig';

// Get all task categories
export const getTaskCategories = async (params?: TaskCategoryQueryParams): Promise<TaskCategoriesResponse> => {
  const response = await api.get<TaskCategoriesResponse>('/task-categories', {
    params,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Get single task category by ID
export const getTaskCategoryById = async (id: string): Promise<TaskCategoryResponse> => {
  const response = await api.get<TaskCategoryResponse>(`/task-categories/${id}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Create new task category
export const createTaskCategory = async (payload: CreateTaskCategoryData): Promise<TaskCategoryResponse> => {
  const response = await api.post<TaskCategoryResponse>('/task-categories', payload, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Update task category
export const updateTaskCategory = async (id: string, payload: UpdateTaskCategoryData): Promise<TaskCategoryResponse> => {
  const response = await api.patch<TaskCategoryResponse>(`/task-categories/${id}`, payload, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Delete task category
export const deleteTaskCategory = async (id: string): Promise<void> => {
  await api.delete(`/task-categories/${id}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
};
