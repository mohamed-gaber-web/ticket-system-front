import { useNavigate } from 'react-router-dom';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { CustomSelect } from '@/components/ui/custom-select';
import type { Consultant } from '../../types/consultant.types';
import { cn } from '../../lib/utils';

interface ConsultantTableProps {
  consultants: Consultant[];
  isLoading: boolean;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
}

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-red-100 text-red-800 border-red-200',
  on_leave: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const ROLE_STYLES = {
  admin: 'bg-accent-orange-100 text-purple-800 border-accent-orange-200',
  senior_consultant: 'bg-brand-100 text-brand-800 border-brand-200',
  consultant: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function ConsultantTable({
  consultants,
  isLoading,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
}: ConsultantTableProps) {
  const navigate = useNavigate();

  const totalPages = Math.ceil(totalCount / rowsPerPage);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow border">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!consultants || consultants.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border p-8 text-center">
        <p className="text-gray-500">No consultants found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Full Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {consultants.map((consultant) => (
              <tr key={consultant._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {consultant.fullName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{consultant.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {consultant.phone || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-md border',
                      ROLE_STYLES[consultant.role]
                    )}
                  >
                    {formatRole(consultant.role)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-md border',
                      STATUS_STYLES[consultant.status]
                    )}
                  >
                    {formatStatus(consultant.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {formatDate(consultant.lastLogin)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/consultant-reports/${consultant._id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-gray-50 px-6 py-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Rows per page:</span>
          <CustomSelect
            variant="form"
            value={String(rowsPerPage)}
            onChange={(value) => onRowsPerPageChange(Number(value))}
            options={[
              { value: '10', label: '10' },
              { value: '25', label: '25' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
          />
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages} ({totalCount} total)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
