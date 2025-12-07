import api from './axiosConfig';
import type {
  AssignmentListResponse,
  AssignmentStatsResponse,
  AssignmentHistoryResponse,
  AssignmentQueryParams,
} from '../types/assignment.types';

export const assignmentApi = {
  getAssignments: async (params?: AssignmentQueryParams): Promise<AssignmentListResponse> => {
    const response = await api.get<AssignmentListResponse>('/ticket-assignments', { params });
    return response.data;
  },

  getAssignmentStats: async (): Promise<AssignmentStatsResponse> => {
    const response = await api.get<AssignmentStatsResponse>('/ticket-assignments/stats');
    return response.data;
  },

  getTicketHistory: async (ticketId: string): Promise<AssignmentHistoryResponse> => {
    const response = await api.get<AssignmentHistoryResponse>(
      `/ticket-assignments/ticket/${ticketId}/history`
    );
    return response.data;
  },
};
