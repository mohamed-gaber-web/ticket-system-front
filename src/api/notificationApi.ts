import api from './axiosConfig';
import type {
  Notification,
  NotificationListParams,
  NotificationUserType,
} from '@/types/notification.types';

const BASE = '/notifications';

export interface NotificationListResponse {
  success?: boolean;
  data?: Notification[] | { docs?: Notification[]; total?: number } | null;
  total?: number;
  docs?: Notification[];
  count?: number;
}

export const notificationApi = {
  async getUserNotifications(params: NotificationListParams) {
    const { userId, userType, limit = 10 } = params;
    const { data } = await api.get<NotificationListResponse>(
      `${BASE}/user/${userId}`,
      {
        params: { userType, limit },
      }
    );
    // Normalize possible shapes: {data: Notification[]} or {data:{docs:[]}} or {docs:[]}
    const payload = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.docs)
      ? data.docs
      : Array.isArray(data.data?.docs)
      ? data.data.docs
      : [];
    const total = Array.isArray(data.data) ? undefined : (data?.total ?? (typeof data.data === 'object' && data.data && 'total' in data.data ? data.data.total : undefined));
    return { success: data?.success ?? true, data: payload, total };
  },

  async markAsRead(notificationId: string) {
    const { data } = await api.patch<{ success: boolean }>(
      `${BASE}/${notificationId}/mark-read`
    );
    return data;
  },

  async markAllAsRead(userId: string, userType: NotificationUserType) {
    const { data } = await api.patch<{ success: boolean }>(
      `${BASE}/user/${userId}/mark-all-read`,
      { userType }
    );
    return data;
  },

  async clearRead(userId: string, userType: NotificationUserType) {
    const { data } = await api.delete<{ success: boolean }>(
      `${BASE}/user/${userId}/read`,
      {
        params: { userType },
      }
    );
    return data;
  },
};

