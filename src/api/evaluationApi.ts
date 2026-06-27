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
