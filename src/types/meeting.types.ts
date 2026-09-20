export type MeetingType = 'online' | 'on_site' | 'call';
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type StaffKind = 'Consultant' | 'TeleSalesAgent';

export interface MeetingPerson {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface MeetingStaffAttendee {
  kind: StaffKind;
  user: MeetingPerson | string;
}

export interface MeetingGuest {
  name: string;
  email?: string;
  phone?: string;
}

export interface MeetingCustomerRef {
  _id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

export interface MeetingLeadRef {
  _id: string;
  companyName: string;
  contactPersonName?: string;
  email?: string;
  phonePrimary?: string;
}

export interface Meeting {
  _id: string;
  title: string;
  description?: string;
  type: MeetingType;
  location?: string;
  meetingLink?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  organizer: MeetingPerson | string;
  organizerModel: StaffKind;
  staffAttendees: MeetingStaffAttendee[];
  customer?: MeetingCustomerRef | null;
  lead?: MeetingLeadRef | null;
  guests: MeetingGuest[];
  status: MeetingStatus;
  outcome?: string;
  cancelReason?: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  reminderMinutes?: number | null;
  color: string;
  team?: { _id: string; name: string; code?: string } | null;
  createdAt: string;
  updatedAt: string;
}

/** Someone who can be picked as a staff attendee. */
export interface MeetingPeopleOption {
  kind: StaffKind;
  _id: string;
  name: string;
  email?: string;
  group: string;
}

export interface MeetingContacts {
  customers: MeetingCustomerRef[];
  leads: (MeetingLeadRef & { status?: string })[];
}

export interface MeetingConflict {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  people: string[];
}

export interface MeetingQueryParams {
  from?: string;
  to?: string;
  status?: MeetingStatus;
  type?: MeetingType;
  mine?: boolean;
  staff?: string;
  customer?: string;
  lead?: string;
  search?: string;
}

export interface SaveMeetingData {
  title: string;
  description?: string;
  type: MeetingType;
  location?: string;
  meetingLink?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  staffAttendees: { kind: StaffKind; user: string }[];
  guests: MeetingGuest[];
  customer?: string | null;
  lead?: string | null;
  reminderMinutes?: number | null;
  color: string;
  /** Book even when attendees are double-booked. */
  force?: boolean;
  notify?: boolean;
}

export interface MeetingStatusData {
  status: MeetingStatus;
  outcome?: string;
  cancelReason?: string;
  notify?: boolean;
}

export interface MeetingsListResponse {
  success: boolean;
  count: number;
  data: Meeting[];
}

export interface MeetingResponse {
  success: boolean;
  message?: string;
  data: Meeting;
  conflicts?: MeetingConflict[];
  permissions?: { canEdit: boolean; canDelete: boolean };
}
