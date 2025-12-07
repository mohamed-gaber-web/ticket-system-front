// Team Member Type Definitions

export type TeamMemberRole = 'team_lead' | 'senior_member' | 'member' | 'support_agent';
export type TeamMemberStatus = 'active' | 'inactive' | 'on_leave';

// Main Team Member interface
export interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  phoneNumber?: string; // Alternative field name for compatibility
  role: string | TeamMemberRole;
  status: string | TeamMemberStatus;
  team?: string | { _id: string; teamName: string }; // Reference to Team
  fullName?: string;
  specialization?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// Query Parameters
export interface TeamMemberQueryParams {
  page?: number;
  limit?: number;
  status?: TeamMemberStatus | string;
  role?: TeamMemberRole | string;
  team?: string; // Team ID filter
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Response Types
export interface TeamMemberListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: TeamMember[];
}

export interface TeamMemberResponse {
  success: boolean;
  data: TeamMember;
  message?: string;
}

// Create Team Member Data
export interface CreateTeamMemberData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  phoneNumber?: string;
  role: TeamMemberRole | string;
  status?: TeamMemberStatus | string;
  team?: string; // Team ID
  specialization?: string;
}

// Update Team Member Data
export interface UpdateTeamMemberData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  role?: TeamMemberRole | string;
  status?: TeamMemberStatus | string;
  team?: string; // Team ID
  specialization?: string;
}

// Team Member Stats
export interface TeamMemberStats {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  byRole: RoleCount[];
  byTeam: TeamCount[];
}

export interface RoleCount {
  _id: TeamMemberRole | string;
  count: number;
}

export interface TeamCount {
  _id: string;
  teamName: string;
  count: number;
}

export interface TeamMemberStatsResponse {
  success: boolean;
  data: TeamMemberStats;
}

// Delete Response
export interface DeleteTeamMemberResponse {
  success: boolean;
  message: string;
}

// Error Response
export interface TeamMemberErrorResponse {
  success: false;
  message: string;
  error?: string;
  errors?: string[];
}
