export function getWeekDateRange(weekNum: number, year = new Date().getFullYear()): string {
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay();
  const daysToFirstSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7;
  const firstSat = new Date(year, 0, 1 + daysToFirstSat);
  const start = new Date(firstSat);
  start.setDate(firstSat.getDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Inverse of getWeekDateRange: the week number (1..maxWeek) that contains the
 * given date, using the same Saturday-start weeks. Days before the year's first
 * Saturday fall into week 1. Returns null for an empty/invalid date.
 * Tasks cap at 52 weeks, tickets at 53 (see the respective models).
 */
export function getWeekNumber(dateStr?: string, maxWeek = 52): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay();
  const daysToFirstSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7;
  const firstSat = new Date(year, 0, 1 + daysToFirstSat);
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dayStart.getTime() - firstSat.getTime()) / 86_400_000);
  return Math.min(maxWeek, Math.max(1, Math.floor(diffDays / 7) + 1));
}
