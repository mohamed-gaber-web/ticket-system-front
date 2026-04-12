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
  | 'ticket_closed';

export interface Notification {
  _id: string;
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

