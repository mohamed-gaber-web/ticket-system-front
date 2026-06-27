export interface TicketMetrics {
  onTimeCount: number;
  earlyCount: number;
  lateCount: number;
  netPoints: number;
  totalTickets: number;
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
}

export interface EvaluationData {
  consultant: EvaluationConsultant;
  period: { year: number; month: number; label: string };
  adminScores: AdminScores;
  breakdown: EvaluationBreakdown;
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
  adminScores: Omit<AdminScores, 'notes'>;
}

export interface AllEvaluationsResponse {
  success: boolean;
  period: { year: number; month: number; label: string };
  count: number;
  data: ConsultantEvaluationRow[];
}

export interface EvaluationState {
  data: EvaluationData | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}
