import type { Consultant } from './consultant.types';

export interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
}

export interface Team {
  _id: string;
  teamName: string;
  department: string;
}

export interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ConsultantAssignment {
  consultant: Consultant;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  assignedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface TicketAssignment {
  _id: string;
  ticket: Ticket;
  assignedToTeam: Team;
  assignedByConsultant: Consultant;
  acceptedBy?: TeamMember;
  assignmentNotes?: string;
  assignedToConsultants: ConsultantAssignment[];
  assignedAt: string;
  acceptedAt?: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentQueryParams {
  page?: number;
  limit?: number;
  ticket?: string;
  assignedToTeam?: string;
  assignedByConsultant?: string;
  acceptedBy?: string;
  isCurrent?: boolean;
}

export interface AssignmentListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: TicketAssignment[];
}

export interface TeamCount {
  _id: string;
  teamName: string;
  count: number;
}

export interface ConsultantCount {
  _id: string;
  consultantName: string;
  count: number;
}

export interface AssignmentStats {
  total: number;
  current: number;
  accepted: number;
  pendingAcceptance: number;
  byTeam: TeamCount[];
  byConsultant: ConsultantCount[];
}

export interface AssignmentStatsResponse {
  success: boolean;
  data: AssignmentStats;
}

export interface AssignmentHistoryResponse {
  success: boolean;
  data: TicketAssignment[];
}

export interface AssignmentResponse {
  success: boolean;
  message?: string;
  data: TicketAssignment;
}

export interface CreateAssignmentData {
  ticket: string;
  assignedToTeam?: string;
  assignedByConsultant: string;
  assignmentNotes?: string;
}

export interface ReassignTicketData {
  assignedToTeam: string;
  assignedByConsultant: string;
  assignmentNotes?: string;
}

export interface AssignConsultantsData {
  consultants: string[];
}

export interface UpdateConsultantStatusData {
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  notes?: string;
}

export interface ConsultantAssignmentsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  consultant: {
    id: string;
    name: string;
  };
  data: {
    ticket: {
      ticketNumber: string;
      subject: string;
    };
    status: string;
    assignedAt: string;
  }[];
}

export interface WeeklyTicketItem {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  estimationDays?: number;
  startDate?: string;
  deliveryEstimationDate?: string;
  acceptedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  assignedAt: string;
  completedAt?: string;
  assignmentStatus: 'pending' | 'accepted' | 'declined' | 'completed';
  // Consultant-only planning fields
  internalDeliveryDate?: string;
  durationHours?: number;
  scheduledWeek?: number;
  delayedDays?: number;
}

export interface ConsultantWeeklySummary {
  consultant: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  };
  totalTickets: number;
  resolvedCount: number;
  pendingCount: number;
  totalEstimatedDays: number;
  totalActualDays: number;
  totalActualHours: number;
  availableDaysInWeek: number;
  tickets: WeeklyTicketItem[];
}

export interface WeeklyReportResponse {
  success: boolean;
  weekStart: string;
  weekEnd: string;
  data: ConsultantWeeklySummary[];
}
