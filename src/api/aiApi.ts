import api from './axiosConfig';
import type { Ticket, TicketQueryParams } from '@/types/ticket';

export interface AnalyzeTicketRequest {
  subject: string;
  description: string;
}

export interface AnalyzeTicketResponse {
  category: string;
  categoryId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  department: string;
  departmentId?: string;
  serviceType: string;
  serviceTypeId?: string;
  confidence: number;
}

export interface DraftReplyRequest {
  ticketSubject: string;
  ticketDescription: string;
  ticketStatus: string;
  previousComments: Array<{
    content: string;
    userType: string;
    createdAt: string;
  }>;
}

export interface DraftReplyResponse {
  draft: string;
}

export interface TicketInsightsResponse {
  summary: string;
  slaRisk: {
    level: 'low' | 'medium' | 'high';
    explanation: string;
  };
  nextAction: {
    action: string;
    rationale: string;
  };
}

export interface ParseSearchResponse extends Partial<TicketQueryParams> {
  interpretedQuery: string;
}

const AI_TIMEOUT = 45000;

export const analyzeTicket = async (payload: AnalyzeTicketRequest): Promise<AnalyzeTicketResponse> => {
  const response = await api.post<{ success: boolean; data: AnalyzeTicketResponse }>(
    '/ai/analyze-ticket',
    payload,
    { timeout: AI_TIMEOUT }
  );
  return response.data.data;
};

export const suggestDescription = async (subject: string): Promise<string> => {
  const response = await api.post<{ success: boolean; data: { suggestedDescription: string } }>(
    '/ai/suggest-description',
    { subject },
    { timeout: AI_TIMEOUT }
  );
  return response.data.data.suggestedDescription;
};

export const draftReply = async (payload: DraftReplyRequest): Promise<DraftReplyResponse> => {
  const response = await api.post<{ success: boolean; data: DraftReplyResponse }>(
    '/ai/draft-reply',
    payload,
    { timeout: AI_TIMEOUT }
  );
  return response.data.data;
};

export const getTicketInsights = async (ticket: Ticket): Promise<TicketInsightsResponse> => {
  const response = await api.post<{ success: boolean; data: TicketInsightsResponse }>(
    '/ai/ticket-insights',
    { ticket },
    { timeout: AI_TIMEOUT }
  );
  return response.data.data;
};

export const parseSearch = async (query: string): Promise<ParseSearchResponse> => {
  const response = await api.post<{ success: boolean; data: ParseSearchResponse }>(
    '/ai/parse-search',
    { query },
    { timeout: AI_TIMEOUT }
  );
  return response.data.data;
};
