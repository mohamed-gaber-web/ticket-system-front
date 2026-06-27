import api from './axiosConfig';
import type { KpiResponse, KpiSettings } from '@/types/kpi.types';

export const getConsultantKpi = async (
  id: string,
  year: number,
  month: number
): Promise<KpiResponse> => {
  const res = await api.get<KpiResponse>(`/kpi/consultant/${id}`, {
    params: { year, month },
  });
  return res.data;
};

export const getKpiSettings = async (): Promise<{ success: boolean; data: KpiSettings }> => {
  const res = await api.get<{ success: boolean; data: KpiSettings }>('/kpi/settings');
  return res.data;
};

export const updateKpiSettings = async (
  data: Partial<KpiSettings>
): Promise<{ success: boolean; data: KpiSettings }> => {
  const res = await api.put<{ success: boolean; data: KpiSettings }>('/kpi/settings', data);
  return res.data;
};

export const setTicketAdminPoints = async (
  ticketId: string,
  points: number | null
): Promise<{ success: boolean; data: { _id: string; adminPoints: number | null } }> => {
  const res = await api.patch(`/tickets/${ticketId}/admin-points`, { points });
  return res.data;
};
