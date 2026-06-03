import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchEmployeeRequests,
  approveEmployeeRequest,
  rejectEmployeeRequest,
} from '@/redux/slices/employeeRequestSlice';
import type { EmployeeRequestType, EmployeeRequestStatus } from '@/types/employeeRequest.types';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Plane, Clock, Inbox } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  TYPE_LABELS,
  requestDuration,
  requestPeriod,
  employeeName,
  departmentName,
} from './requestDisplay';

const MySwal = withReactContent(Swal);

export default function Approvals() {
  const dispatch = useAppDispatch();
  const { requests, loading } = useAppSelector((state) => state.employeeRequests);

  const [typeFilter, setTypeFilter] = useState<EmployeeRequestType | ''>('');
  const [statusFilter, setStatusFilter] = useState<EmployeeRequestStatus | ''>('pending');

  const load = () => {
    const params: any = { scope: 'approvals', limit: 100 };
    if (typeFilter) params.type = typeFilter;
    if (statusFilter) params.status = statusFilter;
    dispatch(fetchEmployeeRequests(params));
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter]);

  const handleApprove = (id: string) => {
    dispatch(approveEmployeeRequest({ id })).then(() => load());
  };

  const handleReject = (id: string) => {
    MySwal.fire({
      title: 'Reject request?',
      input: 'textarea',
      inputLabel: 'Reason (optional)',
      inputPlaceholder: 'Add a note for the employee…',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(rejectEmployeeRequest({ id, reviewNote: result.value || undefined })).then(() => load());
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Approvals</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Review vacation & excuse requests from your team</p>
      </div>

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
            <Inbox className="mx-auto h-12 w-12 text-on-surface-variant/40 mb-4" />
            <p className="text-on-surface text-lg font-semibold">Nothing to review</p>
            <p className="text-sm text-on-surface-variant mt-1">No requests match the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-container-low">
                <tr className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {requests.map((req) => (
                  <tr key={req._id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-4 py-4 font-medium text-on-surface">{employeeName(req)}</td>
                    <td className="px-4 py-4 text-on-surface-variant">{departmentName(req)}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-on-surface">
                        {req.type === 'vacation' ? <Plane className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-primary" />}
                        {TYPE_LABELS[req.type]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-on-surface">{requestPeriod(req)}</td>
                    <td className="px-4 py-4 font-semibold text-on-surface">{requestDuration(req)}</td>
                    <td className="px-4 py-4 max-w-[180px]">
                      <span className="text-on-surface-variant line-clamp-1">{req.reason || '—'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[req.status]}`}>
                        {STATUS_LABELS[req.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="text-green-700 hover:text-green-800" onClick={() => handleApprove(req._id)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="text-error hover:text-error" onClick={() => handleReject(req._id)}>
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="text-right text-on-surface-variant/40">—</div>
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
