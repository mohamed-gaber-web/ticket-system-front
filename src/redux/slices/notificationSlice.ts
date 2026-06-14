import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { notificationApi } from '@/api/notificationApi';
import type { Notification, NotificationListParams, NotificationUserType } from '@/types/notification.types';

interface NotificationState {
  items: Notification[];
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  items: [],
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
    // Real-time: a notification pushed over the socket. Dedupe by _id so a
    // socket event followed by a refetch (or a second tab) can't double-count.
    notificationReceived: (state, action: PayloadAction<Notification>) => {
      if (state.items.some((n) => n._id === action.payload._id)) return;
      state.items.unshift(action.payload);
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
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        state.items = state.items.map((item) =>
          item._id === action.payload ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
        );
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items = state.items.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
        }));
      })
      .addCase(clearReadNotifications.fulfilled, (state) => {
        state.items = state.items.filter((item) => !item.isRead);
      });
  },
});

export const { notificationReceived } = notificationSlice.actions;
export default notificationSlice.reducer;
