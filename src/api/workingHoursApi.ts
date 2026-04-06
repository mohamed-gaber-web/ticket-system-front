import api from './axiosConfig';
import type {
  WorkingHoursResponse,
  HolidaysResponse,
  HolidayResponse,
  UpdateWorkingHoursData,
  CreateHolidayData,
} from '@/types/workingHours.types';

export const getWorkingHours = async (): Promise<WorkingHoursResponse> => {
  const response = await api.get<WorkingHoursResponse>('/working-hours');
  return response.data;
};

export const updateWorkingHours = async (
  data: UpdateWorkingHoursData
): Promise<WorkingHoursResponse> => {
  const response = await api.put<WorkingHoursResponse>('/working-hours', data);
  return response.data;
};

export const getHolidays = async (): Promise<HolidaysResponse> => {
  const response = await api.get<HolidaysResponse>('/working-hours/holidays');
  return response.data;
};

export const addHoliday = async (data: CreateHolidayData): Promise<HolidayResponse> => {
  const response = await api.post<HolidayResponse>('/working-hours/holidays', data);
  return response.data;
};

export const addHolidaysBulk = async (
  holidays: CreateHolidayData[]
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/working-hours/holidays/bulk', { holidays });
  return response.data;
};

export const deleteHoliday = async (id: string): Promise<void> => {
  await api.delete(`/working-hours/holidays/${id}`);
};
