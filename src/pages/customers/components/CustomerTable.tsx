import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Mail, Phone, Building2, Database } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { Customer } from '@/types/customer.types';
import { useAppSelector } from '@/redux/hooks/hooks';

const MySwal = withReactContent(Swal);

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export default function CustomerTable({ customers, onEdit, onDelete, isLoading }: CustomerTableProps) {
  const { erpTypes } = useAppSelector((state) => state.erpTypes);
  const { versionNumbers } = useAppSelector((state) => state.versionNumbers);

  const getErpTypeName = (erpType?: any) => {
    if (!erpType) return 'N/A';

    // If erpType is already a populated object with name
    if (typeof erpType === 'object' && erpType.name) {
      return erpType.name;
    }

    // If erpType is just an ID string, look it up
    if (typeof erpType === 'string') {
      const found = erpTypes.find((erp) => erp._id === erpType);
      return found?.name || 'Unknown';
    }

    return 'Unknown';
  };

  const getVersionNumberName = (versionNumber?: any) => {
    if (!versionNumber) return 'N/A';

    // If versionNumber is already a populated object with name
    if (typeof versionNumber === 'object' && versionNumber.name) {
      return versionNumber.name;
    }

    // If versionNumber is just an ID string, look it up
    if (typeof versionNumber === 'string') {
      const found = versionNumbers.find((v) => v._id === versionNumber);
      return found?.name || 'Unknown';
    }

    return 'Unknown';
  };

  const handleDelete = (customer: Customer) => {
    MySwal.fire({
      title: 'Are you sure?',
      html: `
        <div class="text-left">
          <p class="mb-2">You are about to delete:</p>
          <p class="font-semibold text-lg">${customer.companyName}</p>
          <p class="text-sm text-gray-600">${customer.email}</p>
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
        onDelete(customer._id);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          statusStyles[status as keyof typeof statusStyles] || statusStyles.inactive
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 text-lg">No customers found</p>
        <p className="text-gray-500 text-sm mt-2">Use the filters above or click "Add Customer" to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Company</TableHead>
            <TableHead className="font-semibold">Contact Person</TableHead>
            <TableHead className="font-semibold">Contact Info</TableHead>
            <TableHead className="font-semibold">ERP Type</TableHead>
            <TableHead className="font-semibold">Version</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Created At</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer._id} className="hover:bg-gray-50 transition-colors">
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-500 to-accent-orange-500 flex items-center justify-center text-white font-semibold">
                    {customer.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{customer.companyName}</p>
                    {customer.city && customer.country && (
                      <p className="text-xs text-gray-500">
                        {customer.city}, {customer.country}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-gray-900">{customer.contactPerson}</p>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-3 w-3" />
                    <span>{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3 w-3" />
                    <span>{customer.phone}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">{getErpTypeName(customer.erpType)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-brand-600" />
                  <span className="text-sm text-gray-700">{getVersionNumberName(customer.versionNumber)}</span>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(customer.status)}</TableCell>
              <TableCell className="text-gray-600">{formatDate(customer.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(customer)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                    onClick={() => handleDelete(customer)}
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
  );
}
