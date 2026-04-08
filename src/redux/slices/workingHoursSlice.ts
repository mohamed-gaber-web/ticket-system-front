import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as workingHoursApi from '@/api/workingHoursApi';
import type {
  WorkingHours,
  Holiday,
  UpdateWorkingHoursData,
  CreateHolidayData,
} from '@/types/workingHours.types';
import { toast } from 'sonner';

interface WorkingHoursState {
  config: WorkingHours | null;
  holidays: Holiday[];
  loading: boolean;
  holidaysLoading: boolean;
  importingHolidays: boolean;
  error: string | null;
}

const initialState: WorkingHoursState = {
  config: null,
  holidays: [],
  loading: false,
  holidaysLoading: false,
  importingHolidays: false,
  error: null,
};

export const fetchWorkingHours = createAsyncThunk(
  'workingHours/fetchConfig',
  async (_, { rejectWithValue }) => {
    try {
      const response = await workingHoursApi.getWorkingHours();
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch working hours';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const saveWorkingHours = createAsyncThunk(
  'workingHours/saveConfig',
  async (data: UpdateWorkingHoursData, { rejectWithValue }) => {
    try {
      const response = await workingHoursApi.updateWorkingHours(data);
      toast.success('Working hours saved successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save working hours';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchHolidays = createAsyncThunk(
  'workingHours/fetchHolidays',
  async (_, { rejectWithValue }) => {
    try {
      const response = await workingHoursApi.getHolidays();
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch holidays';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const addHoliday = createAsyncThunk(
  'workingHours/addHoliday',
  async (data: CreateHolidayData, { rejectWithValue }) => {
    try {
      const response = await workingHoursApi.addHoliday(data);
      toast.success('Holiday added successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add holiday';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const importPublicHolidays = createAsyncThunk(
  'workingHours/importPublicHolidays',
  async (
    { year, countryCode, apiKey }: { year: number; countryCode: string; apiKey?: string },
    { getState, rejectWithValue }
  ) => {
    try {
      let rawHolidays: { date: string; description: string }[] = [];

      if (apiKey) {
        // ── Calendarific (full Islamic + national coverage) ──────────────────
        const res = await fetch(
          `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode.toUpperCase()}&year=${year}`
        );
        if (!res.ok) throw new Error('Calendarific request failed — check your API key');
        const json = await res.json();
        if (json.meta?.code !== 200) throw new Error(json.meta?.error_detail || 'Calendarific error');
        rawHolidays = (json.response?.holidays ?? []).map((h: any) => ({
          date: h.date.iso.slice(0, 10),
          description: h.name,
        }));
      } else {
        // ── Nager.Date fallback (civil holidays only) ─────────────────────────
        const res = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode.toUpperCase()}`
        );
        if (!res.ok) throw new Error('Invalid country code or network error');
        const list: { date: string; name: string; localName: string }[] = await res.json();
        rawHolidays = list.map((h) => ({ date: h.date, description: h.localName || h.name }));
      }

      const state = getState() as { workingHours: WorkingHoursState };
      const existingDates = new Set(
        state.workingHours.holidays.map((h) => h.date.slice(0, 10))
      );

      const newHolidays: CreateHolidayData[] = rawHolidays.filter(
        (h) => !existingDates.has(h.date)
      );

      if (newHolidays.length === 0) {
        toast.info('All public holidays for this year are already imported.');
        return 0;
      }

      await workingHoursApi.addHolidaysBulk(newHolidays);
      toast.success(`${newHolidays.length} public holidays imported successfully!`);
      return newHolidays.length;
    } catch (error: any) {
      const message = error.message || 'Failed to import public holidays';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const removeHoliday = createAsyncThunk(
  'workingHours/removeHoliday',
  async (id: string, { rejectWithValue }) => {
    try {
      await workingHoursApi.deleteHoliday(id);
      toast.success('Holiday deleted');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete holiday';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const workingHoursSlice = createSlice({
  name: 'workingHours',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Fetch config
    builder
      .addCase(fetchWorkingHours.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchWorkingHours.fulfilled, (state, action) => { state.loading = false; state.config = action.payload; })
      .addCase(fetchWorkingHours.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    // Save config
    builder
      .addCase(saveWorkingHours.pending, (state) => { state.loading = true; })
      .addCase(saveWorkingHours.fulfilled, (state, action) => { state.loading = false; state.config = action.payload; })
      .addCase(saveWorkingHours.rejected, (state) => { state.loading = false; });

    // Fetch holidays
    builder
      .addCase(fetchHolidays.pending, (state) => { state.holidaysLoading = true; })
      .addCase(fetchHolidays.fulfilled, (state, action) => { state.holidaysLoading = false; state.holidays = action.payload; })
      .addCase(fetchHolidays.rejected, (state) => { state.holidaysLoading = false; });

    // Add holiday
    builder
      .addCase(addHoliday.pending, (state) => { state.holidaysLoading = true; })
      .addCase(addHoliday.fulfilled, (state, action) => {
        state.holidaysLoading = false;
        state.holidays = [...state.holidays, action.payload].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      })
      .addCase(addHoliday.rejected, (state) => { state.holidaysLoading = false; });

    // Remove holiday
    builder
      .addCase(removeHoliday.fulfilled, (state, action) => {
        state.holidays = state.holidays.filter((h) => h._id !== action.payload);
      });

    // Import public holidays
    builder
      .addCase(importPublicHolidays.pending, (state) => { state.importingHolidays = true; })
      .addCase(importPublicHolidays.fulfilled, (state) => { state.importingHolidays = false; })
      .addCase(importPublicHolidays.rejected, (state) => { state.importingHolidays = false; });
  },
});

export default workingHoursSlice.reducer;
