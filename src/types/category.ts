export interface Category {
    _id: string;
    name: string;
    description: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateCategoryData {
    name: string;
    description: string;
}

export interface UpdateCategoryData {
    name?: string;
    description?: string;
}

export interface CategoryResponse {
    success: boolean;
    message?: string;
    data: Category;
}

export interface CategoriesResponse {
    success: boolean;
    count: number;
    total?: number;
    page?: number;
    pages?: number;
    data: Category[];
}

export interface CategoryQueryParams {
    page?: number;
    limit?: number;
    search?: string;
}

// Keep ICategory for backwards compatibility
export interface ICategory extends Category {}