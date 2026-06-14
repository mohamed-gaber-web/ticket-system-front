import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAppDispatch } from './hooks';
import { useAuth } from './useAuth';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { fetchNotifications, notificationReceived } from '@/redux/slices/notificationSlice';
import type { Notification } from '@/types/notification.types';

/**
 * Opens the authenticated socket for the logged-in user, keeps the Redux
 * notification store in sync with pushed events, and fires a toast for each
 * new notification. Mount once for the whole authenticated session.
 */
export const useNotificationSocket = () => {
  const dispatch = useAppDispatch();
  const { user, userType } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!user?._id || !userType || !token) return;

    const socket = connectSocket(token);

    const onNew = (n: Notification) => {
      dispatch(notificationReceived(n));
      toast(n.message);
    };

    socket.on('notification:new', onNew);

    // Baseline the notification list whenever the connection (re)establishes
    dispatch(fetchNotifications({ userId: user._id, userType, limit: 50 }));

    return () => {
      socket.off('notification:new', onNew);
    };
  }, [dispatch, user?._id, userType]);

  // Tear the socket down entirely when the user logs out / unmounts
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);
};
