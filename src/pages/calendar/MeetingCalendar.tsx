import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addDays, addMonths, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchMeetings, fetchMeetingById, fetchMeetingLookups, clearCurrentMeeting } from '@/redux/slices/meetingSlice';
import { getMeetings as getMeetingsApi } from '@/api/meetingsApi';
import type { Meeting, MeetingQueryParams, MeetingStatus, MeetingType } from '@/types/meeting.types';
import { Button } from '@/components/ui/button';
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Search, Users, X, Video, MapPin, Phone,
} from 'lucide-react';
import MeetingDialog from './components/MeetingDialog';
import MeetingDetailsDialog from './components/MeetingDetailsDialog';
import { MonthView, TimeGridView, AgendaView, CardsView } from './components/CalendarViews';
import {
  type CalendarView, VIEWS, colorOf, defaultSlot, fmtTime, personId, personName, rangeTitle, stepAnchor, visibleRange, withName,
  STATUS_META, TYPE_META, WEEK_STARTS_ON,
} from './calendarUtils';

const INPUT_CLS =
  'px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30';

/** Google-style mini month for jumping around. */
function MiniMonth({ anchor, onPick, meetings }: { anchor: Date; onPick: (d: Date) => void; meetings: Meeting[] }) {
  const [month, setMonth] = useState(startOfMonth(anchor));
  useEffect(() => { setMonth(startOfMonth(anchor)); }, [anchor]);
  const start = startOfWeek(month, { weekStartsOn: WEEK_STARTS_ON });
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const busy = useMemo(() => new Set(meetings.map((m) => format(new Date(m.startAt), 'yyyy-MM-dd'))), [meetings]);
  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-on-surface">{format(month, 'MMMM yyyy')}</p>
        <div className="flex">
          <button type="button" onClick={() => setMonth(addMonths(month, -1))} className="p-1 rounded hover:bg-surface-container"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="p-1 rounded hover:bg-surface-container"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] text-on-surface-variant mb-1">
        {days.slice(0, 7).map((d) => <span key={d.toISOString()}>{format(d, 'EEEEE')}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onPick(d)}
            className={`relative mx-auto w-7 h-7 rounded-full text-xs flex items-center justify-center transition-colors ${
              isSameDay(d, anchor) ? 'bg-primary text-on-primary font-bold'
              : isToday(d) ? 'text-primary font-bold hover:bg-surface-container'
              : isSameMonth(d, month) ? 'text-on-surface hover:bg-surface-container' : 'text-on-surface-variant/40 hover:bg-surface-container'
            }`}
          >
            {format(d, 'd')}
            {busy.has(format(d, 'yyyy-MM-dd')) && !isSameDay(d, anchor) && (
              <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MeetingCalendar() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { meetings, loading, people, currentMeeting, currentPermissions } = useAppSelector((s) => s.meetings);
  const { userType, user, consultantRole } = useAppSelector((s) => s.auth);
  const isStaff = userType === 'employee';
  const canCreate = isStaff;
  const myId = (user as any)?._id as string | undefined;
  const isAdmin = (user as any)?.role === 'admin' || consultantRole === 'admin';

  const [view, setView] = useState<CalendarView>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [mine, setMine] = useState(false);
  const [status, setStatus] = useState<MeetingStatus | ''>('');
  const [type, setType] = useState<MeetingType | ''>('');
  const [staff, setStaff] = useState('');
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [slot, setSlot] = useState<{ start: Date; end: Date; allDay: boolean } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const range = useMemo(() => visibleRange(view, anchor), [view, anchor]);

  const params = useMemo<MeetingQueryParams>(() => ({
    from: range.start.toISOString(),
    to: range.end.toISOString(),
    ...(status && { status }),
    ...(type && { type }),
    ...(mine && { mine: true }),
    ...(staff && { staff }),
  }), [range, status, type, mine, staff]);

  const load = useCallback(() => { dispatch(fetchMeetings(params)); }, [dispatch, params]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isStaff) dispatch(fetchMeetingLookups());
  }, [dispatch, isStaff]);

  // Side panel: what's next in the coming two weeks (independent of the visible range).
  const loadUpcoming = useCallback(() => {
    const now = new Date();
    getMeetingsApi({ from: now.toISOString(), to: addDays(now, 14).toISOString(), status: 'scheduled', ...(isStaff && { mine: true }) })
      .then((r) => setUpcoming(r.data.filter((m) => new Date(m.endAt) >= now).slice(0, 6)))
      .catch(() => setUpcoming([]));
  }, [isStaff]);
  useEffect(() => { loadUpcoming(); }, [loadUpcoming, meetings]);

  // Deep link: /calendar?meeting=<id> (used by emails and notifications).
  useEffect(() => {
    const id = searchParams.get('meeting');
    if (!id) return;
    dispatch(fetchMeetingById(id)).unwrap().then(({ meeting }) => {
      setAnchor(new Date(meeting.startAt));
      setDetailsOpen(true);
    }).catch(() => {});
    setSearchParams((p) => { p.delete('meeting'); return p; }, { replace: true });
  }, [searchParams, dispatch, setSearchParams]);

  // Keyboard: T today · ←/→ · M W D A views
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen || detailsOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = e.key.toLowerCase();
      if (k === 't') setAnchor(new Date());
      else if (e.key === 'ArrowLeft') setAnchor((a) => stepAnchor(view, a, -1));
      else if (e.key === 'ArrowRight') setAnchor((a) => stepAnchor(view, a, 1));
      else if (k === 'm') setView('month');
      else if (k === 'w') setView('week');
      else if (k === 'd') setView('day');
      else if (k === 'a') setView('agenda');
      else if (k === 'c') setView('cards');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, dialogOpen, detailsOpen]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter((m) =>
      [m.title, m.description, m.location, withName(m), personName(m.organizer), ...m.staffAttendees.map((a) => personName(a.user))]
        .filter(Boolean).some((s) => String(s).toLowerCase().includes(q))
    );
  }, [meetings, search]);

  const quickBook = () => { const d = defaultSlot(); openCreate(d.start, d.end, d.allDay); };

  const openCreate = (start: Date, end: Date, allDay: boolean) => {
    setEditing(null);
    setSlot({ start, end, allDay });
    setDialogOpen(true);
  };
  const openDetails = (m: Meeting) => {
    dispatch(fetchMeetingById(m._id));
    setDetailsOpen(true);
  };
  const openEdit = (m: Meeting) => {
    setDetailsOpen(false);
    setEditing(m);
    setSlot(null);
    setDialogOpen(true);
  };
  const gotoDay = (d: Date) => { setAnchor(d); setView('day'); };

  // Permission fallback while the by-id fetch is in flight.
  const perms = currentPermissions ?? {
    canEdit: isStaff && Boolean(currentMeeting) && (isAdmin || personId(currentMeeting!.organizer) === myId || currentMeeting!.staffAttendees.some((a) => personId(a.user) === myId)),
    canDelete: isStaff && Boolean(currentMeeting) && (isAdmin || personId(currentMeeting!.organizer) === myId),
  };

  const viewProps = {
    meetings: visible, anchor, canCreate,
    onSelectMeeting: openDetails, onSelectSlot: openCreate, onSelectDay: gotoDay,
  };

  const activeFilters = [status, type, staff, mine ? 'mine' : ''].filter(Boolean).length;

  return (
    <div className="p-4 lg:p-6 h-[calc(100vh-4rem)] flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-on-surface hidden sm:block">Meeting Book</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Today</Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setAnchor(stepAnchor(view, anchor, -1))} aria-label="Previous"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setAnchor(stepAnchor(view, anchor, 1))} aria-label="Next"><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <h2 className="text-lg font-semibold text-on-surface min-w-[12rem]">{rangeTitle(view, anchor)}</h2>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search meetings…" className={`${INPUT_CLS} pl-8 w-44 lg:w-56`} />
          </div>
          <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1">
            {VIEWS.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setView(v.value)}
                title={`${v.label} (${v.key})`}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  view === v.value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {canCreate && (
            <Button onClick={quickBook}>
              <Plus className="w-4 h-4 mr-2" /> Book meeting
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {isStaff && (
          <button
            type="button"
            onClick={() => setMine((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              mine ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> My meetings
          </button>
        )}
        <select value={status} onChange={(e) => setStatus(e.target.value as MeetingStatus | '')} className={`${INPUT_CLS} py-1.5 text-xs`}>
          <option value="">All statuses</option>
          {(Object.keys(STATUS_META) as MeetingStatus[]).map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as MeetingType | '')} className={`${INPUT_CLS} py-1.5 text-xs`}>
          <option value="">All types</option>
          {(Object.keys(TYPE_META) as MeetingType[]).map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
        </select>
        {isStaff && people.length > 0 && (
          <select value={staff} onChange={(e) => setStaff(e.target.value)} className={`${INPUT_CLS} py-1.5 text-xs max-w-[14rem]`}>
            <option value="">Anyone's calendar</option>
            {people.map((p) => <option key={p._id} value={p._id}>{p.name} · {p.group}</option>)}
          </select>
        )}
        {activeFilters > 0 && (
          <button type="button" onClick={() => { setStatus(''); setType(''); setStaff(''); setMine(false); }} className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface">
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-on-surface-variant">{visible.length} meeting{visible.length === 1 ? '' : 's'} shown</span>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex gap-4">
        <aside className="hidden xl:flex w-64 shrink-0 flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-[1rem] p-4">
            <MiniMonth anchor={anchor} onPick={(d) => { setAnchor(d); if (view === 'month') setView('day'); }} meetings={meetings} />
          </div>
          <div className="bg-surface-container-lowest rounded-[1rem] p-4 flex-1 min-h-0 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">Coming up</p>
            {upcoming.length === 0 ? (
              <p className="text-xs text-on-surface-variant/60 italic">Nothing scheduled in the next two weeks.</p>
            ) : (
              <ul className="space-y-2 overflow-y-auto">
                {upcoming.map((m) => {
                  const c = colorOf(m);
                  const Icon = m.type === 'on_site' ? MapPin : m.type === 'call' ? Phone : Video;
                  return (
                    <li key={m._id}>
                      <button type="button" onClick={() => openDetails(m)} className="w-full text-left flex gap-2 p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                        <span className="w-1 rounded-full shrink-0" style={{ background: c.solid }} />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-on-surface truncate">{m.title}</span>
                          <span className="block text-[11px] text-on-surface-variant truncate">
                            {format(new Date(m.startAt), 'EEE d MMM')} · {m.allDay ? 'All day' : fmtTime(m.startAt)}
                          </span>
                          {withName(m) && <span className="text-[11px] text-on-surface-variant truncate flex items-center gap-1"><Icon className="w-3 h-3" />{withName(m)}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-surface-container-lowest rounded-[1rem] overflow-hidden ring-1 ring-outline-variant/20">
          {view === 'month' && <MonthView {...viewProps} />}
          {view === 'week' && <TimeGridView {...viewProps} days={7} />}
          {view === 'day' && <TimeGridView {...viewProps} days={1} />}
          {view === 'agenda' && <AgendaView {...viewProps} />}
          {view === 'cards' && <CardsView {...viewProps} />}
        </main>
      </div>

      {canCreate && (
        <button
          type="button"
          onClick={quickBook}
          title="Book a meeting"
          aria-label="Book a meeting"
          className="fixed bottom-6 right-6 z-30 h-14 pl-4 pr-6 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 flex items-center gap-2 font-semibold hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Plus className="w-5 h-5" /></span>
          Book meeting
        </button>
      )}

      <MeetingDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setSlot(null); } }}
        meeting={editing}
        slot={slot}
        onSaved={(m) => { setAnchor(new Date(m.startAt)); }}
      />
      <MeetingDetailsDialog
        meeting={currentMeeting}
        open={detailsOpen}
        onOpenChange={(o) => { setDetailsOpen(o); if (!o) dispatch(clearCurrentMeeting()); }}
        canEdit={perms.canEdit}
        canDelete={perms.canDelete}
        onEdit={openEdit}
      />
    </div>
  );
}
