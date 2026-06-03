import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchEmployeeRequests,
  cancelEmployeeRequest,
} from '@/redux/slices/employeeRequestSlice';
import { fetchMyBalance } from '@/redux/slices/employeeBalanceSlice';
import type { EmployeeRequestType, EmployeeRequestStatus } from '@/types/employeeRequest.types';
import { Button } from '@/components/ui/button';
import { Plus, CalendarOff, Plane, Clock, X } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import RequestFormDialog from './components/RequestFormDialog';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  TYPE_LABELS,
  requestDuration,
  requestPeriod,
  fmtDate,
} from './requestDisplay';

const MySwal = withReactContent(Swal);

export default function MyRequests() {
  const dispatch = useAppDispatch();
  const { requests, loading } = useAppSelector((state) => state.employeeRequests);
  const { myBalance } = useAppSelector((state) => state.employeeBalances);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<EmployeeRequestType | ''>('');
  const [statusFilter, setStatusFilter] = useState<EmployeeRequestStatus | ''>('');

  const load = () => {
    const params: any = { scope: 'mine', limit: 100 };
    if (typeFilter) params.type = typeFilter;
    if (statusFilter) params.status = statusFilter;
    dispatch(fetchEmployeeRequests(params));
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter]);
  useEffect(() => { dispatch(fetchMyBalance(undefined)); }, []);

  const handleCancel = (id: string) => {
    MySwal.fire({
      title: 'Cancel this request?',
      text: 'It will be withdrawn from approval.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Cancel request',
      cancelButtonText: 'Keep',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) dispatch(cancelEmployeeRequest(id));
    });
  };

  const onDialogClose = () => {
    setDialogOpen(false);
    load();
    dispatch(fetchMyBalance(undefined));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">My Requests</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Submit and track your vacation & excuse requests</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Balance summary */}
      {myBalance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard icon={<Plane className="w-4 h-4" />} label="Annual Allotment" value={`${myBalance.annualAllotment + myBalance.carriedOver} days`} />
          <SummaryCard icon={<CalendarOff className="w-4 h-4" />} label="Used" value={`${myBalance.usedVacationDays} days`} />
          <SummaryCard icon={<Plane className="w-4 h-4" />} label="Remaining" value={`${myBalance.remainingDays} days`} highlight />
          <SummaryCard icon={<Clock className="w-4 h-4" />} label="Excuse Hours Used" value={`${myBalance.usedExcuseHours} h`} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EmployeeRequestType | '')}
          className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Types</option>
          <option value="vacation">Vacation</option>
          <option value="excuse">Excuse</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EmployeeRequestStatus | '')}
          className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-[1rem] bg-surface-container-lowest overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <CalendarOff className="mx-auto h-12 w-12 text-on-surface-variant/40 mb-4" />
            <p className="text-on-surface text-lg font-semibold">No requests yet</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-6">New Request</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-container-low">
                <tr className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {requests.map((req) => (
                  <tr key={req._id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-on-surface">
                        {req.type === 'vacation' ? <Plane className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-primary" />}
                        {TYPE_LABELS[req.type]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-on-surface">{requestPeriod(req)}</td>
                    <td className="px-4 py-4 font-semibold text-on-surface">{requestDuration(req)}</td>
                    <td className="px-4 py-4 max-w-[200px]">
                      <span className="text-on-surface-variant line-clamp-1">{req.reason || '—'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant">{fmtDate(req.createdAt)}</td>
                    <td className="px-4 py-4 text-right">
                      {(req.status === 'pending' || req.status === 'approved') ? (
                        <Button size="sm" variant="ghost" className="text-error hover:text-error" onClick={() => handleCancel(req._id)}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      ) : (
                        <span className="text-on-surface-variant/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RequestFormDialog open={dialogOpen} onClose={onDialogClose} />
    </div>
  );
}

function SummaryCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[1rem] p-4 ${highlight ? 'bg-primary/10' : 'bg-surface-container-lowest'}`}>
      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">{icon}{label}</div>
      <p className={`mt-1 text-xl font-bold ${highlight ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
    </div>
  );
}
