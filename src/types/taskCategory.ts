export interface TaskCategory {
    _id: string;
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateTaskCategoryData {
    name: string;
    description?: string;
}

export interface UpdateTaskCategoryData {
    name?: string;
    description?: string;
}

export interface TaskCategoryResponse {
    success: boolean;
    message?: string;
    data: TaskCategory;
}

export interface TaskCategoriesResponse {
    success: boolean;
    count: number;
    total?: number;
    page?: number;
    pages?: number;
    data: TaskCategory[];
}

export interface TaskCategoryQueryParams {
    page?: number;
    limit?: number;
    search?: string;
}
