export type NotificationUserType = 'customer' | 'consultant' | 'team_member' | 'tele_sales';

export type NotificationType =
  | 'new_ticket'
  | 'ticket_assigned'
  | 'ticket_reassigned'
  | 'status_change'
  | 'new_comment'
  | 'sla_alert'
  | 'sla_breach'
  | 'ticket_resolved'
  | 'ticket_closed'
  | 'ticket_reopened'
  | 'vacation_request'
  | 'excuse_request'
  | 'meeting_invite'
  | 'meeting_updated'
  | 'meeting_cancelled'
  | 'meeting_reminder';

export interface Notification {
  _id: string;
  meeting?: {
    _id: string;
    title?: string;
    startAt?: string;
    status?: string;
  } | null;
  ticket?: {
    _id: string;
    ticketNumber?: string;
    subject?: string;
    status?: string;
    priority?: string;
  };
  userId: string;
  userType: NotificationUserType;
  notificationType: NotificationType;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListParams {
  userId: string;
  userType: NotificationUserType;
  limit?: number;
}

