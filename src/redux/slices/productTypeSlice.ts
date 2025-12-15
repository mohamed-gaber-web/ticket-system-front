import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  ProductType,
  CreateProductTypeData,
  UpdateProductTypeData,
  ProductTypeQueryParams,
} from '@/types/productType.types';
import * as productTypeApi from '@/api/productTypeApi';
import { toast } from 'sonner';

interface ProductTypeState {
  productTypes: ProductType[];
  currentProductType: ProductType | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: ProductTypeState = {
  productTypes: [],
  currentProductType: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async thunks
export const fetchProductTypes = createAsyncThunk(
  'productTypes/fetchAll',
  async (params: ProductTypeQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await productTypeApi.getProductTypes(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product types');
    }
  }
);

export const fetchProductTypeById = createAsyncThunk(
  'productTypes/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await productTypeApi.getProductTypeById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product type');
    }
  }
);

export const createProductType = createAsyncThunk(
  'productTypes/create',
  async (data: CreateProductTypeData, { rejectWithValue }) => {
    try {
      const response = await productTypeApi.createProductType(data);
      toast.success('Product type created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create product type';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateProductType = createAsyncThunk(
  'productTypes/update',
  async ({ id, data }: { id: string; data: UpdateProductTypeData }, { rejectWithValue }) => {
    try {
      const response = await productTypeApi.updateProductType(id, data);
      toast.success('Product type updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update product type';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteProductType = createAsyncThunk(
  'productTypes/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await productTypeApi.deleteProductType(id);
      toast.success('Product type deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete product type';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleProductTypeStatus = createAsyncThunk(
  'productTypes/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await productTypeApi.toggleProductTypeStatus(id);
      toast.success('Product type status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle product type status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const productTypeSlice = createSlice({
  name: 'productTypes',
  initialState,
  reducers: {
    clearCurrentProductType: (state) => {
      state.currentProductType = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all product types
      .addCase(fetchProductTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductTypes.fulfilled, (state, action) => {
        state.loading = false;
        state.productTypes = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.totalPages;
      })
      .addCase(fetchProductTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch product type by ID
      .addCase(fetchProductTypeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductTypeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProductType = action.payload;
      })
      .addCase(fetchProductTypeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create product type
      .addCase(createProductType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProductType.fulfilled, (state, action) => {
        state.loading = false;
        state.productTypes.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createProductType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update product type
      .addCase(updateProductType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProductType.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.productTypes.findIndex((pt) => pt._id === action.payload._id);
        if (index !== -1) {
          state.productTypes[index] = action.payload;
        }
        if (state.currentProductType?._id === action.payload._id) {
          state.currentProductType = action.payload;
        }
      })
      .addCase(updateProductType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete product type
      .addCase(deleteProductType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProductType.fulfilled, (state, action) => {
        state.loading = false;
        state.productTypes = state.productTypes.filter((pt) => pt._id !== action.payload);
        state.total -= 1;
        if (state.currentProductType?._id === action.payload) {
          state.currentProductType = null;
        }
      })
      .addCase(deleteProductType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle product type status
      .addCase(toggleProductTypeStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleProductTypeStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.productTypes.findIndex((pt) => pt._id === action.payload._id);
        if (index !== -1) {
          state.productTypes[index] = action.payload;
        }
        if (state.currentProductType?._id === action.payload._id) {
          state.currentProductType = action.payload;
        }
      })
      .addCase(toggleProductTypeStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentProductType, clearError } = productTypeSlice.actions;
export default productTypeSlice.reducer;
