import { useEffect, useMemo, useState } from 'react';
import { addHours, addMinutes, differenceInMinutes, isSameDay } from 'date-fns';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createMeeting, updateMeeting, fetchMeetingLookups, type MeetingSaveRejection } from '@/redux/slices/meetingSlice';
import type { Meeting, MeetingConflict, MeetingGuest, MeetingType, SaveMeetingData, StaffKind } from '@/types/meeting.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchSelect } from '@/components/ui/search-select';
import { toast } from 'sonner';
import { useAccess } from '@/redux/hooks/useAccess';
import {
  AlertTriangle, CalendarPlus, Loader2, MapPin, Phone, Plus, Save, Video, X,
} from 'lucide-react';
import {
  MEETING_COLORS, REMINDER_OPTIONS, fmtRange, fmtTime, fromLocalInputs, personId, toLocalDateInput, toLocalTimeInput,
} from '../calendarUtils';

const DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 30, label: '30m' },
  { minutes: 60, label: '1h' },
  { minutes: 90, label: '1.5h' },
  { minutes: 120, label: '2h' },
  { minutes: 180, label: '3h' },
];

const INPUT_BASE =
  'px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30';
const INPUT_CLS = `w-full ${INPUT_BASE}`;

const TYPES: { value: MeetingType; label: string; icon: React.ReactNode }[] = [
  { value: 'online', label: 'Online', icon: <Video className="w-3.5 h-3.5" /> },
  { value: 'on_site', label: 'On-site', icon: <MapPin className="w-3.5 h-3.5" /> },
  { value: 'call', label: 'Call', icon: <Phone className="w-3.5 h-3.5" /> },
];

type WithKind = 'none' | 'customer' | 'lead';

interface FormState {
  title: string;
  type: MeetingType;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  withKind: WithKind;
  customer: string;
  lead: string;
  staff: string[];
  guests: MeetingGuest[];
  location: string;
  meetingLink: string;
  description: string;
  reminder: string;
  color: string;
}

const blankForm = (start: Date, end: Date, allDay: boolean): FormState => ({
  title: '',
  type: 'online',
  allDay,
  startDate: toLocalDateInput(start),
  startTime: toLocalTimeInput(start),
  endDate: toLocalDateInput(end),
  endTime: toLocalTimeInput(end),
  withKind: 'none',
  customer: '',
  lead: '',
  staff: [],
  guests: [],
  location: '',
  meetingLink: '',
  description: '',
  reminder: '30',
  color: 'blue',
});

const fromMeeting = (m: Meeting): FormState => ({
  title: m.title,
  type: m.type,
  allDay: m.allDay,
  startDate: toLocalDateInput(new Date(m.startAt)),
  startTime: toLocalTimeInput(new Date(m.startAt)),
  endDate: toLocalDateInput(new Date(m.endAt)),
  endTime: toLocalTimeInput(new Date(m.endAt)),
  withKind: m.customer ? 'customer' : m.lead ? 'lead' : 'none',
  customer: m.customer?._id ?? '',
  lead: m.lead?._id ?? '',
  staff: m.staffAttendees.map((a) => personId(a.user)),
  guests: m.guests ?? [],
  location: m.location ?? '',
  meetingLink: m.meetingLink ?? '',
  description: m.description ?? '',
  reminder: m.reminderMinutes == null ? '' : String(m.reminderMinutes),
  color: m.color || 'blue',
});

export interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing meeting to edit; null to create. */
  meeting: Meeting | null;
  /** Pre-filled slot for a new meeting. */
  slot?: { start: Date; end: Date; allDay: boolean } | null;
  onSaved?: (m: Meeting) => void;
}

