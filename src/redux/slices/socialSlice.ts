import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import * as socialApi from '@/api/socialApi';
import { apiError, isMetricKey, MAX_COMPARE } from '@/lib/socialPulse';
import type {
  MetricKey,
  SocialCompareItem,
  SocialDashboard,
  SocialFilters,
  SocialMeta,
  SocialPostDetail,
  SocialPostRow,
  SocialView,
} from '@/types/social.types';

// Marketing › Social Pulse state. `ui` holds the shared view controls (view,
// month, metric, filters, search, sort, compare selection); view, metric and
// the compare selection survive a reload (localStorage, best effort). Every
// successful write calls `socialChanged`, which bumps `dataVersion` — screens
// list it in their fetch effects, so whatever is on screen refetches.

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface SocialUi {
  view: SocialView;
  month: string;
  metric: MetricKey;
  filters: SocialFilters;
  q: string;
  sort: { key: string; dir: 'asc' | 'desc' };
  compareIds: string[];
}

interface SocialState {
  ui: SocialUi;
  dataVersion: number;
  meta: SocialMeta | null;
  metaStatus: Status;
  posts: SocialPostRow[];
  postsStatus: Status;
  postsError: string | null;
  postsRequestId: string | null;
  dashboard: SocialDashboard | null;
  dashboardStatus: Status;
  dashboardError: string | null;
  dashboardRequestId: string | null;
  compare: { items: SocialCompareItem[]; view: SocialView; month: string | null } | null;
  compareStatus: Status;
  compareError: string | null;
  postById: Record<string, SocialPostDetail>;
  postStatus: Status;
  postError: string | null;
}

const STORE_KEY = 'socialPulse.ui';

export const EMPTY_FILTERS: SocialFilters = { platform: '', type: '', category: '', from: '', to: '' };

const loadUi = (): Pick<SocialUi, 'view' | 'metric' | 'compareIds'> => {
  const fallback = { view: 'cumulative' as SocialView, metric: 'reach' as MetricKey, compareIds: [] as string[] };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    return {
      view: raw.view === 'month' ? 'month' : 'cumulative',
      metric: isMetricKey(raw.metric) ? raw.metric : 'reach',
      compareIds: Array.isArray(raw.compareIds)
        ? raw.compareIds.filter((x: unknown): x is string => typeof x === 'string').slice(0, MAX_COMPARE)
        : [],
    };
  } catch {
    return fallback;
  }
};

const saveUi = (ui: SocialUi) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ view: ui.view, metric: ui.metric, compareIds: ui.compareIds }));
  } catch {
    /* private mode / blocked storage: the selection just won't survive a reload */
  }
};

const initialState: SocialState = {
  ui: { ...loadUi(), month: '', filters: EMPTY_FILTERS, q: '', sort: { key: 'publishDate', dir: 'desc' } },
  dataVersion: 0,
  meta: null,
  metaStatus: 'idle',
  posts: [],
  postsStatus: 'idle',
  postsError: null,
  postsRequestId: null,
  dashboard: null,
  dashboardStatus: 'idle',
  dashboardError: null,
  dashboardRequestId: null,
  compare: null,
  compareStatus: 'idle',
  compareError: null,
  postById: {},
  postStatus: 'idle',
  postError: null,
};

export const fetchSocialMeta = createAsyncThunk('social/meta', async (_: void, { rejectWithValue }) => {
  try {
    return await socialApi.getSocialMeta();
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not load Social Pulse'));
  }
});

export const fetchSocialPosts = createAsyncThunk(
  'social/posts',
  async (query: Parameters<typeof socialApi.getSocialPosts>[0], { rejectWithValue }) => {
    try {
      return await socialApi.getSocialPosts(query);
    } catch (e) {
      return rejectWithValue(apiError(e, 'Could not load the posts'));
    }
  },
);

export const fetchSocialDashboard = createAsyncThunk(
  'social/dashboard',
  async (query: socialApi.SocialQuery, { rejectWithValue }) => {
    try {
      return await socialApi.getSocialDashboard(query);
    } catch (e) {
      return rejectWithValue(apiError(e, 'Could not load the dashboard'));
    }
  },
);

export const fetchSocialCompare = createAsyncThunk(
  'social/compare',
  async ({ ids, view, month }: { ids: string[]; view: SocialView; month?: string }, { rejectWithValue }) => {
    try {
      return await socialApi.getSocialCompare(ids, view, month);
    } catch (e) {
      return rejectWithValue(apiError(e, 'Could not compare the posts'));
    }
  },
);

export const fetchSocialPost = createAsyncThunk('social/post', async (id: string, { rejectWithValue }) => {
  try {
    return await socialApi.getSocialPost(id);
  } catch (e) {
    return rejectWithValue(apiError(e, 'Could not load the post'));
  }
});

