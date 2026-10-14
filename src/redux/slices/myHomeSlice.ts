import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import * as myHomeApi from '@/api/myHomeApi';
import * as ticketApi from '@/api/ticketApi';
import * as tasksApi from '@/api/tasksApi';
import * as teleSalesApi from '@/api/teleSalesApi';
import * as ticketEmailApi from '@/api/ticketEmailApi';
import * as employeeRequestApi from '@/api/employeeRequestApi';
import { boardOf, dayKey, textToHtml } from '@/lib/myHome';
import type {
  CallOutcome,
  GrowthGoal,
  HomeEmail,
  HomeFollowUp,
  HomeTask,
  LeaveRequestRow,
  MyHomeData,
} from '@/types/myHome.types';

// My Home page state. `data` is GET /api/me/home; every toggle is applied
// optimistically in the thunk's `pending` and undone in `rejected` (with an
// error toast), so the badges and tiles — derived by selectors in
// pages/home/selectors.ts — follow instantly.

export type TicketTab = 'client' | 'internal';
export type TicketFilter = 'open' | 'overdue' | 'waiting' | 'all';

export interface MyHomeUi {
  search: string;
  tickets: { tab: TicketTab; view: 'list' | 'board'; filter: TicketFilter; day: string | null };
  emails: { tab: 'needs' | 'replied' | 'all' };
  tasks: { tab: 'open' | 'done' };
  drawers: { ticketId: string | null; emailId: string | null };
  modals: { logTime: { ticketId: string | null } | null; leave: boolean; goal: boolean; profile: boolean };
  toast: { id: number; text: string; tone: 'ok' | 'error' } | null;
}

interface MyHomeState {
  data: MyHomeData | null;
  loading: boolean;
  error: string | null;
  ui: MyHomeUi;
}

const initialUi: MyHomeUi = {
  search: '',
  tickets: { tab: 'client', view: 'list', filter: 'open', day: null },
  emails: { tab: 'needs' },
  tasks: { tab: 'open' },
  drawers: { ticketId: null, emailId: null },
  modals: { logTime: null, leave: false, goal: false, profile: false },
  toast: null,
};

const initialState: MyHomeState = { data: null, loading: false, error: null, ui: initialUi };

const messageOf = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

// ── Thunks ───────────────────────────────────────────────────────────────────

export const fetchMyHome = createAsyncThunk('myHome/fetch', async (_: void, { rejectWithValue }) => {
  try {
    return await myHomeApi.getMyHome();
  } catch (err) {
    return rejectWithValue(messageOf(err, "Couldn't load your home page"));
  }
});

export const setTicketStatus = createAsyncThunk(
  'myHome/ticketStatus',
  async (arg: { id: string; status: string; prev: string; label: string }, { rejectWithValue }) => {
    try {
      await ticketApi.updateTicketStatus(arg.id, arg.status);
      return arg;
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Could not change the status'));
    }
  }
);

export const logTime = createAsyncThunk(
  'myHome/logTime',
  async (arg: { ticketId: string; hours: number; kind: 'client' | 'internal'; code: string }, { rejectWithValue }) => {
    try {
      return await myHomeApi.logTime({ ticketId: arg.ticketId, hours: arg.hours });
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Could not log the time'));
    }
  }
);

export const markEmailRead = createAsyncThunk('myHome/emailRead', async (email: HomeEmail, { rejectWithValue }) => {
  try {
    if (email.source === 'ticket') await ticketEmailApi.markTicketEmailRead(email.refId, email.id);
    else await teleSalesApi.markLeadEmailRead(email.refId, email.id);
    return email.id;
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Could not mark the email as read'));
  }
});

