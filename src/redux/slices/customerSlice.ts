import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import * as customerApi from '@/api/customerApi';
import { toast } from 'sonner';
import type { CreateCustomerData, Customer, CustomerQueryParams, UpdateCustomerData } from '@/types/customer.types';

interface CustomerState {
  customers: Customer[];
  currentCustomer: Customer | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: CustomerState = {
  customers: [],
  currentCustomer: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

// Async thunks
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (params: CustomerQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await customerApi.getCustomers(params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch customers';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await customerApi.getCustomerById(id);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch customer';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (data: CreateCustomerData, { rejectWithValue }) => {
    try {
      // Backend automatically sends emails to assigned consultants
      // No need to send emails from frontend
      const response = await customerApi.createCustomer(data);
      const createdCustomer = response.data;

      toast.success('Customer created successfully!');

      // Show notification about email sending (backend handles it)
      if (data.consultants && data.consultants.length > 0) {
        toast.success(`Notification emails will be sent to ${data.consultants.length} consultant${data.consultants.length > 1 ? 's' : ''}`);
      }

      return createdCustomer;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create customer';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, data }: { id: string; data: UpdateCustomerData }, { rejectWithValue }) => {
    try {
      const response = await customerApi.updateCustomer(id, data);
      toast.success('Customer updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update customer';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string, { rejectWithValue }) => {
    try {
      await customerApi.deleteCustomer(id);
      toast.success('Customer deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete customer';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// Slice
const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    clearCurrentCustomer: (state) => {
      state.currentCustomer = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch customers
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch customer by ID
    builder
      .addCase(fetchCustomerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCustomer = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create customer
    builder
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customers.unshift(action.payload);
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update customer
    builder
      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.customers.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
        state.currentCustomer = action.payload;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete customer
    builder
      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = state.customers.filter((c) => c._id !== action.payload);
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentCustomer, clearError } = customerSlice.actions;
export default customerSlice.reducer;
