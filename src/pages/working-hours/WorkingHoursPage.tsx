import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchWorkingHours,
  saveWorkingHours,
  fetchHolidays,
  addHoliday,
  removeHoliday,
} from '@/redux/slices/workingHoursSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Trash2, Plus, CalendarDays } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { UpdateWorkingHoursData } from '@/types/workingHours.types';

const MySwal = withReactContent(Swal);

const DAY_OPTIONS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

export default function WorkingHoursPage() {
  const dispatch = useAppDispatch();
  const { config, holidays, loading, holidaysLoading } = useAppSelector(
    (state) => state.workingHours
  );

  // Settings form state
  const [form, setForm] = useState<UpdateWorkingHoursData>({
    workStartTime: '09:00',
    workEndTime: '17:00',
    lastTicketAcceptanceTime: '13:00',
    weekendDays: [5, 6],
    estimationDays: 2,
    reminderBeforeDays: 1,
    autoCloseDays: 3,
    pendingReminderIntervalDays: 2,
  });

  // New holiday form state
  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });

  useEffect(() => {
    dispatch(fetchWorkingHours());
    dispatch(fetchHolidays());
  }, [dispatch]);

  // Sync form when config loads
  useEffect(() => {
    if (config) {
      setForm({
        workStartTime: config.workStartTime,
        workEndTime: config.workEndTime,
        lastTicketAcceptanceTime: config.lastTicketAcceptanceTime,
        weekendDays: config.weekendDays,
        estimationDays: config.estimationDays,
        reminderBeforeDays: config.reminderBeforeDays,
        autoCloseDays: config.autoCloseDays,
        pendingReminderIntervalDays: config.pendingReminderIntervalDays,
      });
    }
  }, [config]);

  const handleWeekendDayToggle = (dayValue: number) => {
    const current = form.weekendDays ?? [];
    const updated = current.includes(dayValue)
      ? current.filter((d) => d !== dayValue)
      : [...current, dayValue];
    setForm((prev) => ({ ...prev, weekendDays: updated }));
  };

  const handleSaveSettings = () => {
    dispatch(saveWorkingHours(form));
  };

  const handleAddHoliday = () => {
    if (!newHoliday.date || !newHoliday.description.trim()) return;
    dispatch(addHoliday({ date: newHoliday.date, description: newHoliday.description.trim() })).then(
      (result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          setNewHoliday({ date: '', description: '' });
        }
      }
    );
  };

  const handleDeleteHoliday = (id: string, description: string) => {
    MySwal.fire({
      title: 'Delete Holiday?',
      html: `<p>Remove <strong>${description}</strong> from holidays?</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(removeHoliday(id));
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Working Hours Setup</h1>
          <p className="text-on-surface-variant mt-1">
            Configure working hours, estimation rules, and public holidays
          </p>
        </div>
        <Button onClick={handleSaveSettings} disabled={loading} className="gap-2">
          <Save className="h-4 w-4" />
          {loading ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {/* Settings Card */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-6 space-y-6">
        {/* Time Settings Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="form-label">Work Start Time</label>
            <Input
              type="time"
              value={form.workStartTime ?? '09:00'}
              onChange={(e) => setForm((p) => ({ ...p, workStartTime: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="form-label">Work End Time</label>
            <Input
              type="time"
              value={form.workEndTime ?? '17:00'}
              onChange={(e) => setForm((p) => ({ ...p, workEndTime: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="form-label">Last Ticket Acceptance</label>
            <Input
              type="time"
              value={form.lastTicketAcceptanceTime ?? '13:00'}
              onChange={(e) => setForm((p) => ({ ...p, lastTicketAcceptanceTime: e.target.value }))}
            />
            <p className="text-xs text-on-surface-variant">
              Tickets created after this time → next working day
            </p>
          </div>
        </div>

        {/* Weekend Days */}
        <div className="space-y-2">
          <label className="form-label">Weekend Days</label>
          <p className="text-xs text-on-surface-variant mb-2">
            Select days that are off — hold Ctrl to select multiple
          </p>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map((day) => {
              const selected = (form.weekendDays ?? []).includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleWeekendDayToggle(day.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selected
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-container border-outline-variant text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Numeric Settings Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="form-label">Estimation Days</label>
            <Input
              type="number"
              min={1}
              value={form.estimationDays ?? 2}
              onChange={(e) => setForm((p) => ({ ...p, estimationDays: Number(e.target.value) }))}
            />
            <p className="text-xs text-on-surface-variant">Working days per ticket</p>
          </div>
          <div className="space-y-1.5">
            <label className="form-label">Reminder Before (Days)</label>
            <Input
              type="number"
              min={0}
              value={form.reminderBeforeDays ?? 1}
              onChange={(e) => setForm((p) => ({ ...p, reminderBeforeDays: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="form-label">Auto Close (Days)</label>
            <Input
              type="number"
              min={1}
              value={form.autoCloseDays ?? 3}
              onChange={(e) => setForm((p) => ({ ...p, autoCloseDays: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="form-label">Pending Reminder Interval</label>
            <Input
              type="number"
              min={1}
              value={form.pendingReminderIntervalDays ?? 2}
              onChange={(e) =>
                setForm((p) => ({ ...p, pendingReminderIntervalDays: Number(e.target.value) }))
              }
            />
          </div>
        </div>
      </div>

      {/* Holidays Section */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-on-surface-variant" />
            <h2 className="text-lg font-semibold text-on-surface">Manual Holidays</h2>
          </div>
        </div>

        {/* Holiday Table */}
        {holidaysLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-outline-variant/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/30">
                  <th className="text-left px-4 py-3 font-semibold text-on-surface w-40">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-on-surface">Description</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {holidays.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-on-surface-variant">
                      No holidays configured yet
                    </td>
                  </tr>
                )}
                {holidays.map((holiday) => (
                  <tr
                    key={holiday._id}
                    className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-4 py-3 text-on-surface font-medium">
                      {formatDate(holiday.date)}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{holiday.description}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteHoliday(holiday._id, holiday.description)}
                        className="p-1.5 rounded-md text-error hover:bg-error/10 transition-colors"
                        title="Delete holiday"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Add Holiday Row */}
                <tr className="border-t-2 border-outline-variant/40 bg-surface-container-lowest/50">
                  <td className="px-4 py-3">
                    <Input
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday((p) => ({ ...p, date: e.target.value }))}
                      className="text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="text"
                      placeholder="Holiday description"
                      value={newHoliday.description}
                      onChange={(e) =>
                        setNewHoliday((p) => ({ ...p, description: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleAddHoliday()}
                      className="text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      onClick={handleAddHoliday}
                      disabled={!newHoliday.date || !newHoliday.description.trim() || holidaysLoading}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