export const replyToEmail = createAsyncThunk(
  'myHome/emailReply',
  async (arg: { email: HomeEmail; body: string }, { rejectWithValue }) => {
    const { email, body } = arg;
    const data = {
      to: [email.fromEmail],
      subject: /^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`,
      message: textToHtml(body),
    };
    try {
      if (email.source === 'ticket') await ticketEmailApi.replyTicketEmail(email.refId, email.id, data);
      else await teleSalesApi.replyLeadEmail(email.refId, email.id, data);
      return { id: email.id, repliedAt: new Date().toISOString() };
    } catch (err) {
      return rejectWithValue(messageOf(err, 'The reply was not sent'));
    }
  }
);

export const markEmailReplied = createAsyncThunk('myHome/emailReplied', async (email: HomeEmail, { rejectWithValue }) => {
  try {
    return await myHomeApi.markEmailReplied(email.source, email.id);
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Could not update the email'));
  }
});

export const addTodo = createAsyncThunk('myHome/addTodo', async (arg: { title: string; dueDate: string }, { rejectWithValue }) => {
  try {
    return await myHomeApi.createTodo({ title: arg.title, dueDate: arg.dueDate, priority: 'medium' });
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Could not add the task'));
  }
});

export const toggleTask = createAsyncThunk('myHome/toggleTask', async (task: HomeTask, { rejectWithValue }) => {
  try {
    if (task.kind === 'todo') await myHomeApi.updateTodo(task.id, { done: !task.done });
    else await tasksApi.updateTask(task.id, { status: task.done ? 'in_progress' : 'done' });
    return task.id;
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Could not update the task'));
  }
});

export const removeTodo = createAsyncThunk('myHome/removeTodo', async (task: HomeTask, { rejectWithValue }) => {
  try {
    await myHomeApi.deleteTodo(task.id);
    return task.id;
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Could not delete the task'));
  }
});

export const logCall = createAsyncThunk(
  'myHome/logCall',
  async (arg: { leadId: string; outcome: CallOutcome }, { rejectWithValue }) => {
    try {
      return await myHomeApi.logCall(arg);
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Could not log the call'));
    }
  }
);

export const undoCall = createAsyncThunk(
  'myHome/undoCall',
  async (arg: { leadId: string; callId: string; outcome: CallOutcome | 'logged' }, { rejectWithValue }) => {
    try {
      return await myHomeApi.undoCall(arg.callId);
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Could not undo the call'));
    }
  }
);

export const toggleFollowUp = createAsyncThunk('myHome/toggleFollowUp', async (f: HomeFollowUp, { rejectWithValue }) => {
  try {
    await teleSalesApi.updateFollowUp(f.leadId, f.id, { status: f.done ? 'Pending' : 'Done' });
    return f.id;
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Could not update the follow-up'));
  }
});

export const requestLeave = createAsyncThunk(
  'myHome/requestLeave',
  async (arg: { startDate: string; endDate: string; reason?: string }, { rejectWithValue }) => {
    try {
      const res = await employeeRequestApi.createEmployeeRequest({ type: 'vacation', ...arg });
      const r = res.data as unknown as { _id: string; startDate: string; endDate: string; days?: number; status: string; reason?: string };
      return {
        id: r._id,
        type: 'vacation',
        from: r.startDate,
        to: r.endDate,
        days: r.days ?? null,
        hours: null,
        status: r.status,
        reason: r.reason ?? '',
      } as LeaveRequestRow;
    } catch (err) {
      return rejectWithValue(messageOf(err, 'The request was not sent'));
    }
  }
);

export const toggleGoalStep = createAsyncThunk(
  'myHome/toggleGoalStep',
  async (arg: { goalId: string; stepId: string; done: boolean }, { rejectWithValue }) => {
    try {
      return await myHomeApi.toggleGoalStep(arg.goalId, arg.stepId, arg.done);
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Could not update the step'));
    }
  }
);

export const addGoal = createAsyncThunk(
  'myHome/addGoal',
  async (arg: { title: string; type: GrowthGoal['type']; targetLabel?: string; steps: string[] }, { rejectWithValue }) => {
    try {
      return await myHomeApi.createGoal(arg);
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Could not add the goal'));
    }
  }
);

export const removeGoal = createAsyncThunk('myHome/removeGoal', async (goal: GrowthGoal, { rejectWithValue }) => {
  try {
    await myHomeApi.deleteGoal(goal.id);
    return goal.id;
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Could not delete the goal'));
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

let toastSeq = 0;
const toast = (state: MyHomeState, text: string, tone: 'ok' | 'error' = 'ok') => {
  state.ui.toast = { id: ++toastSeq, text, tone };
};
const errToast = (state: MyHomeState, action: { payload?: unknown; error?: { message?: string } }) =>
  toast(state, String(action.payload ?? action.error?.message ?? 'Something went wrong'), 'error');

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

const applyHours = (d: MyHomeData, ticketId: string, kind: 'client' | 'internal', delta: number) => {
  const t = d.tickets.find((x) => x.id === ticketId);
  if (t) t.loggedHours = r1(t.loggedHours + delta);
  const h = d.kpis.hours;
  const u = d.kpis.utilization;
  h.logged = r1(h.logged + delta);
  h.pct = pct(h.logged, h.target);
  if (kind === 'client') u.billable = r1(u.billable + delta);
  else u.internal = r1(u.internal + delta);
  u.pct = pct(u.billable, u.billable + u.internal);
};

const setCallCounters = (d: MyHomeData, outcome: CallOutcome | 'logged', delta: 1 | -1) => {
  const k = d.telesales?.kpis;
  if (!k) return;
  k.callsToday = Math.max(0, k.callsToday + delta);
  if (outcome === 'answered') k.connected = Math.max(0, k.connected + delta);
  k.connectPct = pct(k.connected, k.callsToday);
};

const allFollowUps = (d: MyHomeData) =>
  d.telesales ? [...d.telesales.followUps.overdue, ...d.telesales.followUps.today, ...d.telesales.followUps.upcoming] : [];

const recountOverdueFollowUps = (d: MyHomeData) => {
  if (d.telesales) d.telesales.kpis.followUpsOverdue = d.telesales.followUps.overdue.filter((f) => !f.done).length;
};

const flipTask = (d: MyHomeData, id: string) => {
  const t = d.tasks.find((x) => x.id === id);
  if (t) t.done = !t.done;
};

const flipStep = (d: MyHomeData, goalId: string, stepId: string, done: boolean) => {
  const g = d.goals.find((x) => x.id === goalId);
  const s = g?.steps.find((x) => x.id === stepId);
  if (!g || !s) return;
  s.done = done;
  g.pct = pct(g.steps.filter((x) => x.done).length, g.steps.length);
};

// ── Slice ────────────────────────────────────────────────────────────────────

const myHomeSlice = createSlice({
  name: 'myHome',
  initialState,
  reducers: {
    setSearch: (s, a: PayloadAction<string>) => {
      s.ui.search = a.payload;
    },
    setTicketTab: (s, a: PayloadAction<TicketTab>) => {
      s.ui.tickets.tab = a.payload;
    },
    setTicketView: (s, a: PayloadAction<'list' | 'board'>) => {
      s.ui.tickets.view = a.payload;
    },
    setTicketFilter: (s, a: PayloadAction<TicketFilter>) => {
      s.ui.tickets.filter = a.payload;
    },
    toggleDay: (s, a: PayloadAction<string | null>) => {
      s.ui.tickets.day = a.payload && s.ui.tickets.day !== a.payload ? a.payload : null;
    },
    resetTicketFilters: (s) => {
      s.ui.search = '';
      s.ui.tickets.day = null;
      s.ui.tickets.filter = 'open';
    },
    setEmailTab: (s, a: PayloadAction<MyHomeUi['emails']['tab']>) => {
      s.ui.emails.tab = a.payload;
    },
    setTaskTab: (s, a: PayloadAction<MyHomeUi['tasks']['tab']>) => {
      s.ui.tasks.tab = a.payload;
    },
    openTicket: (s, a: PayloadAction<string | null>) => {
      s.ui.drawers.ticketId = a.payload;
    },
    openEmail: (s, a: PayloadAction<string | null>) => {
      s.ui.drawers.emailId = a.payload;
    },
    openLogTime: (s, a: PayloadAction<{ ticketId: string | null } | null>) => {
      s.ui.modals.logTime = a.payload;
    },
    openModal: (s, a: PayloadAction<{ modal: 'leave' | 'goal' | 'profile'; open: boolean }>) => {
      s.ui.modals[a.payload.modal] = a.payload.open;
    },
    showToast: (s, a: PayloadAction<{ text: string; tone?: 'ok' | 'error' }>) => {
      toast(s, a.payload.text, a.payload.tone ?? 'ok');
    },
    clearToast: (s, a: PayloadAction<number>) => {
      if (s.ui.toast?.id === a.payload) s.ui.toast = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchMyHome.pending, (s) => {
      s.loading = true;
      s.error = null;
    })
      .addCase(fetchMyHome.fulfilled, (s, a) => {
        s.loading = false;
        s.data = a.payload;
      })
      .addCase(fetchMyHome.rejected, (s, a) => {
        s.loading = false;
        s.error = String(a.payload ?? "Couldn't load your home page");
      });

    // Ticket status
    b.addCase(setTicketStatus.pending, (s, a) => {
      const t = s.data?.tickets.find((x) => x.id === a.meta.arg.id);
      if (t) {
        t.status = a.meta.arg.status;
        t.board = boardOf(a.meta.arg.status);
      }
    })
      .addCase(setTicketStatus.fulfilled, (s, a) => toast(s, `${a.payload.label}`))
      .addCase(setTicketStatus.rejected, (s, a) => {
        const t = s.data?.tickets.find((x) => x.id === a.meta.arg.id);
        if (t) {
          t.status = a.meta.arg.prev;
          t.board = boardOf(a.meta.arg.prev);
        }
        errToast(s, a);
      });

    // Time
    b.addCase(logTime.pending, (s, a) => {
      if (s.data) applyHours(s.data, a.meta.arg.ticketId, a.meta.arg.kind, a.meta.arg.hours);
    })
      .addCase(logTime.fulfilled, (s, a) => {
        const t = s.data?.tickets.find((x) => x.id === a.payload.data.ticketId);
        if (t) t.loggedHours = r1(a.payload.data.loggedHours);
        toast(s, `Logged ${a.meta.arg.hours}h on ${a.meta.arg.code}`);
      })
      .addCase(logTime.rejected, (s, a) => {
        if (s.data) applyHours(s.data, a.meta.arg.ticketId, a.meta.arg.kind, -a.meta.arg.hours);
        errToast(s, a);
      });

    // Emails
    b.addCase(markEmailRead.pending, (s, a) => {
      const e = s.data?.emails.find((x) => x.id === a.meta.arg.id);
      if (e) e.isRead = true;
    }).addCase(markEmailRead.rejected, (s, a) => {
      const e = s.data?.emails.find((x) => x.id === a.meta.arg.id);
      if (e) e.isRead = a.meta.arg.isRead;
    });
    const replied = (s: MyHomeState, id: string, at: string | null) => {
      const e = s.data?.emails.find((x) => x.id === id);
      if (e) {
        e.repliedAt = at;
        if (at) e.isRead = true;
      }
    };
    b.addCase(replyToEmail.pending, (s, a) => replied(s, a.meta.arg.email.id, new Date().toISOString()))
      .addCase(replyToEmail.fulfilled, (s, a) => {
        toast(s, `Reply sent to ${a.meta.arg.email.fromName}`);
      })
      .addCase(replyToEmail.rejected, (s, a) => {
        replied(s, a.meta.arg.email.id, a.meta.arg.email.repliedAt);
        errToast(s, a);
      });
    b.addCase(markEmailReplied.pending, (s, a) => replied(s, a.meta.arg.id, new Date().toISOString()))
      .addCase(markEmailReplied.fulfilled, (s) => toast(s, 'Marked as replied'))
      .addCase(markEmailReplied.rejected, (s, a) => {
        replied(s, a.meta.arg.id, a.meta.arg.repliedAt);
        errToast(s, a);
      });

    // Tasks
    b.addCase(addTodo.fulfilled, (s, a) => {
      s.data?.tasks.unshift(a.payload);
      toast(s, 'Task added');
    }).addCase(addTodo.rejected, errToast);
    b.addCase(toggleTask.pending, (s, a) => {
      if (s.data) flipTask(s.data, a.meta.arg.id);
    })
      .addCase(toggleTask.rejected, (s, a) => {
        if (s.data) flipTask(s.data, a.meta.arg.id);
        errToast(s, a);
      });
    b.addCase(removeTodo.fulfilled, (s, a) => {
      if (s.data) s.data.tasks = s.data.tasks.filter((t) => t.id !== a.payload);
      toast(s, 'Task deleted');
    }).addCase(removeTodo.rejected, errToast);

    // Tele-sales
    b.addCase(logCall.pending, (s, a) => {
      const row = s.data?.telesales?.callList.find((c) => c.leadId === a.meta.arg.leadId);
      if (row) row.todayCall = { id: '', outcome: a.meta.arg.outcome };
      if (s.data) setCallCounters(s.data, a.meta.arg.outcome, 1);
    })
      .addCase(logCall.fulfilled, (s, a) => {
        const d = s.data;
        const row = d?.telesales?.callList.find((c) => c.leadId === a.meta.arg.leadId);
        if (row) {
          row.todayCall = { id: a.payload.call.id, outcome: a.payload.call.outcome };
          row.lastContactAt = new Date().toISOString();
        }
        const f = a.payload.followUp;
        if (d?.telesales && f) {
          const key = dayKey(f.dueAt, d.timezone);
          const bucket = key === d.today ? 'today' : 'upcoming';
          d.telesales.followUps[bucket].push({ ...f, contactName: row?.contactName ?? '' });
          d.telesales.followUps[bucket].sort((x, y) => new Date(x.dueAt).getTime() - new Date(y.dueAt).getTime());
        }
        toast(s, f ? 'Callback booked for the next working day' : 'Call logged');
      })
      .addCase(logCall.rejected, (s, a) => {
        const row = s.data?.telesales?.callList.find((c) => c.leadId === a.meta.arg.leadId);
        if (row) row.todayCall = null;
        if (s.data) setCallCounters(s.data, a.meta.arg.outcome, -1);
        errToast(s, a);
      });
    b.addCase(undoCall.pending, (s, a) => {
      const row = s.data?.telesales?.callList.find((c) => c.leadId === a.meta.arg.leadId);
      if (row) row.todayCall = null;
      if (s.data) setCallCounters(s.data, a.meta.arg.outcome, -1);
    })
      .addCase(undoCall.fulfilled, (s, a) => {
        const ts = s.data?.telesales;
        if (ts && a.payload.followUpId) {
          for (const k of ['overdue', 'today', 'upcoming'] as const) {
            ts.followUps[k] = ts.followUps[k].filter((f) => f.id !== a.payload.followUpId);
          }
        }
        toast(s, 'Call removed');
      })
      .addCase(undoCall.rejected, (s, a) => {
        const row = s.data?.telesales?.callList.find((c) => c.leadId === a.meta.arg.leadId);
        if (row) row.todayCall = { id: a.meta.arg.callId, outcome: a.meta.arg.outcome };
        if (s.data) setCallCounters(s.data, a.meta.arg.outcome === 'logged' ? 'logged' : a.meta.arg.outcome, 1);
        errToast(s, a);
      });
    const flipFollowUp = (s: MyHomeState, id: string) => {
      if (!s.data) return;
      const f = allFollowUps(s.data).find((x) => x.id === id);
      if (f) f.done = !f.done;
      recountOverdueFollowUps(s.data);
    };
    b.addCase(toggleFollowUp.pending, (s, a) => flipFollowUp(s, a.meta.arg.id)).addCase(toggleFollowUp.rejected, (s, a) => {
      flipFollowUp(s, a.meta.arg.id);
      errToast(s, a);
    });

    // Leave
    b.addCase(requestLeave.fulfilled, (s, a) => {
      s.data?.leave.requests.unshift(a.payload);
      s.ui.modals.leave = false;
      toast(s, 'Leave request sent for approval');
    }).addCase(requestLeave.rejected, errToast);

    // Growth
    b.addCase(toggleGoalStep.pending, (s, a) => {
      if (s.data) flipStep(s.data, a.meta.arg.goalId, a.meta.arg.stepId, a.meta.arg.done);
    })
      .addCase(toggleGoalStep.rejected, (s, a) => {
        if (s.data) flipStep(s.data, a.meta.arg.goalId, a.meta.arg.stepId, !a.meta.arg.done);
        errToast(s, a);
      });
    b.addCase(addGoal.fulfilled, (s, a) => {
      s.data?.goals.push(a.payload);
      s.ui.modals.goal = false;
      toast(s, 'Goal added');
    }).addCase(addGoal.rejected, errToast);
    b.addCase(removeGoal.fulfilled, (s, a) => {
      if (s.data) s.data.goals = s.data.goals.filter((g) => g.id !== a.payload);
      toast(s, 'Goal removed');
    }).addCase(removeGoal.rejected, errToast);
  },
});

export const {
  setSearch,
  setTicketTab,
  setTicketView,
  setTicketFilter,
  toggleDay,
  resetTicketFilters,
  setEmailTab,
  setTaskTab,
  openTicket,
  openEmail,
  openLogTime,
  openModal,
  showToast,
  clearToast,
} = myHomeSlice.actions;

export default myHomeSlice.reducer;
