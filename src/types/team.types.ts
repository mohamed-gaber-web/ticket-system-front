// Team Type Definitions

// TeamMember reference (simplified)
export interface TeamMemberReference {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  phoneNumber?: string;
}

// Ticket reference (for assigned tickets)
export interface TicketReference {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

// Main Team interface
export interface Team {
  _id: string;
  teamName: string;
  department: string;
  teamLead: string | TeamMemberReference;
  specialization: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  members?: TeamMemberReference[];
  assignedTickets?: TicketReference[];
  workload?: number;
}

// Create Team Data
export interface CreateTeamData {
  teamName: string;
  department: string;
  teamLead?: string;
  specialization?: string;
  status?: 'active' | 'inactive';
}

// Update Team Data
export interface UpdateTeamData {
  teamName?: string;
  department?: string;
  teamLead?: string;
  specialization?: string;
  status?: 'active' | 'inactive';
}

// API Response Types
export interface TeamResponse {
  success: boolean;
  data: Team;
  message?: string;
}

export interface TeamsListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Team[];
}

// Query Parameters
export interface TeamQueryParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  department?: string;
  specialization?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Team Workload Data
export interface TeamWorkloadData {
  teamId: string;
  teamName: string;
  activeTickets: number;
  statusBreakdown: {
    new: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
}

export interface TeamWorkloadResponse {
  success: boolean;
  data: TeamWorkloadData;
}

// Team Members List Response
export interface TeamMembersListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: TeamMemberReference[];
}

// Delete Response
export interface DeleteTeamResponse {
  success: boolean;
  message: string;
  data: Record<string, never>;
}

// Error Response
export interface TeamErrorResponse {
  success: false;
  message: string;
  error?: string;
  errors?: string[];
}
