export type TaskDepartment = string;

export interface TaskDepartmentObject {
  _id: string;
  name: string;
}
export type TaskStatus = 'pending' | 'in_progress' | 'done';

export interface TaskConsultant {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface TaskCategoryObject {
  _id: string;
  name: string;
}

// Populated on single-task responses; the list endpoint returns the raw id.
export interface TaskParentRef {
  _id: string;
  taskNumber?: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface Task {
  _id: string;
  taskNumber?: string;
  name: string;
  description?: string;
  department: TaskDepartmentObject | TaskDepartment;
  category?: TaskCategoryObject | string | null;
  startDate?: string;
  endDate?: string;
  assignedTo?: TaskConsultant | string | null;
  responsible?: TaskConsultant | string | null;
  /** Start week (name kept for compatibility) and end week, both derived from the dates. */
  scheduledWeek?: number | null;
  endWeek?: number | null;
  duration?: number | null;
  status: TaskStatus;
  completedAt?: string | null;
  delayDays?: number;
  createdBy?: TaskConsultant | string | null;
  parentTask?: TaskParentRef | string | null;
  subTaskCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Every field is mandatory when creating a task; only `parentTask` is optional
// (set when creating a subtask from its main task).
export interface CreateTaskData {
  name: string;
  description: string;
  department: TaskDepartment;
  category: string;
  startDate: string;
  endDate: string;
  assignedTo: string;
  responsible: string;
  scheduledWeek: number;
  endWeek: number;
  duration: number;
  status: TaskStatus;
  parentTask?: string | null;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {}

export type TaskSortField =
  | 'taskNumber'
  | 'name'
  | 'department'
  | 'category'
  | 'assignedTo'
  | 'scheduledWeek'
  | 'endWeek'
  | 'duration'
  | 'startDate'
  | 'endDate'
  | 'status'
  | 'delay'
  | 'createdAt';

export interface TaskQueryParams {
  page?: number;
  limit?: number;
  department?: TaskDepartment;
  category?: string;
  status?: TaskStatus;
  assignedTo?: string;
  scheduledWeek?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  parentTask?: string;
  sort?: TaskSortField;
  order?: 'asc' | 'desc';
}

export interface TasksListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Task[];
}

export interface TaskResponse {
  success: boolean;
  data: Task;
  message?: string;
}

export interface TaskStats {
  totals: {
    total: number;
    pending: number;
    inProgress: number;
    done: number;
    overdue: number;
    completionRate: number;
    avgDelayDays: number;
  };
  byStatus: { status: TaskStatus; count: number }[];
  byCategory: { name: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  byWeek: { week: number; count: number }[];
  topAssignees: { name: string; count: number }[];
  recent: Task[];
  upcoming: Task[];
  overdue: Task[];
}

export interface TaskStatsResponse {
  success: boolean;
  data: TaskStats;
}

// ── Task report ─────────────────────────────────────────────────
export type TaskReportScope = 'all' | 'main' | 'sub';

export interface TaskReportParams {
  department?: string;
  category?: string;
  status?: TaskStatus;
  assignedTo?: string;
  responsible?: string;
  scheduledWeek?: number;
  /** Tasks whose start–end range overlaps [from, to]. */
  from?: string;
  to?: string;
  scope?: TaskReportScope;
  search?: string;
}

export interface TaskReportBreakdown {
  _id: string | number | null;
  name: string;
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  overdue: number;
  delayed: number;
  totalDelayDays: number;
  totalDuration: number;
}

export interface TaskReportSummary {
  total: number;
  mainTasks: number;
  subTasks: number;
  pending: number;
  inProgress: number;
  done: number;
  overdue: number;
  doneLate: number;
  completionRate: number;
  onTimeRate: number;
  avgDelayDays: number;
  totalDuration: number;
}

export interface TaskReport {
  generatedAt: string;
  filters: TaskReportParams;
  summary: TaskReportSummary;
  byStatus: { status: TaskStatus; count: number }[];
  byDepartment: TaskReportBreakdown[];
  byCategory: TaskReportBreakdown[];
  byAssignee: TaskReportBreakdown[];
  byResponsible: TaskReportBreakdown[];
  byWeek: TaskReportBreakdown[];
  tasks: Task[];
  truncated: boolean;
}

export interface TaskReportResponse {
  success: boolean;
  data: TaskReport;
}
