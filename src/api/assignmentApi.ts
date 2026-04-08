import api from './axiosConfig';
import type {
  AssignmentListResponse,
  AssignmentStatsResponse,
  AssignmentHistoryResponse,
  AssignmentQueryParams,
  AssignmentResponse,
  CreateAssignmentData,
  ReassignTicketData,
  AssignConsultantsData,
  UpdateConsultantStatusData,
  ConsultantAssignmentsResponse,
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

  createAssignment: async (data: CreateAssignmentData): Promise<AssignmentResponse> => {
    const response = await api.post<AssignmentResponse>('/ticket-assignments', data);
    return response.data;
  },

  acceptAssignment: async (assignmentId: string, teamMemberId: string): Promise<AssignmentResponse> => {
    const response = await api.patch<AssignmentResponse>(
      `/ticket-assignments/${assignmentId}/accept`,
      { teamMemberId }
    );
    return response.data;
  },

  getCurrentAssignment: async (ticketId: string): Promise<AssignmentResponse> => {
    const response = await api.get<AssignmentResponse>(
      `/ticket-assignments/ticket/${ticketId}/current`
    );
    return response.data;
  },

  getAssignmentsByTeam: async (teamId: string, params?: AssignmentQueryParams): Promise<AssignmentListResponse> => {
    const response = await api.get<AssignmentListResponse>(
      `/ticket-assignments/team/${teamId}`,
      { params }
    );
    return response.data;
  },

  getAssignmentsByTeamMember: async (memberId: string, params?: AssignmentQueryParams): Promise<AssignmentListResponse> => {
    const response = await api.get<AssignmentListResponse>(
      `/ticket-assignments/team-member/${memberId}`,
      { params }
    );
    return response.data;
  },

  reassignTicket: async (assignmentId: string, data: ReassignTicketData): Promise<AssignmentResponse> => {
    const response = await api.post<AssignmentResponse>(
      `/ticket-assignments/${assignmentId}/reassign`,
      data
    );
    return response.data;
  },

  updateAssignment: async (assignmentId: string, assignmentNotes: string): Promise<AssignmentResponse> => {
    const response = await api.put<AssignmentResponse>(
      `/ticket-assignments/${assignmentId}`,
      { assignmentNotes }
    );
    return response.data;
  },

  // Multi-consultant assignment APIs
  reassignConsultants: async (
    assignmentId: string,
    data: AssignConsultantsData & { notes?: string }
  ): Promise<AssignmentResponse> => {
    const response = await api.post<AssignmentResponse>(
      `/ticket-assignments/${assignmentId}/reassign-consultants`,
      data
    );
    return response.data;
  },

  assignConsultants: async (assignmentId: string, data: AssignConsultantsData): Promise<AssignmentResponse> => {
    const response = await api.post<AssignmentResponse>(
      `/ticket-assignments/${assignmentId}/assign-consultants`,
      data
    );
    return response.data;
  },

  updateConsultantStatus: async (
    assignmentId: string,
    consultantId: string,
    data: UpdateConsultantStatusData
  ): Promise<AssignmentResponse> => {
    const response = await api.patch<AssignmentResponse>(
      `/ticket-assignments/${assignmentId}/consultant/${consultantId}/status`,
      data
    );
    return response.data;
  },

  removeConsultant: async (assignmentId: string, consultantId: string): Promise<AssignmentResponse> => {
    const response = await api.delete<AssignmentResponse>(
      `/ticket-assignments/${assignmentId}/consultant/${consultantId}`
    );
    return response.data;
  },

  getConsultantAssignments: async (
    consultantId: string,
    params?: { page?: number; limit?: number; status?: string }
  ): Promise<ConsultantAssignmentsResponse> => {
    const response = await api.get<ConsultantAssignmentsResponse>(
      `/ticket-assignments/consultant/${consultantId}`,
      { params }
    );
    return response.data;
  },
};
