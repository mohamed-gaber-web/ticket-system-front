import api from './axiosConfig';
import type { SendWhatsAppData, WhatsAppChat, WhatsAppMessage, WhatsAppSession } from '@/types/whatsapp.types';

// WhatsApp through the employee's own linked number — /api/whatsapp.
// Live updates (QR, new messages, ticks) come over socket.io: see useWhatsAppSocket.

export const getWhatsAppSession = (): Promise<{ success: boolean; data: WhatsAppSession }> =>
  api.get('/whatsapp/session').then((r) => r.data);

export const connectWhatsApp = (): Promise<{ success: boolean; data: WhatsAppSession }> =>
  api.post('/whatsapp/session/connect').then((r) => r.data);

export const logoutWhatsApp = (): Promise<{ success: boolean }> =>
  api.post('/whatsapp/session/logout').then((r) => r.data);

export const getWhatsAppChats = (params: { search?: string; employee?: string } = {}): Promise<{ success: boolean; data: WhatsAppChat[] }> =>
  api.get('/whatsapp/chats', { params }).then((r) => r.data);

export const getWhatsAppMessages = (
  phone: string,
  params: { before?: string; limit?: number; employee?: string } = {},
): Promise<{ success: boolean; data: WhatsAppMessage[]; hasMore: boolean }> =>
  api.get(`/whatsapp/chats/${phone}/messages`, { params }).then((r) => r.data);

export const markWhatsAppChatRead = (phone: string) => api.post(`/whatsapp/chats/${phone}/read`).then((r) => r.data);

export const sendWhatsApp = (data: SendWhatsAppData): Promise<{ success: boolean; data: WhatsAppMessage }> =>
  api.post('/whatsapp/send', data).then((r) => r.data);

/** Media of a message as a blob (auth header is added by the axios interceptor). */
export const getWhatsAppMedia = (messageId: string): Promise<Blob> =>
  api.get(`/whatsapp/media/${messageId}`, { responseType: 'blob' }).then((r) => r.data);
