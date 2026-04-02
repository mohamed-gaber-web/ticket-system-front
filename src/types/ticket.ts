// Import reference types for new properties
import type { Environment } from './environment.types';
import type { Feature } from './feature.types';
import type { Department } from './department.types';
import type { ProductType } from './productType.types';
import type { ServiceType } from './serviceType.types';
import type { Scope } from './scope.types';
import type { Source } from './source.types';

export interface Customer {
  _id: string;
  companyName: string;
  email: string;
  contactPerson?: string;
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
  status: 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
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
  status: 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  sla?: string | SLA;
  assignedTeam?: string | Team;
  assignedBy?: string | Consultant;

  // NEW PROPERTIES - Reference fields for better categorization
  environment?: string | Environment;
  feature?: string | Feature;
  department?: string | Department;
  productType?: string | ProductType;
  serviceType?: string | ServiceType;
  scope?: string | Scope;
  source?: string | Source;
  // END NEW PROPERTIES

  acceptedBy?: string | Consultant; // Consultant who accepted the ticket
  acceptedAt?: string; // When the ticket was accepted
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  slaDueDate?: string;
  isSlaBreached: boolean;
  customerRating?: number;
  customerFeedback?: string;
  // Time tracking fields
  startDate?: string;
  endDate?: string;
  estimatedTime?: number; // in hours
  // Sub-ticket fields
  parentTicket?: string | Ticket;
  isSubTicket: boolean;
  subTickets?: Ticket[];
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
  startDate?: string;
  endDate?: string;
  estimatedTime?: number;
  // New optional properties
  environment?: string;
  feature?: string;
  department?: string;
  productType?: string;
  serviceType?: string;
  scope?: string;
  source?: string;
}

export interface CreateSubTicketData {
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  assignedTeam?: string;
  assignedBy?: string;
  estimatedTime?: number;
}

export interface SubTicketsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
}

export interface SubTicketsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  parentTicket: {
    id: string;
    ticketNumber: string;
    subject: string;
  };
  data: Ticket[];
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
  startDate?: string;
  endDate?: string;
  estimatedTime?: number;
  // New optional properties
  environment?: string;
  feature?: string;
  department?: string;
  productType?: string;
  serviceType?: string;
  scope?: string;
  source?: string;
}

export interface TicketQueryParams {
  status?: string;
  priority?: string;
  customer?: string;
  assignedTeam?: string;
  page?: number;
  limit?: number;
  search?: string;
  // New filter parameters
  environment?: string;
  feature?: string;
  department?: string;
  productType?: string;
  serviceType?: string;
  scope?: string;
  source?: string;
  // Advanced search filters
  startDate?: string;
  endDate?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
  closedDateFrom?: string;
  closedDateTo?: string;
  acceptedBy?: string;
  customerName?: string;
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
