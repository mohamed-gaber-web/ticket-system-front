import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import * as teleSalesApi from '@/api/teleSalesApi';
import type { LeadStatusHistoryEntry } from '@/types/teleSales.types';
import { LEAD_STATUS_WORKFLOW } from '@/config/leadStatusWorkflow';

const fmt = (d?: string) => (!d ? '—' : new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));

const formatFieldValue = (value: any): string => {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (typeof value === 'object') {
    if (value.fileName) return `File: ${value.fileName}`;
    if (value.link) return `Link: ${value.link}`;
    return JSON.stringify(value);
  }
  return String(value);
};

export function StatusHistoryTab({ leadId }: { leadId: string }) {
  const [history, setHistory] = useState<LeadStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    teleSalesApi
      .getLeadStatusHistory(leadId)
      .then((r) => { if (active) setHistory(r.data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
        <Clock className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm">No status changes recorded yet</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5">
      {history.map((entry, i) => {
        const config = LEAD_STATUS_WORKFLOW[entry.newStatus];
        const rows = Object.entries(entry.fieldValues || {}).filter(([, v]) => v !== '' && v != null);
        return (
          <div key={entry._id} className="relative pl-6 pb-6 last:pb-0">
            {i < history.length - 1 && <div className="absolute left-[7px] top-4 bottom-0 w-px bg-outline-variant/30" />}
            <div
              className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-surface-container-lowest"
              style={{ background: config?.color || '#8a94a6' }}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: config?.bg, color: config?.color }}>
                {entry.newStatus}
              </span>
              {config?.ar && <span dir="rtl" className="text-xs text-on-surface-variant">{config.ar}</span>}
              <span className="text-xs text-on-surface-variant">
                {fmt(entry.changedAt)} · by {entry.changedBy ? `${entry.changedBy.firstName} ${entry.changedBy.lastName}` : '—'}
              </span>
            </div>
            {rows.length > 0 && (
              <div className="mt-2 border border-outline-variant/30 rounded-xl overflow-hidden">
                {rows.map(([key, value], idx) => {
                  const field = config?.fields.find((f) => f.k === key);
                  return (
                    <div key={key} className={`flex gap-3 px-3 py-1.5 text-sm ${idx % 2 === 0 ? 'bg-surface-container/50' : ''}`}>
                      <span className="text-on-surface-variant w-48 shrink-0 text-xs">{field?.label || key}</span>
                      <span className="font-medium text-on-surface break-words">{formatFieldValue(value)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
