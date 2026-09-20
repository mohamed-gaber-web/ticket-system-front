import api from './axiosConfig';
import type {
  MeetingsListResponse, MeetingResponse, MeetingQueryParams, SaveMeetingData, MeetingStatusData,
  MeetingPeopleOption, MeetingContacts,
} from '@/types/meeting.types';

export const getMeetings = async (params?: MeetingQueryParams): Promise<MeetingsListResponse> => {
  const response = await api.get('/meetings', { params });
  return response.data;
};

export const getMeetingPeople = async (): Promise<{ success: boolean; data: MeetingPeopleOption[] }> => {
  const response = await api.get('/meetings/people');
  return response.data;
};

export const getMeetingContacts = async (): Promise<{ success: boolean; data: MeetingContacts }> => {
  const response = await api.get('/meetings/contacts');
  return response.data;
};

export const getMeetingById = async (id: string): Promise<MeetingResponse> => {
  const response = await api.get(`/meetings/${id}`);
  return response.data;
};

export const createMeeting = async (data: SaveMeetingData): Promise<MeetingResponse> => {
  const response = await api.post('/meetings', data);
  return response.data;
};

export const updateMeeting = async (id: string, data: Partial<SaveMeetingData>): Promise<MeetingResponse> => {
  const response = await api.patch(`/meetings/${id}`, data);
  return response.data;
};

export const updateMeetingStatus = async (id: string, data: MeetingStatusData): Promise<MeetingResponse> => {
  const response = await api.patch(`/meetings/${id}/status`, data);
  return response.data;
};

export const deleteMeeting = async (id: string): Promise<void> => {
  await api.delete(`/meetings/${id}`);
};
