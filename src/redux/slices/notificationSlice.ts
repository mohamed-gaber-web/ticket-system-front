import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { notificationApi } from '@/api/notificationApi';
import type {
  Notification,
  NotificationListParams,
  NotificationUserType,
} from '@/types/notification.types';

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params: NotificationListParams, { rejectWithValue }) => {
    try {
      const response = await notificationApi.getUserNotifications(params);
      return response.data || [];
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to load notifications';
      return rejectWithValue(message);
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (
    { userId, userType }: { userId: string; userType: NotificationUserType },
    { rejectWithValue }
  ) => {
    try {
      const response = await notificationApi.getUnreadCount(userId, userType);
      return typeof response.data === 'number' ? response.data : 0;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to load unread count';
      return rejectWithValue(message);
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markNotificationRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await notificationApi.markAsRead(notificationId);
      return notificationId;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to mark notification as read';
      return rejectWithValue(message);
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllNotificationsRead',
  async (
    { userId, userType }: { userId: string; userType: NotificationUserType },
    { rejectWithValue }
  ) => {
    try {
      await notificationApi.markAllAsRead(userId, userType);
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to mark all as read';
      return rejectWithValue(message);
    }
  }
);

export const clearReadNotifications = createAsyncThunk(
  'notifications/clearReadNotifications',
  async (
    { userId, userType }: { userId: string; userType: NotificationUserType },
    { rejectWithValue }
  ) => {
    try {
      await notificationApi.clearRead(userId, userType);
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to clear read notifications';
      return rejectWithValue(message);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(fetchUnreadCount.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        state.items = state.items.map((item) =>
          item._id === action.payload ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
        );
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items = state.items.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }));
        state.unreadCount = 0;
      })
      .addCase(clearReadNotifications.fulfilled, (state) => {
        state.items = state.items.filter((item) => !item.isRead);
      });
  },
});

export const { setUnreadCount } = notificationSlice.actions;
export default notificationSlice.reducer;

