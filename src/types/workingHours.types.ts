export interface WorkingHours {
  _id: string;
  workStartTime: string; // "09:00"
  workEndTime: string; // "17:00"
  lastTicketAcceptanceTime: string; // "13:00"
  weekendDays: number[]; // 0=Sun,1=Mon,...,5=Fri,6=Sat
  estimationDays: number;
  reminderBeforeDays: number;
  autoCloseDays: number;
  pendingReminderIntervalDays: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateWorkingHoursData {
  workStartTime?: string;
  workEndTime?: string;
  lastTicketAcceptanceTime?: string;
  weekendDays?: number[];
  estimationDays?: number;
  reminderBeforeDays?: number;
  autoCloseDays?: number;
  pendingReminderIntervalDays?: number;
}

export interface Holiday {
  _id: string;
  date: string;
  description: string;
  createdAt?: string;
}

export interface CreateHolidayData {
  date: string;
  description: string;
}

export interface WorkingHoursResponse {
  success: boolean;
  data: WorkingHours;
}

export interface HolidaysResponse {
  success: boolean;
  count: number;
  data: Holiday[];
}

export interface HolidayResponse {
  success: boolean;
  message?: string;
  data: Holiday;
}
