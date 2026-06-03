import type {
  EmployeeRequest,
  EmployeeRequestStatus,
  EmployeeRequestType,
} from '@/types/employeeRequest.types';

export const STATUS_LABELS: Record<EmployeeRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<EmployeeRequestStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

export const TYPE_LABELS: Record<EmployeeRequestType, string> = {
  vacation: 'Vacation',
  excuse: 'Excuse',
};

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const employeeName = (req: EmployeeRequest): string => {
  const e = req.employee;
  if (e && typeof e === 'object') return `${e.firstName} ${e.lastName}`;
  return '—';
};

export const departmentName = (req: EmployeeRequest): string => {
  const d = req.department;
  if (d && typeof d === 'object') return d.name;
  return '—';
};

// Human-readable duration summary for a request
export const requestDuration = (req: EmployeeRequest): string => {
  if (req.type === 'vacation') {
    return `${req.days ?? 0} day${(req.days ?? 0) === 1 ? '' : 's'}`;
  }
  return `${req.hours ?? 0} hour${(req.hours ?? 0) === 1 ? '' : 's'}`;
};

// Human-readable date/time range for a request
export const requestPeriod = (req: EmployeeRequest): string => {
  if (req.type === 'vacation') {
    return `${fmtDate(req.startDate)} → ${fmtDate(req.endDate)}`;
  }
  return `${fmtDate(req.date)} · ${req.fromTime ?? ''}–${req.toTime ?? ''}`;
};
