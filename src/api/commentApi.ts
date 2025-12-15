import api from './axiosConfig';
import type {
  TicketComment,
  CommentsResponse,
  CommentResponse,
  CreateCommentPayload,
  UpdateCommentPayload,
  CommentQueryParams,
} from '@/types/comment.types';

const COMMENT_API_BASE = '/ticket-comments';

export const getTicketComments = async (
  ticketId: string,
  params?: CommentQueryParams
): Promise<CommentsResponse> => {
  const response = await api.get<CommentsResponse>(
    `${COMMENT_API_BASE}/ticket/${ticketId}`,
    { params }
  );
  return response.data;
};

export const getPublicComments = async (
  ticketId: string,
  params?: { page?: number; limit?: number }
): Promise<CommentsResponse> => {
  const response = await api.get<CommentsResponse>(
    `${COMMENT_API_BASE}/ticket/${ticketId}/public`,
    { params }
  );
  return response.data;
};

export const getInternalComments = async (
  ticketId: string,
  params?: { page?: number; limit?: number }
): Promise<CommentsResponse> => {
  const response = await api.get<CommentsResponse>(
    `${COMMENT_API_BASE}/ticket/${ticketId}/internal`,
    { params }
  );
  return response.data;
};

export const createComment = async (
  data: CreateCommentPayload
): Promise<CommentResponse> => {
  const response = await api.post<CommentResponse>(COMMENT_API_BASE, data);
  return response.data;
};

export const updateComment = async (
  commentId: string,
  data: UpdateCommentPayload
): Promise<CommentResponse> => {
  const response = await api.put<CommentResponse>(
    `${COMMENT_API_BASE}/${commentId}`,
    data
  );
  return response.data;
};

export const deleteComment = async (commentId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(
    `${COMMENT_API_BASE}/${commentId}`
  );
  return response.data;
};

export const getCommentById = async (commentId: string): Promise<CommentResponse> => {
  const response = await api.get<CommentResponse>(
    `${COMMENT_API_BASE}/${commentId}`
  );
  return response.data;
};

export const getCommentsByUserType = async (
  userType: 'customer' | 'consultant' | 'team_member',
  params?: { page?: number; limit?: number }
): Promise<CommentsResponse> => {
  const response = await api.get<CommentsResponse>(
    `${COMMENT_API_BASE}/user-type/${userType}`,
    { params }
  );
  return response.data;
};

export const getAllComments = async (params?: CommentQueryParams): Promise<CommentsResponse> => {
  const response = await api.get<CommentsResponse>(COMMENT_API_BASE, { params });
  return response.data;
};
