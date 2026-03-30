import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  clearReadNotifications,
} from '@/redux/slices/notificationSlice';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useAuth } from '@/redux/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Check, Trash2, Bell, Info } from 'lucide-react';
import type { NotificationType } from '@/types/notification.types';

interface NotificationDropdownProps {
  isOpen: boolean;
  excludeTypes?: NotificationType[];
}

export function NotificationDropdown({ isOpen, excludeTypes = [] }: NotificationDropdownProps) {
  const dispatch = useAppDispatch();
  const { user, userType } = useAuth();
  const { items, loading, error } = useAppSelector((state) => state.notifications);

  const userId = user?._id;
  const filteredItems = items.filter((item) => !excludeTypes.includes(item.notificationType));
  const filteredUnread = filteredItems.filter((item) => !item.isRead).length;

  useEffect(() => {
    if (isOpen && userId && userType) {
      dispatch(fetchNotifications({ userId, userType, limit: 10 }));
      dispatch(fetchUnreadCount({ userId, userType }));
    }
  }, [dispatch, isOpen, userId, userType]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleMarkAllRead = async () => {
    if (!userId || !userType) return;
    try {
      await dispatch(markAllNotificationsRead({ userId, userType })).unwrap();
      toast.success('All notifications marked as read');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark all as read';
      toast.error(message);
    }
  };

  const handleClearRead = async () => {
    if (!userId || !userType) return;
    try {
      await dispatch(clearReadNotifications({ userId, userType })).unwrap();
      toast.success('Read notifications cleared');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear read notifications';
      toast.error(message);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await dispatch(markNotificationRead(id)).unwrap();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update notification';
      toast.error(message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          role="region"
          aria-label="Notifications"
          className="absolute right-0 mt-3 w-[320px] max-w-[90vw] sm:w-96 rounded-[1rem] glass shadow-ambient z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
            <div>
              <p className="text-sm font-semibold text-on-surface">Notifications</p>
              <p className="text-xs text-on-surface-variant">
                {filteredUnread > 0 ? `${filteredUnread} unread` : 'You are all caught up'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={loading || filteredUnread === 0} aria-label="Mark all notifications as read">
                <Check className="h-4 w-4 mr-1" aria-hidden="true" />
                Mark all read
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearRead} disabled={loading} aria-label="Clear read notifications">
                <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                Clear read
              </Button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-6 text-on-surface-variant">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading notifications...
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
                <Bell className="h-6 w-6 mb-2" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs text-on-surface-variant/60">You’ll see updates about your tickets here</p>
              </div>
            )}

            {!loading &&
              filteredItems.map((item) => (
                <div
                  key={item._id}
                  className={`px-4 py-3 border-b border-outline-variant/10 last:border-b-0 hover:bg-surface-container-highest transition ${
                    !item.isRead ? 'bg-primary-fixed/30' : ''
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-on-surface-variant capitalize">
                          {item.notificationType.replace(/_/g, ' ')}
                        </span>
                        {!item.isRead && <span className="h-2 w-2 rounded-full bg-brand-500 inline-block" />}
                      </div>
                      <p className="text-sm text-on-surface mt-1 break-words">{item.message}</p>
                      {item.ticket && (
                        <p className="text-xs text-on-surface-variant mt-1">
                          Ticket {item.ticket.ticketNumber || item.ticket._id} • {item.ticket.status || '—'} •{' '}
                          {item.ticket.priority || '—'}
                        </p>
                      )}
                      <p className="text-xs text-on-surface-variant/60 mt-1">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!item.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start"
                        onClick={() => handleMarkSingleRead(item._id)}
                        aria-label="Mark this notification as read"
                      >
                        <Info className="h-4 w-4 mr-1" aria-hidden="true" />
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

