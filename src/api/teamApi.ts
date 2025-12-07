import type {
  CreateTeamData,
  DeleteTeamResponse,
  Team,
  TeamMembersListResponse,
  TeamQueryParams,
  TeamResponse,
  TeamsListResponse,
  TeamWorkloadResponse,
  UpdateTeamData,
} from '@/types/team.types';
import api from './axiosConfig';

// Get all teams
export const getTeams = async (params?: TeamQueryParams): Promise<TeamsListResponse> => {
  const response = await api.get<TeamsListResponse>('/teams', { params });
  return response.data;
};

// Get single team by ID
export const getTeamById = async (id: string): Promise<TeamResponse> => {
  const response = await api.get<TeamResponse>(`/teams/${id}`);
  return response.data;
};

// Create new team
export const createTeam = async (data: CreateTeamData): Promise<TeamResponse> => {
  const response = await api.post<TeamResponse>('/teams', data);
  return response.data;
};

// Update team
export const updateTeam = async (id: string, data: UpdateTeamData): Promise<TeamResponse> => {
  const response = await api.put<TeamResponse>(`/teams/${id}`, data);
  return response.data;
};

// Delete team
export const deleteTeam = async (id: string): Promise<DeleteTeamResponse> => {
  const response = await api.delete<DeleteTeamResponse>(`/teams/${id}`);
  return response.data;
};

// Get team members
export const getTeamMembers = async (
  id: string,
  params?: { page?: number; limit?: number; status?: string }
): Promise<TeamMembersListResponse> => {
  const response = await api.get<TeamMembersListResponse>(`/teams/${id}/members`, { params });
  return response.data;
};

// Get team workload
export const getTeamWorkload = async (id: string): Promise<TeamWorkloadResponse> => {
  const response = await api.get<TeamWorkloadResponse>(`/teams/${id}/workload`);
  return response.data;
};

// Get teams by department
export const getTeamsByDepartment = async (
  department: string,
  params?: { page?: number; limit?: number }
): Promise<TeamsListResponse> => {
  const response = await api.get<TeamsListResponse>(`/teams/department/${department}`, { params });
  return response.data;
};

// Get active teams
export const getActiveTeams = async (params?: { page?: number; limit?: number }): Promise<TeamsListResponse> => {
  const response = await api.get<TeamsListResponse>('/teams/status/active', { params });
  return response.data;
};
