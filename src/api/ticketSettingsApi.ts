import api from './axiosConfig';
import type { TicketSettings, UpdateTicketSettingsData } from '@/types/ticket';

const noCache = { headers: { 'Cache-Control': 'no-cache' } };

type SettingsBody = TicketSettings | { success?: boolean; data: TicketSettings };

/** The API wraps payloads in `{ success, data }`; accept a bare object too. */
const unwrap = (body: SettingsBody): TicketSettings => ('data' in body ? body.data : body);

/** Who may see R&D tickets — employees only (customers never call this). */
export const getTicketSettings = async (): Promise<TicketSettings> =>
  unwrap((await api.get<SettingsBody>('/ticket-settings', noCache)).data);

/** Admin only: choose the R&D department (`null` = admins only). */
export const updateTicketSettings = async (payload: UpdateTicketSettingsData): Promise<TicketSettings> =>
  unwrap((await api.put<SettingsBody>('/ticket-settings', payload)).data);
