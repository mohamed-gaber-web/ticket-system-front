import api from './axiosConfig';
import type { TasksListResponse, TaskResponse, CreateTaskData, UpdateTaskData, TaskQueryParams } from '@/types/task.types';

export const getTasks = async (params?: TaskQueryParams): Promise<TasksListResponse> => {
  const response = await api.get('/tasks', { params });
  return response.data;
};

export const getTaskById = async (id: string): Promise<TaskResponse> => {
  const response = await api.get(`/tasks/${id}`);
  return response.data;
};

export const createTask = async (data: CreateTaskData): Promise<TaskResponse> => {
  const response = await api.post('/tasks', data);
  return response.data;
};

export const updateTask = async (id: string, data: UpdateTaskData): Promise<TaskResponse> => {
  const response = await api.patch(`/tasks/${id}`, data);
  return response.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};
