import type { UserType } from './auth.types';

export interface CommentBy {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  contactPerson?: string;
}

export interface TicketComment {
  _id: string;
  ticket: string | {
    _id: string;
    ticketNumber: string;
    subject: string;
    status?: string;
  };
  commentText: string;
  commentByUserId: string;
  commentByUserType: UserType;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  commentBy?: CommentBy;
}

export interface CommentsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: TicketComment[];
}

export interface CommentResponse {
  success: boolean;
  message?: string;
  data: TicketComment;
}

export interface CreateCommentPayload {
  ticket: string;
  commentText: string;
  commentByUserId: string;
  commentByUserType: UserType;
  isInternal?: boolean;
}

export interface UpdateCommentPayload {
  commentText?: string;
  isInternal?: boolean;
}

export interface CommentQueryParams {
  ticket?: string;
  commentByUserType?: UserType;
  isInternal?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeInternal?: boolean;
}