export default function MeetingDialog({ open, onOpenChange, meeting, slot, onSaved }: MeetingDialogProps) {
  const dispatch = useAppDispatch();
  const { people, contacts, lookupsLoaded, saving } = useAppSelector((s) => s.meetings);
  const { user } = useAppSelector((s) => s.auth);
  // The API offers customers to the people who work tickets
  const worksTickets = useAccess().hasModule('tickets');
  const isEdit = Boolean(meeting);

  const [form, setForm] = useState<FormState>(() => blankForm(new Date(), addHours(new Date(), 1), false));
  const [conflicts, setConflicts] = useState<MeetingConflict[] | null>(null);

  useEffect(() => {
    if (open && !lookupsLoaded) dispatch(fetchMeetingLookups());
  }, [open, lookupsLoaded, dispatch]);

  // Reset the form only when the dialog (re)opens — never while the user is typing.
  useEffect(() => {
    if (!open) return;
    setConflicts(null);
    if (meeting) setForm(fromMeeting(meeting));
    else {
      const start = slot?.start ?? new Date();
      const end = slot?.end ?? addHours(start, 1);
      setForm(blankForm(start, end, slot?.allDay ?? false));
    }
  }, [open, meeting, slot]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const startOf = (f: FormState) => fromLocalInputs(f.startDate, f.allDay ? '00:00' : f.startTime);
  const endOf = (f: FormState) => fromLocalInputs(f.endDate, f.allDay ? '23:59' : f.endTime);
  const withEnd = (f: FormState, e: Date): FormState => ({ ...f, endDate: toLocalDateInput(e), endTime: toLocalTimeInput(e) });

  // End = start + N minutes (the quick-pick buttons and the auto-fix below).
  const setDuration = (minutes: number) => setForm((f) => withEnd(f, addMinutes(startOf(f), minutes)));

  // Changing the end DATE keeps the end time; if that now lands at or before the
  // start (e.g. a 23:00 → 00:00 default pulled back onto the same day), snap the
  // end to start + 1h instead of leaving a silently invalid form.
  const setEndDate = (date: string) =>
    setForm((f) => {
      const next = { ...f, endDate: date };
      if (endOf(next) > startOf(next)) return next;
      const fixed = addHours(startOf(next), 1);
      // The user explicitly picked this day, so don't bounce the end date
      // forward again when start + 1h would cross midnight — end the same day.
      return toLocalDateInput(fixed) === date ? withEnd(next, fixed) : { ...next, endTime: '23:55' };
    });
  const setEndTime = (time: string) => set('endTime', time);

  // Live validation for the "When" block (same rule as submit, shown inline).
  const startVal = startOf(form);
  const endVal = endOf(form);
  const whenError = isNaN(startVal.getTime()) || isNaN(endVal.getTime())
    ? 'Start and end are required'
    : endVal <= startVal
      ? isSameDay(startVal, endVal)
        ? `End time must be after the start time (${fmtTime(startVal)}) — check AM/PM`
        : 'End must be after start — the end date is before the start date'
      : null;
  const durationMin = whenError ? 0 : differenceInMinutes(endVal, startVal);

  // Keep end after start when the start moves (Google keeps the duration).
  const setStart = (date: string, time: string) => {
    setForm((f) => {
      const oldS = fromLocalInputs(f.startDate, f.startTime);
      const oldE = fromLocalInputs(f.endDate, f.endTime);
      const dur = Math.max(30 * 60_000, oldE.getTime() - oldS.getTime());
      const s = fromLocalInputs(date, time);
      const e = new Date(s.getTime() + dur);
      return { ...f, startDate: date, startTime: time, endDate: toLocalDateInput(e), endTime: toLocalTimeInput(e) };
    });
  };

  // Everyone except me is selectable; I'm the organiser of what I create.
  const myId = (user as any)?._id as string | undefined;
  const staffItems = useMemo(
    () => people
      .filter((p) => !(isEdit ? personId(meeting!.organizer) === p._id : myId === p._id))
      .map((p) => ({ _id: p._id, name: `${p.name} · ${p.group}` })),
    [people, myId, isEdit, meeting]
  );
  const kindOf = useMemo(() => new Map(people.map((p) => [p._id, p.kind])), [people]);

  const customerOptions = useMemo(
    () => contacts.customers.map((c) => ({ value: c._id, label: c.companyName, sub: [c.contactPerson, c.email].filter(Boolean).join(' · ') })),
    [contacts.customers]
  );
  const leadOptions = useMemo(
    () => contacts.leads.map((l) => ({ value: l._id, label: l.companyName, sub: [l.contactPersonName, l.email].filter(Boolean).join(' · ') })),
    [contacts.leads]
  );
  const withKinds: { value: WithKind; label: string }[] = [
    { value: 'none', label: 'Internal' },
    ...(customerOptions.length || worksTickets ? [{ value: 'customer' as WithKind, label: 'Customer' }] : []),
    ...(leadOptions.length ? [{ value: 'lead' as WithKind, label: 'Lead' }] : []),
  ];

  const addGuest = () => set('guests', [...form.guests, { name: '', email: '' }]);
  const setGuest = (i: number, patch: Partial<MeetingGuest>) =>
    set('guests', form.guests.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  const removeGuest = (i: number) => set('guests', form.guests.filter((_, idx) => idx !== i));

  const buildPayload = (force: boolean): SaveMeetingData | string => {
    if (!form.title.trim()) return 'Title is required';
    const start = fromLocalInputs(form.startDate, form.allDay ? '00:00' : form.startTime);
    const end = fromLocalInputs(form.endDate, form.allDay ? '23:59' : form.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Start and end are required';
    if (end <= start) return 'End must be after start';
    if (form.withKind === 'customer' && !form.customer) return 'Pick a customer or switch to Internal';
    if (form.withKind === 'lead' && !form.lead) return 'Pick a lead or switch to Internal';
    const guests = form.guests.filter((g) => g.name.trim() || g.email?.trim());
    if (guests.some((g) => !g.name.trim())) return 'Every guest needs a name';
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      location: form.location.trim(),
      meetingLink: form.meetingLink.trim(),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      allDay: form.allDay,
      staffAttendees: form.staff.map((id) => ({ kind: (kindOf.get(id) ?? 'Consultant') as StaffKind, user: id })),
      guests: guests.map((g) => ({ name: g.name.trim(), email: g.email?.trim() || undefined, phone: g.phone?.trim() || undefined })),
      customer: form.withKind === 'customer' ? form.customer : null,
      lead: form.withKind === 'lead' ? form.lead : null,
      reminderMinutes: form.reminder === '' ? null : Number(form.reminder),
      color: form.color,
      force,
    };
  };

  const submit = async (force = false) => {
    const payload = buildPayload(force);
    if (typeof payload === 'string') { toast.error(payload); return; }
    try {
      const saved = isEdit
        ? await dispatch(updateMeeting({ id: meeting!._id, data: payload })).unwrap()
        : await dispatch(createMeeting(payload)).unwrap();
      setConflicts(null);
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      const r = err as MeetingSaveRejection;
      if (r?.conflicts) setConflicts(r.conflicts);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            {isEdit ? 'Edit Meeting' : 'Book a Meeting'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="space-y-5 py-1">
          {/* Title + type */}
          <div className="flex flex-col md:flex-row gap-3">
            <input
              autoFocus
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Add title (e.g. Demo with Acme)"
              className="flex-1 px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-base font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1 shrink-0">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('type', t.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    form.type === t.value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* When */}
          <div className="rounded-xl border border-outline-variant/30 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold text-on-surface-variant w-10">Start</label>
              <input type="date" value={form.startDate} onChange={(e) => setStart(e.target.value, form.startTime)} className={INPUT_BASE} />
              {!form.allDay && (
                <input type="time" step={300} value={form.startTime} onChange={(e) => setStart(form.startDate, e.target.value)} className={INPUT_BASE} />
              )}
              <label className="text-xs font-semibold text-on-surface-variant w-10 md:ml-2">End</label>
              <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setEndDate(e.target.value)} className={INPUT_BASE} />
              {!form.allDay && (
                <input
                  type="time"
                  step={300}
                  value={form.endTime}
                  min={form.endDate === form.startDate ? form.startTime : undefined}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`${INPUT_BASE} ${whenError ? 'border-error ring-2 ring-error/20' : ''}`}
                />
              )}
              <label className="inline-flex items-center gap-2 text-sm text-on-surface ml-auto cursor-pointer">
                <input type="checkbox" checked={form.allDay} onChange={(e) => set('allDay', e.target.checked)} className="accent-primary" />
                All day
              </label>
            </div>
            {!form.allDay && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-on-surface-variant mr-1">Duration</span>
                {DURATIONS.map((d) => (
                  <button
                    key={d.minutes}
                    type="button"
                    onClick={() => setDuration(d.minutes)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors ${
                      durationMin === d.minutes
                        ? 'bg-primary text-on-primary border-primary'
                        : 'border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
            {whenError ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-error">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {whenError}
              </p>
            ) : (
              <p className="text-xs text-on-surface-variant">
                {fmtRange({ startAt: startVal.toISOString(), endAt: endVal.toISOString(), allDay: form.allDay })}
                {!form.allDay && durationMin > 0 && (
                  <span className="opacity-70"> · {durationMin >= 60 ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ''}` : `${durationMin} min`}</span>
                )}
              </p>
            )}
          </div>

          {/* With whom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Meeting with</label>
              <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1 w-fit mb-2">
                {withKinds.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => set('withKind', k.value)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      form.withKind === k.value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              {form.withKind === 'customer' && (
                <SearchSelect value={form.customer} onChange={(v) => set('customer', v)} options={customerOptions} placeholder="Search customers…" />
              )}
              {form.withKind === 'lead' && (
                <SearchSelect value={form.lead} onChange={(v) => set('lead', v)} options={leadOptions} placeholder="Search leads…" />
              )}
              {form.withKind === 'none' && (
                <p className="text-xs text-on-surface-variant">Internal meeting — no customer or lead attached.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Staff attendees</label>
              <MultiSelect
                items={staffItems}
                value={form.staff}
                onChange={(v) => set('staff', v)}
                placeholder="Add colleagues…"
                searchPlaceholder="Search staff…"
                loading={!lookupsLoaded}
              />
              <p className="text-xs text-on-surface-variant">
                {isEdit ? 'The organiser is always included.' : 'You are the organiser and are included automatically.'}
              </p>
            </div>
          </div>

          {/* Guests */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-on-surface">External guests</label>
              <Button type="button" variant="ghost" size="sm" onClick={addGuest}><Plus className="w-3.5 h-3.5 mr-1" />Add guest</Button>
            </div>
            {form.guests.length === 0 && <p className="text-xs text-on-surface-variant">Invite people outside the system by name and email.</p>}
            {form.guests.map((g, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input value={g.name} onChange={(e) => setGuest(i, { name: e.target.value })} placeholder="Name" className={INPUT_CLS} />
                <input type="email" value={g.email ?? ''} onChange={(e) => setGuest(i, { email: e.target.value })} placeholder="Email (for the invite)" className={INPUT_CLS} />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeGuest(i)} aria-label="Remove guest"><X className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>

          {/* Where */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.type !== 'call' && (
              form.type === 'online' ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface">Meeting link</label>
                  <input value={form.meetingLink} onChange={(e) => set('meetingLink', e.target.value)} placeholder="https://teams.microsoft.com/… or Zoom / Meet link" className={INPUT_CLS} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface">Location</label>
                  <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Customer site, office, address…" className={INPUT_CLS} />
                </div>
              )
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Reminder</label>
              <select value={form.reminder} onChange={(e) => set('reminder', e.target.value)} className={INPUT_CLS}>
                {REMINDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Notes + colour */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Notes / agenda</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Agenda, preparation, context…" className={`${INPUT_CLS} resize-y`} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Colour</label>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(MEETING_COLORS).map(([key, c]) => (
                  <button
                    key={key}
                    type="button"
                    title={c.label}
                    onClick={() => set('color', key)}
                    className={`w-7 h-7 rounded-full ring-offset-2 ring-offset-surface transition-transform ${form.color === key ? 'ring-2 ring-on-surface scale-110' : 'hover:scale-105'}`}
                    style={{ background: c.solid }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Conflicts */}
          {conflicts && conflicts.length > 0 && (
            <div className="rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-3 space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-orange-800 dark:text-orange-300">
                <AlertTriangle className="w-4 h-4" /> Some attendees are already booked at this time
              </p>
              <ul className="text-xs text-orange-900 dark:text-orange-200 space-y-1">
                {conflicts.map((c) => (
                  <li key={c._id}>
                    <span className="font-semibold">{c.people.join(', ')}</span> — {c.title} ({fmtRange({ startAt: c.startAt, endAt: c.endAt, allDay: false })})
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={() => setConflicts(null)}>Change time</Button>
                <Button type="button" size="sm" onClick={() => submit(true)} disabled={saving}>Book anyway</Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || Boolean(conflicts?.length) || Boolean(whenError)}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isEdit ? 'Save changes' : 'Book meeting'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
