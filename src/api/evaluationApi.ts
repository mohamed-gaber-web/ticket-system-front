import api from './axiosConfig';
import type { AdminScores, AllEvaluationsResponse, EvaluationResponse } from '@/types/evaluation.types';

const monthParam = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}`;

export const getEvaluation = async (
  employeeId: string,
  year: number,
  month: number
): Promise<EvaluationResponse> => {
  const response = await api.get<EvaluationResponse>(
    `/evaluations/${employeeId}/${monthParam(year, month)}`
  );
  return response.data;
};

export const getAllEvaluations = async (
  year: number,
  month: number
): Promise<AllEvaluationsResponse> => {
  const response = await api.get<AllEvaluationsResponse>(
    `/evaluations/all/${monthParam(year, month)}`
  );
  return response.data;
};

/**
 * Combined evaluations for all consultants across one or more months.
 * Tickets are pooled across the selected months and admin scores averaged,
 * producing a single combined score/ranking per consultant for the period.
 */
export const getAllEvaluationsRange = async (
  months: { year: number; month: number }[]
): Promise<AllEvaluationsResponse> => {
  const monthsCsv = months.map((m) => monthParam(m.year, m.month)).join(',');
  const response = await api.get<AllEvaluationsResponse>('/evaluations/all', {
    params: { months: monthsCsv },
  });
  return response.data;
};

export const saveEvaluation = async (
  employeeId: string,
  year: number,
  month: number,
  data: Partial<AdminScores>
): Promise<{ success: boolean; data: AdminScores }> => {
  const response = await api.put(
    `/evaluations/${employeeId}/${monthParam(year, month)}`,
    data
  );
  return response.data;
};
