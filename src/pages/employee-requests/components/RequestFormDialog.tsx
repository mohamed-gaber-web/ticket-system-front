import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plane, Clock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createEmployeeRequest } from '@/redux/slices/employeeRequestSlice';
import type {
  EmployeeRequestType,
  CreateEmployeeRequestData,
} from '@/types/employeeRequest.types';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: EmployeeRequestType;
}

const empty = {
  startDate: '',
  endDate: '',
  date: '',
  fromTime: '',
  toTime: '',
  reason: '',
};

export default function RequestFormDialog({ open, onClose, defaultType = 'vacation' }: Props) {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.employeeRequests);
  const [type, setType] = useState<EmployeeRequestType>(defaultType);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setForm(empty);
      setError('');
    }
  }, [open, defaultType]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Live preview of the computed duration
  const vacationDays =
    form.startDate && form.endDate && new Date(form.endDate) >= new Date(form.startDate)
      ? Math.floor(
          (new Date(form.endDate).setHours(0, 0, 0, 0) -
            new Date(form.startDate).setHours(0, 0, 0, 0)) /
            86400000
        ) + 1
      : 0;

  const excuseHours = (() => {
    if (!form.fromTime || !form.toTime) return 0;
    const [fh, fm] = form.fromTime.split(':').map(Number);
    const [th, tm] = form.toTime.split(':').map(Number);
    return Math.max(0, (th * 60 + tm - (fh * 60 + fm)) / 60);
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let data: CreateEmployeeRequestData;
    if (type === 'vacation') {
      if (!form.startDate || !form.endDate) { setError('Start and end dates are required'); return; }
      if (new Date(form.endDate) < new Date(form.startDate)) { setError('End date cannot be before start date'); return; }
      data = { type: 'vacation', startDate: form.startDate, endDate: form.endDate, reason: form.reason || undefined };
    } else {
      if (!form.date || !form.fromTime || !form.toTime) { setError('Date, from and to times are required'); return; }
      if (excuseHours <= 0) { setError('To time must be after from time'); return; }
      data = { type: 'excuse', date: form.date, fromTime: form.fromTime, toTime: form.toTime, reason: form.reason || undefined };
    }

    const result = await dispatch(createEmployeeRequest(data));
    if (createEmployeeRequest.fulfilled.match(result)) onClose();
  };

  const typeButton = (value: EmployeeRequestType, label: string, Icon: typeof Plane) => (
    <button
      type="button"
      onClick={() => setType(value)}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
        type === value
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-surface/95">
        <DialogHeader>
          <DialogTitle>New Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2">
            {typeButton('vacation', 'Vacation', Plane)}
            {typeButton('excuse', 'Excuse', Clock)}
          </div>

          {type === 'vacation' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date <span className="text-destructive">*</span></Label>
                <Input id="startDate" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date <span className="text-destructive">*</span></Label>
                <Input id="endDate" type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} />
              </div>
              {vacationDays > 0 && (
                <p className="col-span-2 text-xs text-on-surface-variant">
                  Duration: <span className="font-semibold text-on-surface">{vacationDays} day{vacationDays > 1 ? 's' : ''}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-3 sm:col-span-1">
                <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                <Input id="date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fromTime">From <span className="text-destructive">*</span></Label>
                <Input id="fromTime" type="time" value={form.fromTime} onChange={(e) => set('fromTime', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="toTime">To <span className="text-destructive">*</span></Label>
                <Input id="toTime" type="time" value={form.toTime} onChange={(e) => set('toTime', e.target.value)} />
              </div>
              {excuseHours > 0 && (
                <p className="col-span-3 text-xs text-on-surface-variant">
                  Duration: <span className="font-semibold text-on-surface">{excuseHours} hour{excuseHours !== 1 ? 's' : ''}</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              placeholder="Optional note for the approver…"
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit Request'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
