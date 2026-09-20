import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, isSameDay, isSameMonth, isToday, startOfDay } from 'date-fns';
import { Check, MapPin, Phone, Video, Users, CalendarX2, CalendarDays, Clock, Timer, User } from 'lucide-react';
import type { Meeting } from '@/types/meeting.types';
import {
  colorOf, daysBetween, durationLabel, fmtTime, isBarEvent, layoutDay, occursOn, personName, withName, STATUS_META, TYPE_META,
  visibleRange, WEEK_STARTS_ON,
} from '../calendarUtils';

const HOUR_PX = 48;
const SNAP_MIN = 30;

export interface ViewProps {
  meetings: Meeting[];
  anchor: Date;
  canCreate: boolean;
  onSelectMeeting: (m: Meeting) => void;
  onSelectSlot: (start: Date, end: Date, allDay: boolean) => void;
  onSelectDay: (day: Date) => void;
}

const TypeIcon = ({ type, className = 'w-3 h-3' }: { type: Meeting['type']; className?: string }) =>
  type === 'on_site' ? <MapPin className={className} /> : type === 'call' ? <Phone className={className} /> : <Video className={className} />;

/** Second line of a day card: when it runs and for how long. */
const cardMeta = (m: Meeting, day?: Date): string => {
  const s = new Date(m.startAt);
  const e = new Date(m.endAt);
  if (m.allDay) {
    const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000));
    return days > 1 ? `All day · ${days} days (${format(s, 'MMM d')} – ${format(e, 'MMM d')})` : 'All day';
  }
  if (!isSameDay(s, e)) {
    // Crosses midnight: keep it short so the duration still fits in a day cell.
    const extraDays = Math.round((startOfDay(e).getTime() - startOfDay(s).getTime()) / 86_400_000);
    return `${fmtTime(s)} – ${fmtTime(e)} (+${extraDays}d) · ${durationLabel(m)}`;
  }
  const dayPrefix = day && !isSameDay(s, day) ? `${format(s, 'MMM d')} · ` : '';
  return `${dayPrefix}${fmtTime(s)} – ${fmtTime(e)} · ${durationLabel(m)}`;
};

/** Mini-card used inside day cells (month grid) and the all-day rows. */
function EventCard({ m, day, onClick }: { m: Meeting; day?: Date; onClick: () => void }) {
  const c = colorOf(m);
  const cancelled = m.status === 'cancelled';
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`${m.title}\n${cardMeta(m, day)}${withName(m) ? `\n${withName(m)}` : ''}`}
      className={`w-full text-left rounded-lg px-2 py-1.5 border-l-4 shadow-sm transition-opacity hover:opacity-85 ${cancelled ? 'opacity-55' : ''}`}
      style={{ background: c.tint, borderColor: c.solid }}
    >
      <p className={`text-[13px] font-bold leading-[18px] truncate ${cancelled ? 'line-through' : ''}`} style={{ color: c.text }}>
        {m.status === 'completed' && <Check className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />}
        {m.title}
      </p>
      <p className="text-[11px] font-medium leading-4 text-on-surface truncate">{cardMeta(m, day)}</p>
    </button>
  );
}

