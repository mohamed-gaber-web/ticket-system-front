export interface KpiSettings {
  _id?: string;
  resolvedPoints: number;
  nonDelayedBonus: number;
  delayedDeduction: number;
}

export interface KpiTicketItem {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  resolvedAt?: string | null;
  deliveryEstimationDate?: string | null;
  internalDeliveryDate?: string | null;
  isResolved: boolean;
  isDelayed: boolean;
  delayedDays: number;
  adminPoints: number | null;
  basePoints: number;
  calculatedPoints: number;
}

export interface KpiSummary {
  totalTickets: number;
  resolvedTickets: number;
  delayedTickets: number;
  nonDelayedTickets: number;
  basePoints: number;
  adminPoints: number;
  totalPoints: number;
}

export interface KpiResponse {
  success: boolean;
  consultant: { _id: string; firstName: string; lastName: string };
  period: { year: number; month: number };
  summary: KpiSummary;
  pointRules: KpiSettings;
  tickets: KpiTicketItem[];
}
