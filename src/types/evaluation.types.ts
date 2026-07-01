export interface TicketMetrics {
  onTimeCount: number;
  earlyCount: number;
  lateCount: number;
  netPoints: number;
  totalTickets: number;
  /** Counted main tickets (isSubTicket === false). */
  mainTickets: number;
  /** Counted sub-tickets (isSubTicket === true). */
  subTickets: number;
  performancePercentage: number;
  contribution: number;
}

export interface KpiItem {
  label: string;
  weight: number;
  achieved: number;
}

export interface TicketKpiItem extends KpiItem {
  details: TicketMetrics;
}

export interface CertKpiItem extends KpiItem {
  hasCertification: boolean;
}

export interface ScoreKpiItem extends KpiItem {
  score: number;
}

export interface EvaluationBreakdown {
  ticketPerformance: TicketKpiItem;
  certification: CertKpiItem;
  clientPunctuality: ScoreKpiItem;
  managerEvaluation: ScoreKpiItem;
  studyingModule: ScoreKpiItem;
  aiSolutions: ScoreKpiItem;
}

export interface AdminScores {
  hasCertification: boolean;
  clientPunctualityScore: number;
  managerEvaluationScore: number;
  studyingModuleScore: number;
  aiSolutionsScore: number;
  notes: string;
}

export interface EvaluationConsultant {
  _id: string;
  firstName: string;
  lastName: string;
  position?: string | null;
  role: string;
  profilePicture?: string | null;
}

export type TicketCategory = 'early' | 'onTime' | 'late' | null;

export interface EvaluationTicketDetail {
  _id: string;
  ticketNumber: number | string | null;
  subject: string;
  status: string;
  deadline: string | null;
  resolvedDate: string | null;
  /** null = not counted (no delivery date / still within deadline). */
  category: TicketCategory;
  counted: boolean;
  points: number;
  /** true = sub-ticket, false = main ticket. */
  isSubTicket: boolean;
  parentTicket?: string | null;
}

export interface EvaluationData {
  consultant: EvaluationConsultant;
  period: { year: number; month: number; label: string };
  adminScores: AdminScores;
  breakdown: EvaluationBreakdown;
  tickets?: EvaluationTicketDetail[];
  totalScore: number;
}

export interface EvaluationResponse {
  success: boolean;
  data: EvaluationData;
}

export interface ConsultantEvaluationRow {
  consultant: EvaluationConsultant;
  totalScore: number;
  breakdown: EvaluationBreakdown;
  ticketCount: number;
  /** Number of selected months that have a stored admin evaluation. */
  monthsEvaluated?: number;
  adminScores: Omit<AdminScores, 'notes'>;
}

export interface EvaluationPeriod {
  label: string;
  /** Present on single-month responses (legacy /all/:month). */
  year?: number;
  month?: number;
  /** Present on multi-month responses (/all?months=…). */
  months?: { year: number; month: number }[];
}

export interface AllEvaluationsResponse {
  success: boolean;
  period: EvaluationPeriod;
  count: number;
  data: ConsultantEvaluationRow[];
}

export interface EvaluationState {
  data: EvaluationData | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}
