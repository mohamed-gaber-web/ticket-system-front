import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, RefreshCw, CalendarClock, Ticket as TicketIcon, Timer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/redux/hooks/hooks';
import { getConsultants } from '@/api/consultantApi';
import { getTickets } from '@/api/ticketApi';
import { getWeekDateRange } from '@/utils/weekUtils';
import type { Consultant } from '@/types/consultant.types';

// Restrict this page to admins only.
const ADMIN_ONLY = true;

// ─── Week helpers ──────────────────────────────────────────────────────────────
// Project convention (see utils/weekUtils.ts): weeks run Saturday → Friday,
// numbered from the first Saturday of the year — same scheme as `scheduledWeek`.
function getSaturdayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = -((day + 1) % 7); // go back to the most-recent Saturday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Local yyyy-mm-dd (NOT toISOString — that converts to UTC and would shift the
// Saturday back to Friday in timezones ahead of UTC, e.g. Egypt UTC+2/+3).
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Bucket key = local date (yyyy-mm-dd) of the week's Saturday
function weekKeyOf(dateStr: string): string {
  return toLocalDateKey(getSaturdayOfWeek(new Date(dateStr)));
}

// First Saturday of a given year (matches weekUtils.getWeekDateRange anchoring)
function firstSaturdayOfYear(year: number): Date {
  const jan1 = new Date(year, 0, 1);
  const dow = jan1.getDay();
  const daysToFirstSat = dow === 6 ? 0 : (6 - dow + 7) % 7;
  return new Date(year, 0, 1 + daysToFirstSat);
}

