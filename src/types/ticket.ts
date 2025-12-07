export interface Customer {
  _id: string;
  companyName: string;
  email: string;
}

export interface Category {
  _id: string;
  name: string;
  description: string;
}

export interface SLA {
  _id: string;
  name: string;
  responseTime: number;
  resolutionTime: number;
}

export interface Team {
  _id: string;
  teamName: string;
  department: string;
  specialization: string;
}

export interface Consultant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TicketComment {
  _id: string;
  ticket: string;
  user: string;
  userType: 'customer' | 'consultant' | 'team_member';
  content: string;
  createdAt: string;
}

export interface TicketAttachment {
  _id: string;
  ticket: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
}

export interface TicketStatusHistory {
  _id: string;
  ticket: string;
  status: 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  changedAt: string;
  changedBy: string;
}

export interface TicketAssignment {
  _id: string;
  ticket: string;
  assignedTo: string;
  assignedAt: string;
  assignedBy: string;
}

export interface Ticket {
  _id: string;
  ticketNumber: string;
  customer: string | Customer;
  subject: string;
  description: string;
  category: string | Category;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  sla?: string | SLA;
  assignedTeam?: string | Team;
  assignedBy?: string | Consultant;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  slaDueDate?: string;
  isSlaBreached: boolean;
  customerRating?: number;
  customerFeedback?: string;
  createdAt: string;
  updatedAt: string;
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
  statusHistory?: TicketStatusHistory[];
  assignments?: TicketAssignment[];
}

export interface CreateTicketData {
  ticketNumber: string;
  customer: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface UpdateTicketData {
  subject?: string;
  description?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  sla?: string;
  assignedTeam?: string;
  assignedBy?: string;
  customerRating?: number;
  customerFeedback?: string;
}

export interface TicketQueryParams {
  status?: string;
  priority?: string;
  customer?: string;
  assignedTeam?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface TicketResponse {
  success: boolean;
  message?: string;
  data: Ticket;
}

export interface TicketsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Ticket[];
}
