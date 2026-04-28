import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as categoryApi from '@/api/categoryApi';
import type {
  Category,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryQueryParams,
} from '@/types/category';
import { toast } from 'sonner';

interface CategoryState {
  categories: Category[];
  currentCategory: Category | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: CategoryState = {
  categories: [],
  currentCategory: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async Thunks
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (params: CategoryQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await categoryApi.getCategories(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch categories';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchCategoryById = createAsyncThunk(
  'categories/fetchCategoryById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await categoryApi.getCategoryById(id);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch category';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (data: CreateCategoryData, { rejectWithValue }) => {
    try {
      const response = await categoryApi.createCategory(data);
      toast.success('Category created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Failed to create category';
      const details = error.response?.data?.details || error.response?.data?.errors;
      if (details) {
        toast.error(`${message}: ${JSON.stringify(details)}`);
      } else {
        toast.error(message);
      }
      return rejectWithValue({ message, details });
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, data }: { id: string; data: UpdateCategoryData }, { rejectWithValue }) => {
    try {
      const response = await categoryApi.updateCategory(id, data);
      toast.success('Category updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update category';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      await categoryApi.deleteCategory(id);
      toast.success('Category deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete category';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    clearCurrentCategory: (state) => {
      state.currentCategory = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        console.log('Fetch categories fulfilled, payload:', action.payload);
        console.log('Payload type:', typeof action.payload);
        console.log('Payload.data:', action.payload.data);
        console.log('Is payload an array?', Array.isArray(action.payload));
        console.log('Is payload.data an array?', Array.isArray(action.payload.data));

        state.loading = false;

        // Handle different response formats
        if (Array.isArray(action.payload)) {
          // Backend returned array directly
          console.log('Handling array directly from backend');
          state.categories = action.payload;
          state.total = action.payload.length;
        } else if (action.payload.data && Array.isArray(action.payload.data)) {
          // Backend returned wrapped response
          console.log('Handling wrapped response');
          state.categories = action.payload.data;
          state.total = action.payload.total || action.payload.count;
        } else {
          // Unknown format
          console.error('Unknown response format:', action.payload);
          state.categories = [];
          state.total = 0;
        }

        state.page = action.payload.page || 1;
        state.pages = action.payload.pages || 1;
        console.log('Categories state after update:', state.categories);
        console.log('Total categories:', state.total);
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Category By ID
    builder
      .addCase(fetchCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCategory = action.payload;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Category
    builder
      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Category
    builder
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.categories.findIndex((cat) => cat._id === action.payload._id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        if (state.currentCategory?._id === action.payload._id) {
          state.currentCategory = action.payload;
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Category
    builder
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = state.categories.filter((cat) => cat._id !== action.payload);
        state.total -= 1;
        if (state.currentCategory?._id === action.payload) {
          state.currentCategory = null;
        }
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentCategory, clearError } = categorySlice.actions;
export default categorySlice.reducer;
