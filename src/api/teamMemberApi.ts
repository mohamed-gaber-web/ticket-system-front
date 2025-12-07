import type {
  CreateTeamMemberData,
  DeleteTeamMemberResponse,
  TeamMemberListResponse,
  TeamMemberQueryParams,
  TeamMemberResponse,
  TeamMemberStatsResponse,
  UpdateTeamMemberData,
} from '@/types/teamMember.types';
import api from './axiosConfig';

// Get all team members
export const getTeamMembers = async (params?: TeamMemberQueryParams): Promise<TeamMemberListResponse> => {
  const response = await api.get<TeamMemberListResponse>('/team-members', { params });
  return response.data;
};

// Get single team member by ID
export const getTeamMemberById = async (id: string): Promise<TeamMemberResponse> => {
  const response = await api.get<TeamMemberResponse>(`/team-members/${id}`);
  return response.data;
};

// Create new team member
export const createTeamMember = async (data: CreateTeamMemberData): Promise<TeamMemberResponse> => {
  const response = await api.post<TeamMemberResponse>('/team-members', data);
  return response.data;
};

// Update team member
export const updateTeamMember = async (id: string, data: UpdateTeamMemberData): Promise<TeamMemberResponse> => {
  const response = await api.put<TeamMemberResponse>(`/team-members/${id}`, data);
  return response.data;
};

// Delete team member
export const deleteTeamMember = async (id: string): Promise<DeleteTeamMemberResponse> => {
  const response = await api.delete<DeleteTeamMemberResponse>(`/team-members/${id}`);
  return response.data;
};

// Get team member statistics
export const getTeamMemberStats = async (): Promise<TeamMemberStatsResponse> => {
  const response = await api.get<TeamMemberStatsResponse>('/team-members/stats');
  return response.data;
};

// Get team members by team ID
export const getTeamMembersByTeam = async (teamId: string, params?: TeamMemberQueryParams): Promise<TeamMemberListResponse> => {
  const response = await api.get<TeamMemberListResponse>(`/team-members/team/${teamId}`, { params });
  return response.data;
};

// Get active team members
export const getActiveTeamMembers = async (params?: TeamMemberQueryParams): Promise<TeamMemberListResponse> => {
  const response = await api.get<TeamMemberListResponse>('/team-members', {
    params: { ...params, status: 'active' }
  });
  return response.data;
};
