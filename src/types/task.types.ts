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

export interface Task {
  _id: string;
  name: string;
  description?: string;
  department: TaskDepartmentObject | TaskDepartment;
  startDate?: string;
  endDate?: string;
  assignedTo?: TaskConsultant | string | null;
  responsible?: TaskConsultant | string | null;
  scheduledWeek?: number | null;
  duration?: number | null;
  status: TaskStatus;
  createdBy?: TaskConsultant | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  name: string;
  description?: string;
  department: TaskDepartment;
  startDate?: string;
  endDate?: string;
  assignedTo?: string | null;
  responsible?: string | null;
  scheduledWeek?: number | null;
  duration?: number | null;
  status?: TaskStatus;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {}

export interface TaskQueryParams {
  page?: number;
  limit?: number;
  department?: TaskDepartment;
  status?: TaskStatus;
  assignedTo?: string;
  scheduledWeek?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
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