// Project week number (1-based) for a week's Saturday
function weekNumberOf(saturdayKey: string): number {
  const saturday = new Date(saturdayKey + 'T00:00:00');
  const firstSat = firstSaturdayOfYear(saturday.getFullYear());
  const diffDays = Math.round((saturday.getTime() - firstSat.getTime()) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface WeekCell {
  hours: number;
  count: number;
}

interface ConsultantRow {
  consultant: Consultant;
  totalTickets: number;
  totalHours: number;
  weeks: Record<string, WeekCell>; // weekKey → cell
}

// ─── Heatmap intensity for a cell ──────────────────────────────────────────────
function cellTint(hours: number, max: number): string {
  if (hours <= 0 || max <= 0) return '';
  const ratio = hours / max;
  if (ratio < 0.34) return 'bg-brand-50';
  if (ratio < 0.67) return 'bg-brand-100';
  return 'bg-brand-200 text-brand-800';
}

export default function WeeklyHoursPage() {
  const consultantRole = useAppSelector((state) => state.auth.consultantRole);
  const isAdmin = consultantRole === 'admin';

  const [rows, setRows] = useState<ConsultantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hideEmpty, setHideEmpty] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const consRes = await getConsultants({ limit: 999 } as any);
      const consultants = consRes.data ?? [];

      const built = await Promise.all(
        consultants.map(async (c) => {
          const weeks: Record<string, WeekCell> = {};
          let totalHours = 0;
          let totalTickets = 0;
          try {
            const ticketsRes = await getTickets({ assignedConsultant: c._id, limit: 9999 });
            const tickets = ticketsRes.data ?? [];
            totalTickets = tickets.length;
            for (const t of tickets) {
              const dateStr = t.internalDeliveryDate || t.createdAt;
              if (!dateStr) continue;
              const key = weekKeyOf(dateStr);
              const hrs = typeof t.durationHours === 'number' ? t.durationHours : 0;
              if (!weeks[key]) weeks[key] = { hours: 0, count: 0 };
              weeks[key].hours += hrs;
              weeks[key].count += 1;
              totalHours += hrs;
            }
          } catch {
            /* leave row empty on per-consultant fetch failure */
          }
          // Round accumulated hours to avoid float noise
          for (const k of Object.keys(weeks)) weeks[k].hours = round1(weeks[k].hours);
          return { consultant: c, totalTickets, totalHours: round1(totalHours), weeks } as ConsultantRow;
        })
      );

      setRows(built);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ADMIN_ONLY && !isAdmin) {
      setLoading(false);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters first — all columns/totals below derive from the visible rows
  // so what you see always sums consistently with the footer totals.
  const visibleRows = useMemo(() => {
    let r = rows;
    if (hideEmpty) r = r.filter((row) => row.totalTickets > 0);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((row) => row.consultant.fullName.toLowerCase().includes(q));
    // Sort by total hours desc for a meaningful default order
    return [...r].sort((a, b) => b.totalHours - a.totalHours);
  }, [rows, hideEmpty, search]);

  // All week keys (across visible rows) that have data, sorted newest-first
  const weekKeys = useMemo(() => {
    const set = new Set<string>();
    visibleRows.forEach((r) => Object.keys(r.weeks).forEach((k) => set.add(k)));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1)); // descending (newest first)
  }, [visibleRows]);

  // Per-week totals across visible consultants + grand total
  const weekTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    visibleRows.forEach((r) =>
      Object.entries(r.weeks).forEach(([k, cell]) => {
        totals[k] = round1((totals[k] ?? 0) + cell.hours);
      })
    );
    return totals;
  }, [visibleRows]);

  const grandTotalHours = useMemo(
    () => round1(visibleRows.reduce((s, r) => s + r.totalHours, 0)),
    [visibleRows]
  );

  // Max single-cell value for heatmap scaling
  const maxCellHours = useMemo(() => {
    let max = 0;
    visibleRows.forEach((r) => Object.values(r.weeks).forEach((c) => { if (c.hours > max) max = c.hours; }));
    return max;
  }, [visibleRows]);

  const currentWeekKey = toLocalDateKey(getSaturdayOfWeek(new Date()));

  if (ADMIN_ONLY && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 text-center p-8">
        <div className="h-16 w-16 rounded-full bg-surface-container-high flex items-center justify-center">
          <CalendarClock className="h-7 w-7 text-on-surface-variant" />
        </div>
        <h2 className="text-xl font-semibold text-on-surface">Access Restricted</h2>
        <p className="text-on-surface-variant max-w-sm">
          Weekly hours are only available to administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Weekly Hours</h1>
          <p className="text-on-surface-variant mt-1">
            Total ticket duration hours per consultant, broken down by week
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" disabled={loading} className="gap-2">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Controls */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <Input
            placeholder="Search consultant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
            className="h-4 w-4 rounded border-outline-variant accent-primary"
          />
          Hide consultants with no tickets
        </label>
      </div>

      {/* Matrix */}
      <div className="bg-surface-container-lowest rounded-[1rem] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <CalendarClock className="h-12 w-12 opacity-30 mb-4" />
            <p className="text-sm font-medium">No consultant data to display</p>
          </div>
        ) : weekKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <CalendarClock className="h-12 w-12 opacity-30 mb-4" />
            <p className="text-sm font-medium">No tickets with dates found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="sticky left-0 z-10 bg-surface-container-low px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider min-w-[220px]">
                    Consultant
                  </th>
                  {weekKeys.map((wk) => (
                    <th
                      key={wk}
                      className={cn(
                        'px-4 py-3 text-center text-xs font-medium uppercase tracking-wider whitespace-nowrap',
                        wk === currentWeekKey ? 'text-brand-700' : 'text-on-surface-variant'
                      )}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-bold">W{weekNumberOf(wk)}</span>
                        <span className="normal-case text-[10px] font-normal text-on-surface-variant/80">
                          {getWeekDateRange(weekNumberOf(wk), new Date(wk + 'T00:00:00').getFullYear())}
                        </span>
                        {wk === currentWeekKey && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 normal-case">
                            Current
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {visibleRows.map((row) => (
                  <tr key={row.consultant._id} className="hover:bg-surface-container-low transition-colors group">
                    {/* Consultant cell — sticky */}
                    <td className="sticky left-0 z-10 bg-surface-container-lowest group-hover:bg-surface-container-low px-6 py-4 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-brand-700">
                            {(row.consultant.firstName?.[0] ?? '') + (row.consultant.lastName?.[0] ?? '')}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {row.consultant.fullName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant">
                              <TicketIcon className="w-3 h-3" />
                              {row.totalTickets} ticket{row.totalTickets !== 1 ? 's' : ''}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600">
                              <Timer className="w-3 h-3" />
                              {row.totalHours}h
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Week cells */}
                    {weekKeys.map((wk) => {
                      const cell = row.weeks[wk];
                      return (
                        <td
                          key={wk}
                          className={cn(
                            'px-4 py-4 text-center align-middle',
                            cell ? cellTint(cell.hours, maxCellHours) : ''
                          )}
                        >
                          {cell && cell.hours > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-semibold text-on-surface">{cell.hours}h</span>
                              <span className="text-[10px] text-on-surface-variant">
                                {cell.count} ticket{cell.count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          ) : cell ? (
                            <span className="text-[10px] text-on-surface-variant/60">
                              {cell.count} ticket{cell.count !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant/30 text-sm">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {/* Totals footer */}
              <tfoot>
                <tr className="bg-surface-container-low border-t-2 border-surface-container-high font-semibold">
                  <td className="sticky left-0 z-10 bg-surface-container-low px-6 py-3 text-sm text-on-surface">
                    <div className="flex items-center justify-between gap-4">
                      <span>Total</span>
                      <span className="text-brand-600">{grandTotalHours}h</span>
                    </div>
                  </td>
                  {weekKeys.map((wk) => (
                    <td key={wk} className="px-4 py-3 text-center text-sm text-on-surface">
                      {weekTotals[wk] ? `${weekTotals[wk]}h` : <span className="text-on-surface-variant/30">—</span>}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-on-surface-variant/70">
        Weeks run Saturday–Friday and are numbered (W#) from the first Saturday of the year — the same scheme as the ticket
        scheduled week. A ticket counts toward the week of its internal delivery date (or creation date if not set), and hours
        are summed from each ticket's duration.
      </p>
    </div>
  );
}
