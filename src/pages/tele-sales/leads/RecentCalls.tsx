import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as teleSalesApi from '@/api/teleSalesApi';
import { PhoneLink } from '@/components/PhoneLink';
import { Button } from '@/components/ui/button';
import { PhoneCall, RefreshCw, User, Eye } from 'lucide-react';
import type { RecentCall } from '@/types/teleSales.types';
import { STATUS_COLORS } from '@/config/leadStatusWorkflow';

const formatDateTime = (d?: string) =>
  !d ? '—' : new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function RecentCalls() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const r = await teleSalesApi.getRecentCalls(100);
      setCalls(r.data);
    } catch {
      // errors surface via the axios interceptor / empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCalls(); }, [loadCalls]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-primary" /> Recent Calls
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">Latest logged calls across all your leads, newest first</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={loadCalls} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-on-surface-variant">
            <PhoneCall className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No calls logged yet</p>
            <p className="text-sm mt-1">Log a call from a lead to see it appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container/50">
                  {['Date & Time', 'Company', 'Contact', 'Phone', 'Status', 'Agent', 'Duration', 'Notes', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {calls.map((call) => (
                  <tr key={call._id} className="hover:bg-surface-container/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-on-surface">{formatDateTime(call.callDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {call.lead ? (
                        <button onClick={() => navigate(`/tele-sales/leads/${call.lead._id}`)}
                          className="font-medium text-primary hover:underline">
                          {call.lead.companyName}
                        </button>
                      ) : <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {call.lead?.contactPersonName || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PhoneLink number={call.lead?.phonePrimary || call.lead?.phoneSecondary} leadId={call.lead?._id} onLogged={loadCalls} />
                    </td>
                    <td className="px-4 py-3">
                      {call.lead?.status
                        ? <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[call.lead.status] ?? 'bg-gray-100 text-gray-600'}`}>{call.lead.status}</span>
                        : <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      {call.calledBy ? `${call.calledBy.firstName} ${call.calledBy.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{call.duration ? `${call.duration} min` : '—'}</td>
                    <td className="px-4 py-3 text-on-surface-variant max-w-xs truncate" title={call.notes || ''}>{call.notes || '—'}</td>
                    <td className="px-4 py-3">
                      {call.lead && (
                        <button onClick={() => navigate(`/tele-sales/leads/${call.lead._id}`)}
                          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" title="View lead">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
