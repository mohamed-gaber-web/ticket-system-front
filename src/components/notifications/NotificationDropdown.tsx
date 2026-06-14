import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  clearReadNotifications,
} from '@/redux/slices/notificationSlice';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useAuth } from '@/redux/hooks/useAuth';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCheck,
  Trash2,
  Bell,
  BellRing,
  Ticket,
  UserPlus,
  Repeat,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Plane,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/types/notification.types';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose?: () => void;
  excludeTypes?: NotificationType[];
}

// Icon + colour treatment per notification type. The colour is a soft tinted
// chip (text + 10% background) so the list stays calm and scannable.
const TYPE_STYLES: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  new_ticket: { icon: Ticket, className: 'text-blue-600 bg-blue-500/10' },
  ticket_assigned: { icon: UserPlus, className: 'text-indigo-600 bg-indigo-500/10' },
  ticket_reassigned: { icon: Repeat, className: 'text-violet-600 bg-violet-500/10' },
  status_change: { icon: RefreshCw, className: 'text-sky-600 bg-sky-500/10' },
  new_comment: { icon: MessageSquare, className: 'text-cyan-600 bg-cyan-500/10' },
  sla_alert: { icon: AlertTriangle, className: 'text-amber-600 bg-amber-500/10' },
  sla_breach: { icon: ShieldAlert, className: 'text-red-600 bg-red-500/10' },
  ticket_resolved: { icon: CheckCircle2, className: 'text-green-600 bg-green-500/10' },
  ticket_closed: { icon: CheckCheck, className: 'text-gray-600 bg-gray-500/10' },
  ticket_reopened: { icon: RotateCcw, className: 'text-orange-600 bg-orange-500/10' },
  vacation_request: { icon: Plane, className: 'text-teal-600 bg-teal-500/10' },
  excuse_request: { icon: Clock, className: 'text-fuchsia-600 bg-fuchsia-500/10' },
};

const DEFAULT_STYLE = { icon: Bell, className: 'text-on-surface-variant bg-surface-container-high' };

const typeLabel = (type: NotificationType) => type.replace(/_/g, ' ');

// Compact "time ago" — falls back to a full date once it's a week old.
const relativeTime = (iso: string) => {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
};

export function NotificationDropdown({ isOpen, onClose, excludeTypes = [] }: NotificationDropdownProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, userType } = useAuth();
  const { items, loading, error } = useAppSelector((state) => state.notifications);

  const userId = user?._id;
  const filteredItems = items.filter((item) => !excludeTypes.includes(item.notificationType));
  // Unread count from the loaded list — matches the header bell badge exactly
  // and reads 0 when the list is empty.
  const unread = filteredItems.filter((item) => !item.isRead).length;

  useEffect(() => {
    if (isOpen && userId && userType) {
      dispatch(fetchNotifications({ userId, userType, limit: 50 }));
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

  // Resolve where a notification should take the user when clicked.
  const destinationFor = (item: Notification): string | null => {
    if (item.notificationType === 'vacation_request' || item.notificationType === 'excuse_request') {
      return '/employee-requests/approvals';
    }
    if (item.ticket?._id) return `/tickets/view/${item.ticket._id}`;
    return null;
  };

  const handleItemActivate = (item: Notification) => {
    if (!item.isRead) void handleMarkSingleRead(item._id);
    const dest = destinationFor(item);
    if (dest) {
      onClose?.();
      navigate(dest);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          role="region"
          aria-label="Notifications"
          className="absolute right-0 mt-3 w-[340px] max-w-[92vw] sm:w-[400px] overflow-hidden rounded-[1.25rem] bg-surface-container-lowest border border-outline-variant/40 shadow-ambient z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-outline-variant/20 bg-surface-container-low">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                {unread > 0 ? <BellRing className="h-4.5 w-4.5" /> : <Bell className="h-4.5 w-4.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface leading-tight">Notifications</p>
                <p className="text-xs text-on-surface-variant truncate">
                  {unread > 0 ? `${unread} unread` : 'You are all caught up'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-on-surface-variant hover:text-on-surface"
                onClick={handleMarkAllRead}
                disabled={loading || unread === 0}
                title="Mark all as read"
                aria-label="Mark all notifications as read"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-on-surface-variant hover:text-error"
                onClick={handleClearRead}
                disabled={loading || filteredItems.every((i) => !i.isRead)}
                title="Clear read notifications"
                aria-label="Clear read notifications"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[26rem] overflow-y-auto overscroll-contain">
            {loading && filteredItems.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-10 text-on-surface-variant">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading notifications…</span>
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant mb-3">
                  <Bell className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold text-on-surface">No notifications yet</p>
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  Updates about your tickets and requests will appear here
                </p>
              </div>
            )}

            {filteredItems.map((item, index) => {
              const style = TYPE_STYLES[item.notificationType] || DEFAULT_STYLE;
              const Icon = style.icon;
              const clickable = destinationFor(item) !== null;
              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.2) }}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => handleItemActivate(item) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleItemActivate(item);
                          }
                        }
                      : undefined
                  }
                  className={`group relative flex gap-3 px-4 py-3 border-b border-outline-variant/10 last:border-b-0 transition-colors ${
                    clickable ? 'cursor-pointer' : ''
                  } hover:bg-surface-container-high/60 ${!item.isRead ? 'bg-primary/[0.04]' : ''}`}
                >
                  {/* Unread accent bar */}
                  {!item.isRead && (
                    <span className="absolute left-0 top-0 h-full w-[3px] bg-accent-orange-500" aria-hidden="true" />
                  )}

                  {/* Type icon */}
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${style.className}`}>
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant capitalize">
                        {typeLabel(item.notificationType)}
                      </span>
                      <span className="text-[11px] text-on-surface-variant/60 shrink-0 whitespace-nowrap">
                        {relativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface mt-0.5 break-words leading-snug">{item.message}</p>
                    {item.ticket && (
                      <p className="text-xs text-on-surface-variant/80 mt-1 truncate">
                        Ticket {item.ticket.ticketNumber || item.ticket._id}
                        {item.ticket.status ? ` • ${item.ticket.status}` : ''}
                        {item.ticket.priority ? ` • ${item.ticket.priority}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Per-item mark-read affordance (does not trigger navigation) */}
                  {!item.isRead && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMarkSingleRead(item._id);
                      }}
                      className="self-start opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-md p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container-highest"
                      title="Mark as read"
                      aria-label="Mark this notification as read"
                    >
                      <CheckCheck className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
