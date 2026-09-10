import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchLeadStats } from '@/redux/slices/teleSalesLeadsSlice';
import { fetchLeads } from '@/redux/slices/teleSalesLeadsSlice';
import * as teleSalesApi from '@/api/teleSalesApi';
import { useState } from 'react';
import { PhoneLink } from '@/components/PhoneLink';
import type { FollowUp, LeadStatus } from '@/types/teleSales.types';
import { STATUS_COLORS } from '@/config/leadStatusWorkflow';
import {
  PhoneCall,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  ArrowRight,
  Users,
} from 'lucide-react';

const KEY_STATS: { status: LeadStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'New Lead', label: 'New Leads', icon: <PhoneCall className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
  { status: 'Interested', label: 'Interested', icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-600 bg-green-50' },
  { status: 'Closed Won', label: 'Closed Won', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50' },
  { status: 'Closed Lost', label: 'Closed Lost', icon: <XCircle className="w-5 h-5" />, color: 'text-red-600 bg-red-50' },
];

export default function TeleSalesDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { stats, leads, loading } = useAppSelector((state) => state.teleSalesLeads);
  const { user } = useAppSelector((state) => state.auth);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([]);

  const agentName = (user as any)?.firstName ? `${(user as any).firstName} ${(user as any).lastName}` : 'Agent';

  useEffect(() => {
    dispatch(fetchLeadStats());
    dispatch(fetchLeads({ limit: 5 }));
    teleSalesApi.getUpcomingFollowUps().then((res) => setUpcomingFollowUps(res.data)).catch(() => {});
  }, [dispatch]);

  const getStatCount = (status: LeadStatus) =>
    stats?.byStatus.find((s) => s._id === status)?.count ?? 0;

  const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Welcome back, {agentName}</h1>
        <p className="text-on-surface-variant text-sm mt-1">Here's your TeleSales overview</p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KEY_STATS.map(({ status, label, icon, color }) => (
          <div key={status} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-on-surface-variant text-sm font-medium">{label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
            </div>
            <div className="text-3xl font-bold text-on-surface">{getStatCount(status)}</div>
          </div>
        ))}
      </div>

      {/* Total */}
      {stats && (
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">Total Leads</p>
            <p className="text-4xl font-bold mt-1">{stats.total}</p>
          </div>
          <Users className="w-12 h-12 text-white/30" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
            <h2 className="font-semibold text-on-surface">Pipeline Status</h2>
          </div>
          <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
            {stats?.byStatus.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-6">No data yet</p>
            )}
            {stats?.byStatus.map((s) => (
              <div key={s._id} className="flex items-center justify-between py-1">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[s._id] ?? 'bg-gray-100 text-gray-600'}`}>
                  {s._id}
                </span>
                <span className="text-sm font-semibold text-on-surface">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
            <h2 className="font-semibold text-on-surface flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-500" />
              Upcoming Follow-ups
            </h2>
            <span className="text-xs text-on-surface-variant">Next 7 days</span>
          </div>
          <div className="divide-y divide-outline-variant/10 max-h-72 overflow-y-auto">
            {upcomingFollowUps.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">No upcoming follow-ups</p>
            )}
            {upcomingFollowUps.map((fu) => {
              const lead = typeof fu.lead === 'object' ? fu.lead : null;
              return (
                <div key={fu._id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-container cursor-pointer"
                  onClick={() => lead && navigate(`/tele-sales/leads/${(lead as any)._id}`)}>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{(lead as any)?.companyName ?? 'Unknown'}</p>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(fu.reminderDate)} · {fu.followUpType}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-on-surface-variant" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h2 className="font-semibold text-on-surface">Recent Leads</h2>
          <button onClick={() => navigate('/tele-sales/leads')} className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {leads.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">No leads yet</p>
            )}
            {leads.map((lead) => (
              <div key={lead._id}
                onClick={() => navigate(`/tele-sales/leads/${lead._id}`)}
                className="px-5 py-3 flex items-center justify-between hover:bg-surface-container cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-on-surface">{lead.companyName}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{lead.contactPersonName}</span>
                    {(lead.phonePrimary || lead.phoneSecondary) && (
                      <>
                        <span aria-hidden>·</span>
                        <PhoneLink number={lead.phonePrimary || lead.phoneSecondary} showIcon={false} className="text-xs" />
                      </>
                    )}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {lead.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