// ── Month ───────────────────────────────────────────────────────────────────
export function MonthView({ meetings, anchor, canCreate, onSelectMeeting, onSelectSlot, onSelectDay }: ViewProps) {
  const { start } = visibleRange('month', anchor);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(start, i)), [start]);
  const MAX = 3;

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 border-b border-outline-variant/30">
        {days.slice(0, 7).map((d) => (
          <div key={d.toISOString()} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant text-center">
            {format(d, 'EEE')}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto" style={{ gridAutoRows: 'minmax(150px, 1fr)' }}>
        {days.map((day) => {
          const dayEvents = meetings.filter((m) => occursOn(m, day));
          const visible = dayEvents.slice(0, MAX);
          const extra = dayEvents.length - visible.length;
          const inMonth = isSameMonth(day, anchor);
          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                if (!canCreate) return;
                const s = new Date(day); s.setHours(9, 0, 0, 0);
                const e = new Date(day); e.setHours(10, 0, 0, 0);
                onSelectSlot(s, e, false);
              }}
              className={`group border-b border-r border-outline-variant/20 p-1.5 min-h-0 flex flex-col gap-1 overflow-hidden ${
                inMonth ? 'bg-surface-container-lowest' : 'bg-surface-container-low/40'
              } ${canCreate ? 'cursor-pointer hover:bg-surface-container-low' : ''}`}
            >
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelectDay(day); }}
                  className={`w-7 h-7 rounded-full text-sm font-semibold flex items-center justify-center transition-colors ${
                    isToday(day) ? 'bg-primary text-on-primary' : inMonth ? 'text-on-surface hover:bg-surface-container' : 'text-on-surface-variant/50'
                  }`}
                >
                  {format(day, 'd')}
                </button>
                {dayEvents.length > 0 && <span className="text-[10px] text-on-surface-variant/60">{dayEvents.length}</span>}
              </div>
              {visible.map((m) => <EventCard key={m._id} m={m} day={day} onClick={() => onSelectMeeting(m)} />)}
              {extra > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelectDay(day); }}
                  className="text-xs font-semibold text-primary px-1.5 text-left hover:underline"
                >
                  +{extra} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week / Day (time grid) ──────────────────────────────────────────────────
export function TimeGridView({ meetings, anchor, canCreate, onSelectMeeting, onSelectSlot, onSelectDay, days: dayCount }: ViewProps & { days: 1 | 7 }) {
  const { start, end } = visibleRange(dayCount === 7 ? 'week' : 'day', anchor);
  const days = useMemo(() => daysBetween(start, end), [start, end]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Open on the working morning and keep the "now" line moving.
    if (scrollRef.current) scrollRef.current.scrollTop = 7.5 * HOUR_PX;
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [anchor, dayCount]);

  const barEvents = useMemo(() => meetings.filter(isBarEvent), [meetings]);
  const timed = useMemo(() => meetings.filter((m) => !isBarEvent(m)), [meetings]);
  const hasBars = days.some((d) => barEvents.some((m) => occursOn(m, d)));

  const slotFromClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = Math.floor(((e.clientY - rect.top) / HOUR_PX) * 60 / SNAP_MIN) * SNAP_MIN;
    const s = new Date(startOfDay(day).getTime() + minutes * 60_000);
    const en = new Date(s.getTime() + 60 * 60_000);
    onSelectSlot(s, en, false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid border-b border-outline-variant/30" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onSelectDay(d)}
            className="py-2 text-center hover:bg-surface-container-low transition-colors"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{format(d, 'EEE')}</p>
            <p className={`mx-auto mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-base font-bold ${
              isToday(d) ? 'bg-primary text-on-primary' : 'text-on-surface'
            }`}>{format(d, 'd')}</p>
          </button>
        ))}
      </div>

      {/* All-day / multi-day row */}
      {hasBars && (
        <div className="grid border-b border-outline-variant/30 bg-surface-container-low/30" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="text-[10px] text-on-surface-variant px-2 py-1.5 text-right">all-day</div>
          {days.map((d) => (
            <div
              key={d.toISOString()}
              className={`p-1.5 space-y-1 border-l border-outline-variant/20 ${canCreate ? 'cursor-pointer hover:bg-surface-container-low' : ''}`}
              onClick={() => canCreate && onSelectSlot(startOfDay(d), startOfDay(d), true)}
            >
              {barEvents.filter((m) => occursOn(m, d)).map((m) => (
                <EventCard key={m._id} m={m} day={d} onClick={() => onSelectMeeting(m)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable hours */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid relative" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`, height: 24 * HOUR_PX }}>
          {/* Hour gutter */}
          <div className="relative">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-on-surface-variant" style={{ top: h * HOUR_PX }}>
                {h === 0 ? '' : format(new Date(2000, 0, 1, h), 'h a')}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const positioned = layoutDay(timed.filter((m) => occursOn(m, day)), day);
            const showNow = isSameDay(day, now);
            const nowTop = (now.getHours() * 60 + now.getMinutes()) * (HOUR_PX / 60);
            return (
              <div
                key={day.toISOString()}
                className={`relative border-l border-outline-variant/20 ${canCreate ? 'cursor-pointer' : ''}`}
                onClick={(e) => canCreate && slotFromClick(day, e)}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-outline-variant/15" style={{ top: h * HOUR_PX, height: HOUR_PX }}>
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-outline-variant/10" />
                  </div>
                ))}

                {positioned.map(({ item: m, top, height, col, cols }) => {
                  const c = colorOf(m);
                  const muted = m.status === 'cancelled';
                  const width = 100 / cols;
                  return (
                    <button
                      key={m._id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelectMeeting(m); }}
                      title={`${m.title} · ${fmtTime(m.startAt)} – ${fmtTime(m.endAt)}`}
                      className={`absolute rounded-md px-1.5 py-1 text-left overflow-hidden text-white shadow-sm ring-1 ring-white/70 transition-opacity hover:opacity-90 ${muted ? 'opacity-50' : ''}`}
                      style={{
                        top: top * (HOUR_PX / 60),
                        height: height * (HOUR_PX / 60) - 2,
                        left: `calc(${col * width}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        background: c.solid,
                      }}
                    >
                      <p className={`text-xs font-bold leading-tight truncate ${muted ? 'line-through' : ''}`}>{m.title}</p>
                      {height >= 40 && (
                        <p className="text-[11px] opacity-95 truncate">
                          {fmtTime(m.startAt)} – {fmtTime(m.endAt)} · {durationLabel(m)}
                        </p>
                      )}
                      {height >= 60 && withName(m) && (
                        <p className="text-[11px] opacity-95 truncate flex items-center gap-1"><Users className="w-3 h-3" />{withName(m)}</p>
                      )}
                    </button>
                  );
                })}

                {showNow && (
                  <div className="absolute inset-x-0 pointer-events-none z-10" style={{ top: nowTop }}>
                    <div className="h-px bg-error" />
                    <div className="w-2 h-2 rounded-full bg-error -mt-1 -ml-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Agenda ──────────────────────────────────────────────────────────────────
export function AgendaView({ meetings, anchor, onSelectMeeting, canCreate, onSelectSlot }: ViewProps) {
  const { start, end } = visibleRange('agenda', anchor);
  const groups = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const day of daysBetween(start, end)) {
      const list = meetings.filter((m) => occursOn(m, day));
      if (list.length) map.set(day.toISOString(), list);
    }
    return [...map.entries()];
  }, [meetings, start, end]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3">
          <CalendarX2 className="w-5 h-5 text-on-surface-variant/50" />
        </div>
        <p className="text-sm font-medium text-on-surface-variant">No meetings in this period</p>
        {canCreate && (
          <button
            type="button"
            onClick={() => { const s = new Date(anchor); s.setHours(9, 0, 0, 0); onSelectSlot(s, new Date(s.getTime() + 3_600_000), false); }}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Book one now
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto divide-y divide-outline-variant/15">
      {groups.map(([iso, list]) => {
        const day = new Date(iso);
        return (
          <div key={iso} className="flex gap-4 px-4 py-3">
            <div className="w-16 shrink-0 text-center">
              <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">{format(day, 'EEE')}</p>
              <p className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold ${isToday(day) ? 'bg-primary text-on-primary' : 'text-on-surface'}`}>
                {format(day, 'd')}
              </p>
              <p className="text-[11px] text-on-surface-variant">{format(day, 'MMM')}</p>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {list.map((m) => {
                const c = colorOf(m);
                const st = STATUS_META[m.status];
                return (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => onSelectMeeting(m)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-low text-left transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.solid }} />
                    <span className="w-32 shrink-0 text-xs text-on-surface-variant whitespace-nowrap">
                      {m.allDay ? 'All day' : `${fmtTime(m.startAt)} – ${fmtTime(m.endAt)}`}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm font-medium text-on-surface truncate ${m.status === 'cancelled' ? 'line-through opacity-60' : ''}`}>{m.title}</span>
                      <span className="block text-xs text-on-surface-variant truncate">
                        <TypeIcon type={m.type} className="inline w-3 h-3 mr-1 -mt-0.5" />
                        {TYPE_META[m.type].short}
                        {withName(m) && ` · ${withName(m)}`}
                        {personName(m.organizer) && ` · ${personName(m.organizer)}`}
                      </span>
                    </span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.pill}`}>{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────
export function CardsView({ meetings, anchor, onSelectMeeting, canCreate, onSelectSlot }: ViewProps) {
  const { start, end } = visibleRange('cards', anchor);
  const list = useMemo(
    () => meetings
      .filter((m) => new Date(m.startAt) <= end && new Date(m.endAt) >= start)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [meetings, start, end]
  );

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3">
          <CalendarX2 className="w-5 h-5 text-on-surface-variant/50" />
        </div>
        <p className="text-sm font-medium text-on-surface-variant">No meetings in this period</p>
        {canCreate && (
          <button
            type="button"
            onClick={() => { const s = new Date(anchor); s.setHours(9, 0, 0, 0); onSelectSlot(s, new Date(s.getTime() + 3_600_000), false); }}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Book one now
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {list.map((m) => {
          const c = colorOf(m);
          const st = STATUS_META[m.status];
          const s = new Date(m.startAt);
          const e = new Date(m.endAt);
          const sameDay = isSameDay(s, e);
          const cancelled = m.status === 'cancelled';
          const attendees = m.staffAttendees.map((a) => personName(a.user)).filter(Boolean);
          return (
            <button
              key={m._id}
              type="button"
              onClick={() => onSelectMeeting(m)}
              className={`group text-left rounded-[1rem] bg-surface-container-lowest ring-1 ring-outline-variant/20 hover:ring-primary/40 hover:shadow-md transition-all overflow-hidden flex flex-col ${cancelled ? 'opacity-70' : ''}`}
            >
              <div className="h-1.5 w-full" style={{ background: c.solid }} />
              <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Title + status */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-bold text-on-surface leading-snug line-clamp-2 ${cancelled ? 'line-through' : ''}`}>{m.title}</h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.pill}`}>{st.label}</span>
                </div>

                {/* Date / time / duration */}
                <div className="rounded-lg bg-surface-container-low px-3 py-2 space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                    {sameDay ? format(s, 'EEE, MMM d, yyyy') : `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`}
                    {isToday(s) && <span className="ml-auto text-[10px] font-bold uppercase text-primary">Today</span>}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {m.allDay ? 'All day' : `${fmtTime(s)} – ${fmtTime(e)}`}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <Timer className="w-3.5 h-3.5 shrink-0" />
                    {m.allDay ? `${Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000))} day(s)` : durationLabel(m)}
                  </p>
                </div>

                {/* Meta */}
                <div className="space-y-1 text-xs text-on-surface-variant mt-auto">
                  <p className="flex items-center gap-2">
                    <TypeIcon type={m.type} className="w-3.5 h-3.5 shrink-0" />
                    {TYPE_META[m.type].label}
                    {m.location && <span className="truncate">· {m.location}</span>}
                  </p>
                  {withName(m) && (
                    <p className="flex items-center gap-2 truncate">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium text-on-surface truncate">{withName(m)}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2 truncate">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {personName(m.organizer) || '—'}
                      {attendees.length > 0 && <span className="opacity-70"> +{attendees.length} attendee{attendees.length === 1 ? '' : 's'}</span>}
                    </span>
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { WEEK_STARTS_ON };
