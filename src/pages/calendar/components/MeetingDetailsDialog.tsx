import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { updateMeetingStatus, deleteMeeting } from '@/redux/slices/meetingSlice';
import type { Meeting } from '@/types/meeting.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Bell, Building2, CalendarDays, CheckCircle2, Clock, Edit, ExternalLink, Loader2, Mail, MapPin, Phone,
  RotateCcw, Trash2, User, UserX, Users, Video, XCircle,
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { colorOf, durationLabel, fmtRange, personName, STATUS_META, TYPE_META } from '../calendarUtils';

const MySwal = withReactContent(Swal);

const INPUT_CLS =
  'w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30';

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{label}</p>
        <div className="text-sm text-on-surface">{children}</div>
      </div>
    </div>
  );
}

export interface MeetingDetailsDialogProps {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (m: Meeting) => void;
}

export default function MeetingDetailsDialog({ meeting, open, onOpenChange, canEdit, canDelete, onEdit }: MeetingDetailsDialogProps) {
  const dispatch = useAppDispatch();
  const { saving } = useAppSelector((s) => s.meetings);
  const [mode, setMode] = useState<'view' | 'complete' | 'cancel' | 'no_show'>('view');
  const [note, setNote] = useState('');

  if (!meeting) return null;
  const c = colorOf(meeting);
  const st = STATUS_META[meeting.status];
  const isPast = new Date(meeting.endAt) < new Date();

  const close = (v: boolean) => { if (!v) { setMode('view'); setNote(''); } onOpenChange(v); };

  const applyStatus = async (status: Meeting['status']) => {
    try {
      await dispatch(updateMeetingStatus({
        id: meeting._id,
        data: status === 'cancelled' ? { status, cancelReason: note } : { status, outcome: note || undefined },
      })).unwrap();
      setMode('view');
      setNote('');
    } catch { /* toast shown in thunk */ }
  };

  const handleDelete = () => {
    MySwal.fire({
      title: `Delete "${meeting.title}"?`,
      html: `<p style="color:#BA1A1A">Attendees will be notified. This cannot be undone.</p>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#BA1A1A', cancelButtonColor: '#434653',
      confirmButtonText: 'Delete meeting', cancelButtonText: 'Keep it', reverseButtons: true,
    }).then((r) => {
      if (r.isConfirmed) dispatch(deleteMeeting(meeting._id)).then(() => close(false));
    });
  };

  const TypeIcon = meeting.type === 'on_site' ? MapPin : meeting.type === 'call' ? Phone : Video;
  const attendees = meeting.staffAttendees.map((a) => personName(a.user)).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        <div className="h-1.5 w-full rounded-t-lg" style={{ background: c.solid }} />
        <div className="p-6 space-y-5">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${st.pill}`}>{st.label}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    <TypeIcon className="w-3 h-3" /> {TYPE_META[meeting.type].label}
                  </span>
                </div>
                <DialogTitle className={`text-xl leading-tight ${meeting.status === 'cancelled' ? 'line-through opacity-70' : ''}`}>{meeting.title}</DialogTitle>
              </div>
              {canEdit && meeting.status !== 'cancelled' && (
                <Button variant="outline" size="sm" onClick={() => onEdit(meeting)} className="shrink-0">
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Row icon={<CalendarDays className="w-3.5 h-3.5" />} label="When">
              {fmtRange(meeting)}
              {!meeting.allDay && <span className="text-on-surface-variant"> · {durationLabel(meeting)}</span>}
            </Row>
            <Row icon={<User className="w-3.5 h-3.5" />} label="Organiser">{personName(meeting.organizer) || '—'}</Row>

            {(meeting.customer || meeting.lead) && (
              <Row icon={<Building2 className="w-3.5 h-3.5" />} label={meeting.customer ? 'Customer' : 'Lead'}>
                <p className="font-semibold">{meeting.customer?.companyName ?? meeting.lead?.companyName}</p>
                <p className="text-xs text-on-surface-variant">
                  {meeting.customer?.contactPerson ?? meeting.lead?.contactPersonName}
                  {(meeting.customer?.email ?? meeting.lead?.email) && ` · ${meeting.customer?.email ?? meeting.lead?.email}`}
                  {(meeting.customer?.phone ?? meeting.lead?.phonePrimary) && ` · ${meeting.customer?.phone ?? meeting.lead?.phonePrimary}`}
                </p>
              </Row>
            )}

            {attendees.length > 0 && (
              <Row icon={<Users className="w-3.5 h-3.5" />} label="Staff attendees">{attendees.join(', ')}</Row>
            )}
            {meeting.guests?.length > 0 && (
              <Row icon={<Mail className="w-3.5 h-3.5" />} label="Guests">
                {meeting.guests.map((g, i) => (
                  <span key={i} className="block">{g.name}{g.email && <span className="text-on-surface-variant"> · {g.email}</span>}</span>
                ))}
              </Row>
            )}
            {meeting.location && <Row icon={<MapPin className="w-3.5 h-3.5" />} label="Location">{meeting.location}</Row>}
            {meeting.meetingLink && (
              <Row icon={<Video className="w-3.5 h-3.5" />} label="Join link">
                <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 break-all">
                  {meeting.meetingLink} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </Row>
            )}
            {meeting.reminderMinutes != null && meeting.status === 'scheduled' && (
              <Row icon={<Bell className="w-3.5 h-3.5" />} label="Reminder">
                {meeting.reminderMinutes >= 1440 ? `${meeting.reminderMinutes / 1440} day` : meeting.reminderMinutes >= 60 ? `${meeting.reminderMinutes / 60} h` : `${meeting.reminderMinutes} min`} before
              </Row>
            )}
          </div>

          {meeting.description && (
            <div className="rounded-xl bg-surface-container-low p-3 text-sm text-on-surface whitespace-pre-wrap">{meeting.description}</div>
          )}
          {meeting.outcome && (
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 text-sm">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-green-800 dark:text-green-300 mb-1">Outcome</p>
              <p className="text-on-surface whitespace-pre-wrap">{meeting.outcome}</p>
            </div>
          )}
          {meeting.status === 'cancelled' && meeting.cancelReason && (
            <div className="rounded-xl bg-surface-container-low p-3 text-sm">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant mb-1">Cancellation reason</p>
              <p className="text-on-surface">{meeting.cancelReason}</p>
            </div>
          )}

          {/* Status change forms */}
          {mode !== 'view' && (
            <div className="rounded-xl border border-outline-variant/30 p-3 space-y-2">
              <p className="text-sm font-semibold text-on-surface">
                {mode === 'complete' ? 'Mark as completed' : mode === 'cancel' ? 'Cancel this meeting' : 'Mark as no-show'}
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={mode === 'cancel' ? 'Reason (sent to attendees)' : 'Outcome / notes from the meeting'}
                className={`${INPUT_CLS} resize-y`}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setMode('view'); setNote(''); }}>Back</Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'cancel' ? 'destructive' : 'default'}
                  disabled={saving}
                  onClick={() => applyStatus(mode === 'complete' ? 'completed' : mode === 'cancel' ? 'cancelled' : 'no_show')}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Confirm
                </Button>
              </div>
            </div>
          )}

          {canEdit && mode === 'view' && (
            <DialogFooter className="flex-wrap gap-2 sm:justify-between">
              <div className="flex gap-2 flex-wrap">
                {meeting.status === 'scheduled' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setMode('complete')}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-600" /> Complete
                    </Button>
                    {isPast && (
                      <Button size="sm" variant="outline" onClick={() => setMode('no_show')}>
                        <UserX className="w-3.5 h-3.5 mr-1.5 text-orange-600" /> No-show
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setMode('cancel')}>
                      <XCircle className="w-3.5 h-3.5 mr-1.5 text-error" /> Cancel meeting
                    </Button>
                  </>
                )}
                {meeting.status !== 'scheduled' && (
                  <Button size="sm" variant="outline" onClick={() => applyStatus('scheduled')} disabled={saving}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reopen
                  </Button>
                )}
              </div>
              {canDelete && (
                <Button size="sm" variant="ghost" className="text-error hover:text-error" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              )}
            </DialogFooter>
          )}
          {!canEdit && (
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5"><Clock className="w-3 h-3" /> Read-only — contact the organiser to change this meeting.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
