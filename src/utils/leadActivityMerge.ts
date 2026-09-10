// Merges manually-logged CallLog/FollowUp entries with status-change entries
// that represent the same kind of activity (flagged `.call`/`.fu` in the
// workflow config), so the Calls/Follow-ups tabs show one unified timeline.
// Emails/Attachments tabs are NOT merged — those stay purely their own
// collections, unlike the simulation's placeholder mail/att flags.
import type { CallLog, FollowUp, LeadStatusHistoryEntry } from '@/types/teleSales.types';
import { LEAD_STATUS_WORKFLOW } from '@/config/leadStatusWorkflow';

export interface MergedCallRow {
  id: string;
  kind: 'manual' | 'status';
  ts: string;
  manual?: CallLog;
  statusEntry?: LeadStatusHistoryEntry;
}

export function mergeCallEntries(callLogs: CallLog[], history: LeadStatusHistoryEntry[]): MergedCallRow[] {
  const manualRows: MergedCallRow[] = callLogs.map((c) => ({ id: `call-${c._id}`, kind: 'manual', ts: c.callDate, manual: c }));
  const statusRows: MergedCallRow[] = history
    .filter((h) => LEAD_STATUS_WORKFLOW[h.newStatus]?.call)
    .map((h) => ({ id: `status-${h._id}`, kind: 'status', ts: h.changedAt, statusEntry: h }));
  return [...manualRows, ...statusRows].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

export interface MergedFollowUpRow {
  id: string;
  kind: 'manual' | 'status';
  ts: string;
  manual?: FollowUp;
  statusEntry?: LeadStatusHistoryEntry;
}

export function mergeFollowUpEntries(followUps: FollowUp[], history: LeadStatusHistoryEntry[]): MergedFollowUpRow[] {
  const manualRows: MergedFollowUpRow[] = followUps.map((f) => ({ id: `fu-${f._id}`, kind: 'manual', ts: f.reminderDate, manual: f }));
  const statusRows: MergedFollowUpRow[] = history
    .filter((h) => LEAD_STATUS_WORKFLOW[h.newStatus]?.fu)
    .map((h) => ({ id: `status-${h._id}`, kind: 'status', ts: h.changedAt, statusEntry: h }));
  return [...manualRows, ...statusRows].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}
