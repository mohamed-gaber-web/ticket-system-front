import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  Country,
  CreateCountryData,
  UpdateCountryData,
  CountryQueryParams,
} from '@/types/country.types';
import * as countryApi from '@/api/countryApi';
import { toast } from 'sonner';

interface CountryState {
  countries: Country[];
  currentCountry: Country | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}

const initialState: CountryState = {
  countries: [],
  currentCountry: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};

export const fetchCountries = createAsyncThunk(
  'countries/fetchAll',
  async (params: CountryQueryParams | undefined, { rejectWithValue }) => {
    try {
      const response = await countryApi.getCountries(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch countries');
    }
  }
);

export const fetchCountryById = createAsyncThunk(
  'countries/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await countryApi.getCountryById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch country');
    }
  }
);

export const createCountry = createAsyncThunk(
  'countries/create',
  async (data: CreateCountryData, { rejectWithValue }) => {
    try {
      const response = await countryApi.createCountry(data);
      toast.success('Country created successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create country';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const updateCountry = createAsyncThunk(
  'countries/update',
  async ({ id, data }: { id: string; data: UpdateCountryData }, { rejectWithValue }) => {
    try {
      const response = await countryApi.updateCountry(id, data);
      toast.success('Country updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update country';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteCountry = createAsyncThunk(
  'countries/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await countryApi.deleteCountry(id);
      toast.success('Country deleted successfully!');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete country';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const toggleCountryStatus = createAsyncThunk(
  'countries/toggleStatus',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await countryApi.toggleCountryStatus(id);
      toast.success('Country status updated successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to toggle country status';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const countrySlice = createSlice({
  name: 'countries',
  initialState,
  reducers: {
    clearCurrentCountry: (state) => {
      state.currentCountry = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCountries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.loading = false;
        state.countries = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchCountries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCountryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCountryById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCountry = action.payload;
      })
      .addCase(fetchCountryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createCountry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCountry.fulfilled, (state, action) => {
        state.loading = false;
        state.countries.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createCountry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateCountry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCountry.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.countries.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.countries[index] = action.payload;
        }
        if (state.currentCountry?._id === action.payload._id) {
          state.currentCountry = action.payload;
        }
      })
      .addCase(updateCountry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteCountry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCountry.fulfilled, (state, action) => {
        state.loading = false;
        state.countries = state.countries.filter((c) => c._id !== action.payload);
        state.total -= 1;
        if (state.currentCountry?._id === action.payload) {
          state.currentCountry = null;
        }
      })
      .addCase(deleteCountry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(toggleCountryStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleCountryStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.countries.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.countries[index] = action.payload;
        }
        if (state.currentCountry?._id === action.payload._id) {
          state.currentCountry = action.payload;
        }
      })
      .addCase(toggleCountryStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentCountry, clearError } = countrySlice.actions;
export default countrySlice.reducer;
