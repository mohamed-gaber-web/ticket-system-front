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
  scheduledWeek?: number | null;
  duration?: number | null;
  status: TaskStatus;
  completedAt?: string | null;
  delayDays?: number;
  createdBy?: TaskConsultant | string | null;
  parentTask?: string | null;
  subTaskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  name: string;
  description?: string;
  department: TaskDepartment;
  category: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string | null;
  responsible?: string | null;
  scheduledWeek?: number | null;
  duration?: number | null;
  status?: TaskStatus;
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
