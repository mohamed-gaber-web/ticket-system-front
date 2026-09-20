import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as meetingsApi from '@/api/meetingsApi';
import type {
  Meeting, MeetingQueryParams, SaveMeetingData, MeetingStatusData, MeetingPeopleOption, MeetingContacts, MeetingConflict,
} from '@/types/meeting.types';

interface MeetingState {
  meetings: Meeting[];
  loading: boolean;
  error: string | null;
  people: MeetingPeopleOption[];
  contacts: MeetingContacts;
  lookupsLoaded: boolean;
  currentMeeting: Meeting | null;
  currentPermissions: { canEdit: boolean; canDelete: boolean } | null;
  saving: boolean;
}

const initialState: MeetingState = {
  meetings: [],
  loading: false,
  error: null,
  people: [],
  contacts: { customers: [], leads: [] },
  lookupsLoaded: false,
  currentMeeting: null,
  currentPermissions: null,
  saving: false,
};

/** Rejection payload for a save: either a plain message or a double-booking conflict list. */
export interface MeetingSaveRejection {
  message: string;
  conflicts?: MeetingConflict[];
}

const rejection = (error: any, fallback: string): MeetingSaveRejection => {
  const data = error.response?.data;
  if (error.response?.status === 409 && Array.isArray(data?.conflicts)) {
    return { message: data.message || 'Time conflict', conflicts: data.conflicts };
  }
  if (Array.isArray(data?.errors) && data.errors.length) return { message: data.errors.join('. ') };
  return { message: data?.message || fallback };
};

export const fetchMeetings = createAsyncThunk(
  'meetings/fetchMeetings',
  async (params: MeetingQueryParams | undefined, { rejectWithValue }) => {
    try {
      return await meetingsApi.getMeetings(params);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to load meetings';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const fetchMeetingLookups = createAsyncThunk(
  'meetings/fetchLookups',
  async (_, { rejectWithValue }) => {
    try {
      const [people, contacts] = await Promise.all([meetingsApi.getMeetingPeople(), meetingsApi.getMeetingContacts()]);
      return { people: people.data, contacts: contacts.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load attendees');
    }
  }
);

export const fetchMeetingById = createAsyncThunk(
  'meetings/fetchMeetingById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await meetingsApi.getMeetingById(id);
      return { meeting: res.data, permissions: res.permissions ?? { canEdit: false, canDelete: false } };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Meeting not found';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const createMeeting = createAsyncThunk<Meeting, SaveMeetingData, { rejectValue: MeetingSaveRejection }>(
  'meetings/createMeeting',
  async (data, { rejectWithValue }) => {
    try {
      const res = await meetingsApi.createMeeting(data);
      toast.success(res.message || 'Meeting booked');
      return res.data;
    } catch (error: any) {
      const r = rejection(error, 'Failed to book meeting');
      if (!r.conflicts) toast.error(r.message);
      return rejectWithValue(r);
    }
  }
);

export const updateMeeting = createAsyncThunk<Meeting, { id: string; data: Partial<SaveMeetingData> }, { rejectValue: MeetingSaveRejection }>(
  'meetings/updateMeeting',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await meetingsApi.updateMeeting(id, data);
      toast.success(res.message || 'Meeting updated');
      return res.data;
    } catch (error: any) {
      const r = rejection(error, 'Failed to update meeting');
      if (!r.conflicts) toast.error(r.message);
      return rejectWithValue(r);
    }
  }
);

export const updateMeetingStatus = createAsyncThunk(
  'meetings/updateMeetingStatus',
  async ({ id, data }: { id: string; data: MeetingStatusData }, { rejectWithValue }) => {
    try {
      const res = await meetingsApi.updateMeetingStatus(id, data);
      toast.success(res.message || 'Meeting updated');
      return res.data;
    } catch (error: any) {
      const message = rejection(error, 'Failed to update meeting').message;
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

export const deleteMeeting = createAsyncThunk(
  'meetings/deleteMeeting',
  async (id: string, { rejectWithValue }) => {
    try {
      await meetingsApi.deleteMeeting(id);
      toast.success('Meeting deleted');
      return id;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete meeting';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

const upsert = (list: Meeting[], m: Meeting) => {
  const idx = list.findIndex((x) => x._id === m._id);
  if (idx === -1) list.push(m);
  else list[idx] = m;
  list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
};

const meetingSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    clearCurrentMeeting: (state) => { state.currentMeeting = null; state.currentPermissions = null; },
    setCurrentMeeting: (state, action: { payload: Meeting | null }) => { state.currentMeeting = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMeetings.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMeetings.fulfilled, (state, action) => { state.loading = false; state.meetings = action.payload.data; })
      .addCase(fetchMeetings.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder.addCase(fetchMeetingLookups.fulfilled, (state, action) => {
      state.people = action.payload.people;
      state.contacts = action.payload.contacts;
      state.lookupsLoaded = true;
    });

    builder.addCase(fetchMeetingById.fulfilled, (state, action) => {
      state.currentMeeting = action.payload.meeting;
      state.currentPermissions = action.payload.permissions;
      upsert(state.meetings, action.payload.meeting);
    });

    builder
      .addCase(createMeeting.pending, (state) => { state.saving = true; })
      .addCase(createMeeting.fulfilled, (state, action) => { state.saving = false; upsert(state.meetings, action.payload); })
      .addCase(createMeeting.rejected, (state) => { state.saving = false; });

    builder
      .addCase(updateMeeting.pending, (state) => { state.saving = true; })
      .addCase(updateMeeting.fulfilled, (state, action) => {
        state.saving = false;
        upsert(state.meetings, action.payload);
        if (state.currentMeeting?._id === action.payload._id) state.currentMeeting = action.payload;
      })
      .addCase(updateMeeting.rejected, (state) => { state.saving = false; });

    builder
      .addCase(updateMeetingStatus.pending, (state) => { state.saving = true; })
      .addCase(updateMeetingStatus.fulfilled, (state, action) => {
        state.saving = false;
        upsert(state.meetings, action.payload);
        if (state.currentMeeting?._id === action.payload._id) state.currentMeeting = action.payload;
      })
      .addCase(updateMeetingStatus.rejected, (state) => { state.saving = false; });

    builder.addCase(deleteMeeting.fulfilled, (state, action) => {
      state.meetings = state.meetings.filter((m) => m._id !== action.payload);
      if (state.currentMeeting?._id === action.payload) { state.currentMeeting = null; state.currentPermissions = null; }
    });
  },
});

export const { clearCurrentMeeting, setCurrentMeeting } = meetingSlice.actions;
export default meetingSlice.reducer;
