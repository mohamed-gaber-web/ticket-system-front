import axiosInstance from './axiosConfig';

export interface TaskCommentImage {
  url: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  fileId?: string;
}

export interface TaskComment {
  _id: string;
  task: string;
  commentText: string;
  commentByUserId: string;
  commentByUserType: 'consultant' | 'team_member';
  images?: TaskCommentImage[];
  commentBy?: { firstName: string; lastName: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

export interface TaskCommentsResponse {
  success: boolean;
  total: number;
  data: TaskComment[];
}

export const getTaskComments = async (taskId: string, page = 1, limit = 50): Promise<TaskCommentsResponse> => {
  const res = await axiosInstance.get<TaskCommentsResponse>(`/task-comments/task/${taskId}`, { params: { page, limit } });
  return res.data;
};

export const createTaskComment = async (data: {
  task: string;
  commentText: string;
  images?: TaskCommentImage[];
}): Promise<TaskComment> => {
  const res = await axiosInstance.post<{ success: boolean; data: TaskComment }>('/task-comments', data);
  return res.data.data;
};

export const updateTaskComment = async (id: string, commentText: string): Promise<TaskComment> => {
  const res = await axiosInstance.put<{ success: boolean; data: TaskComment }>(`/task-comments/${id}`, { commentText });
  return res.data.data;
};

export const deleteTaskComment = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/task-comments/${id}`);
};
