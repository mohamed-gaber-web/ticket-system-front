import type {
  CreateTicketData,
  UpdateTicketData,
  TicketQueryParams,
  TicketResponse,
  TicketsResponse,
  CreateSubTicketData,
  SubTicketsQueryParams,
  SubTicketsResponse
} from "@/types/ticket";
import api from './axiosConfig';

// Get all tickets
export const getTickets = async (params?: TicketQueryParams): Promise<TicketsResponse> => {
  const response = await api.get<TicketsResponse>('/tickets', {
    params,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  console.log('Get tickets API response:', response.data);
  return response.data;
};

// Get single ticket by ID
export const getTicketById = async (id: string): Promise<TicketResponse> => {
  const response = await api.get<TicketResponse>(`/tickets/${id}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Get tickets by status
export const getTicketsByStatus = async (status: string): Promise<TicketsResponse> => {
  const response = await api.get<TicketsResponse>(`/tickets/status/${status}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Get tickets by priority
export const getTicketsByPriority = async (priority: string): Promise<TicketsResponse> => {
  const response = await api.get<TicketsResponse>(`/tickets/priority/${priority}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Create new ticket
export const createTicket = async (payload: CreateTicketData): Promise<TicketResponse> => {
  console.log('Creating ticket with payload:', payload);
  const response = await api.post<TicketResponse>('/tickets', payload, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  console.log('Create ticket API response:', response.data);
  return response.data;
};

// Update ticket
export const updateTicket = async (id: string, payload: UpdateTicketData): Promise<TicketResponse> => {
  const response = await api.put<TicketResponse>(`/tickets/${id}`, payload, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

// Delete ticket
export const deleteTicket = async (id: string): Promise<void> => {
  await api.delete(`/tickets/${id}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
};

// Create sub-ticket
export const createSubTicket = async (parentId: string, payload: CreateSubTicketData): Promise<TicketResponse> => {
  console.log('Creating sub-ticket with payload:', payload);
  const response = await api.post<TicketResponse>(`/tickets/${parentId}/sub-ticket`, payload, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  console.log('Create sub-ticket API response:', response.data);
  return response.data;
};

// Get sub-tickets
export const getSubTickets = async (parentId: string, params?: SubTicketsQueryParams): Promise<SubTicketsResponse> => {
  const response = await api.get<SubTicketsResponse>(`/tickets/${parentId}/sub-tickets`, {
    params,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  console.log('Get sub-tickets API response:', response.data);
  return response.data;
};

// Accept ticket
export const acceptTicket = async (ticketId: string): Promise<TicketResponse> => {
  const response = await api.patch<TicketResponse>(`/tickets/${ticketId}/accept`, {}, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  console.log('Accept ticket API response:', response.data);
  return response.data;
};

// Close ticket
export const closeTicket = async (ticketId: string): Promise<TicketResponse> => {
  const response = await api.patch<TicketResponse>(`/tickets/${ticketId}`, { status: 'closed' }, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  console.log('Close ticket API response:', response.data);
  return response.data;
};
