import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash2, Power, PowerOff } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { ServiceType } from '@/types/serviceType.types';
import { useAppDispatch } from '@/redux/hooks/hooks';
import { toggleServiceTypeStatus } from '@/redux/slices/serviceTypeSlice';

const MySwal = withReactContent(Swal);

interface ServiceTypeTableProps {
  serviceTypes: ServiceType[];
  onEdit: (serviceType: ServiceType) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export default function ServiceTypeTable({
  serviceTypes,
  onEdit,
  onDelete,
  loading,
}: ServiceTypeTableProps) {
  const dispatch = useAppDispatch();

  const handleDelete = (serviceType: ServiceType) => {
    MySwal.fire({
      title: 'Are you sure?',
      html: `
        <div class="text-left">
          <p class="mb-2">You are about to delete:</p>
          <p class="font-semibold text-lg">${serviceType.name}</p>
          <p class="mt-3 text-red-600">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        onDelete(serviceType._id);
      }
    });
  };

  const handleToggleStatus = (serviceType: ServiceType) => {
    const newStatus = serviceType.isActive ? 'deactivate' : 'activate';
    MySwal.fire({
      title: `${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} service type?`,
      html: `
        <div class="text-left">
          <p class="mb-2">You are about to ${newStatus}:</p>
          <p class="font-semibold text-lg">${serviceType.name}</p>
          <p class="text-sm text-gray-600 mt-2">
            ${
              serviceType.isActive
                ? 'This service type will be disabled.'
                : 'This service type will be enabled.'
            }
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: serviceType.isActive ? '#EF4444' : '#10B981',
      cancelButtonColor: '#6B7280',
      confirmButtonText: `Yes, ${newStatus} it!`,
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(toggleServiceTypeStatus(serviceType._id));
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (serviceTypes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">No service types found</p>
        <p className="text-gray-500 text-sm mt-2">Create your first service type to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Created At</TableHead>
              <TableHead className="font-semibold">Updated At</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {serviceTypes.map((serviceType) => (
              <TableRow key={serviceType._id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-medium text-gray-900">{serviceType.name}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      serviceType.isActive
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}
                  >
                    {serviceType.isActive ? (
                      <>
                        <Power className="w-3 h-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <PowerOff className="w-3 h-3" />
                        Inactive
                      </>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600 text-sm">
                  {formatDate(serviceType.createdAt)}
                </TableCell>
                <TableCell className="text-gray-600 text-sm">
                  {formatDate(serviceType.updatedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(serviceType)}
                      className={`${
                        serviceType.isActive
                          ? 'text-orange-600 hover:text-orange-700 hover:border-orange-300'
                          : 'text-green-600 hover:text-green-700 hover:border-green-300'
                      }`}
                    >
                      {serviceType.isActive ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(serviceType)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={() => handleDelete(serviceType)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
