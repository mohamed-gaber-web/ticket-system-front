export interface Module {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModuleData {
  name: string;
  isActive?: boolean;
}

export interface UpdateModuleData {
  name?: string;
  isActive?: boolean;
}

export interface ModuleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface ModuleResponse {
  success: boolean;
  message?: string;
  data: Module;
}

export interface ModulesResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  data: Module[];
}