/** After any successful write: refetch meta and whatever screen is open. */
export const socialChanged = createAsyncThunk('social/changed', async (_: void, { dispatch }) => {
  await dispatch(fetchSocialMeta());
});

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    setView(state, action: PayloadAction<SocialView>) {
      state.ui.view = action.payload;
      saveUi(state.ui);
    },
    setMonth(state, action: PayloadAction<string>) {
      state.ui.month = action.payload;
    },
    setMetric(state, action: PayloadAction<MetricKey>) {
      state.ui.metric = action.payload;
      saveUi(state.ui);
    },
    setFilter(state, action: PayloadAction<{ key: keyof SocialFilters; value: string }>) {
      state.ui.filters[action.payload.key] = action.payload.value;
    },
    clearFilters(state) {
      state.ui.filters = EMPTY_FILTERS;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.ui.q = action.payload;
    },
    setSort(state, action: PayloadAction<string>) {
      const same = state.ui.sort.key === action.payload;
      const text = action.payload === 'title' || action.payload === 'platform';
      state.ui.sort = { key: action.payload, dir: same ? (state.ui.sort.dir === 'asc' ? 'desc' : 'asc') : text ? 'asc' : 'desc' };
    },
    /** Add/remove a post from Compare; refused (returns unchanged) past the max. */
    toggleCompare(state, action: PayloadAction<string>) {
      const ids = state.ui.compareIds;
      if (ids.includes(action.payload)) state.ui.compareIds = ids.filter((x) => x !== action.payload);
      else if (ids.length < MAX_COMPARE) state.ui.compareIds = [...ids, action.payload];
      saveUi(state.ui);
    },
    clearCompare(state) {
      state.ui.compareIds = [];
      state.compare = null;
      saveUi(state.ui);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(socialChanged.pending, (state) => {
        state.dataVersion += 1;
      })
      .addCase(fetchSocialMeta.pending, (state) => {
        state.metaStatus = 'loading';
      })
      .addCase(fetchSocialMeta.fulfilled, (state, action) => {
        state.metaStatus = 'succeeded';
        state.meta = action.payload;
        const months = action.payload.months;
        if (!state.ui.month || !months.includes(state.ui.month)) {
          state.ui.month = months.at(-1) ?? action.payload.currentMonth;
        }
      })
      .addCase(fetchSocialMeta.rejected, (state) => {
        state.metaStatus = 'failed';
      })
      .addCase(fetchSocialPosts.pending, (state, action) => {
        state.postsStatus = 'loading';
        state.postsError = null;
        state.postsRequestId = action.meta.requestId;
      })
      .addCase(fetchSocialPosts.fulfilled, (state, action) => {
        if (state.postsRequestId !== action.meta.requestId) return;
        state.postsStatus = 'succeeded';
        state.posts = action.payload;
      })
      .addCase(fetchSocialPosts.rejected, (state, action) => {
        if (state.postsRequestId !== action.meta.requestId) return;
        state.postsStatus = 'failed';
        state.postsError = (action.payload as string) ?? 'Could not load the posts';
      })
      .addCase(fetchSocialDashboard.pending, (state, action) => {
        state.dashboardStatus = 'loading';
        state.dashboardError = null;
        state.dashboardRequestId = action.meta.requestId;
      })
      .addCase(fetchSocialDashboard.fulfilled, (state, action) => {
        if (state.dashboardRequestId !== action.meta.requestId) return;
        state.dashboardStatus = 'succeeded';
        state.dashboard = action.payload;
      })
      .addCase(fetchSocialDashboard.rejected, (state, action) => {
        if (state.dashboardRequestId !== action.meta.requestId) return;
        state.dashboardStatus = 'failed';
        state.dashboardError = (action.payload as string) ?? 'Could not load the dashboard';
      })
      .addCase(fetchSocialCompare.pending, (state) => {
        state.compareStatus = 'loading';
        state.compareError = null;
      })
      .addCase(fetchSocialCompare.fulfilled, (state, action) => {
        state.compareStatus = 'succeeded';
        state.compare = action.payload;
        // Posts deleted since they were ticked drop out of the selection.
        const alive = new Set(action.payload.items.map((i) => i.post.id));
        if (state.ui.compareIds.some((id) => !alive.has(id))) {
          state.ui.compareIds = state.ui.compareIds.filter((id) => alive.has(id));
          saveUi(state.ui);
        }
      })
      .addCase(fetchSocialCompare.rejected, (state, action) => {
        state.compareStatus = 'failed';
        state.compareError = (action.payload as string) ?? 'Could not compare the posts';
      })
      .addCase(fetchSocialPost.pending, (state) => {
        state.postStatus = 'loading';
        state.postError = null;
      })
      .addCase(fetchSocialPost.fulfilled, (state, action) => {
        state.postStatus = 'succeeded';
        state.postById[action.payload.post.id] = action.payload;
      })
      .addCase(fetchSocialPost.rejected, (state, action) => {
        state.postStatus = 'failed';
        state.postError = (action.payload as string) ?? 'Could not load the post';
      });
  },
});

export const {
  setView,
  setMonth,
  setMetric,
  setFilter,
  clearFilters,
  setSearch,
  setSort,
  toggleCompare,
  clearCompare,
} = socialSlice.actions;

export default socialSlice.reducer;
