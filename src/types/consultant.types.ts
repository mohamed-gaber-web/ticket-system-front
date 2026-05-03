export type ConsultantRole = 'consultant' | 'senior_consultant' | 'admin';
export type ConsultantStatus = 'active' | 'inactive' | 'on_leave';

export interface Consultant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  role: ConsultantRole;
  status: ConsultantStatus;
  fullName: string;
  monthlyTargetHours?: number | null;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultantQueryParams {
  page?: number;
  limit?: number;
  status?: ConsultantStatus;
  role?: ConsultantRole;
  search?: string;
}

export interface ConsultantListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Consultant[];
}

export interface ConsultantResponse {
  success: boolean;
  data: Consultant;
  message?: string;
}

export interface ConsultantStats {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  byRole: RoleCount[];
}

export interface RoleCount {
  _id: ConsultantRole;
  count: number;
}

export interface ConsultantStatsResponse {
  success: boolean;
  data: ConsultantStats;
}

export interface CreateConsultantData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  position?: string;
  role: ConsultantRole;
  status: ConsultantStatus;
  monthlyTargetHours?: number | null;
}

export interface UpdateConsultantData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  role?: ConsultantRole;
  status?: ConsultantStatus;
  monthlyTargetHours?: number | null;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}
