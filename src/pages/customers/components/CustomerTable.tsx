import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Mail, Phone, Building2, Database, Eye, ShieldCheck, User, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { Customer } from '@/types/customer.types';
import { useAppSelector } from '@/redux/hooks/hooks';

const MySwal = withReactContent(Swal);

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onChangePassword: (customer: Customer) => void;
  showChangePassword?: boolean;
  isLoading: boolean;
}

export default function CustomerTable({ customers, onEdit, onDelete, onChangePassword, showChangePassword = false, isLoading }: CustomerTableProps) {
  const navigate = useNavigate();
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
          <p class="text-sm text-on-surface-variant">${customer.email}</p>
          <p class="mt-3 text-error">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
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
      active: 'bg-green-500/10 text-green-600',
      inactive: 'bg-surface-container-highest text-on-surface-variant',
      suspended: 'bg-error/10 text-error',
    };

    return (
      <span
        className={`px-3 py-1 rounded-[0.5rem] text-xs font-bold uppercase tracking-[0.05em] ${
          statusStyles[status as keyof typeof statusStyles] || statusStyles.inactive
        }`}
      >
        {status}
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
        <Building2 className="mx-auto h-12 w-12 text-on-surface-variant/60 mb-4" />
        <p className="text-on-surface-variant text-lg">No customers found</p>
        <p className="text-on-surface-variant text-sm mt-2">Use the filters above or click "Add Customer" to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1rem] bg-surface-container-lowest overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Company</TableHead>
            <TableHead className="font-semibold">Contact Person</TableHead>
            <TableHead className="font-semibold">Contact Info</TableHead>
            <TableHead className="font-semibold">ERP Type</TableHead>
            <TableHead className="font-semibold">Version</TableHead>
            <TableHead className="font-semibold">Product Types</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Created At</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer._id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-500 to-accent-orange-500 flex items-center justify-center text-white font-semibold">
                    {customer.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{customer.companyName}</p>
                    {customer.city && customer.country && (
                      <p className="text-xs text-on-surface-variant">
                        {customer.city}, {customer.country}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-on-surface">{customer.contactPerson}</p>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <Mail className="h-3 w-3" />
                    <span>{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <Phone className="h-3 w-3" />
                    <span>{customer.phone}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-on-surface-variant">{getErpTypeName(customer.erpType)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-brand-600" />
                  <span className="text-sm text-on-surface-variant">{getVersionNumberName(customer.versionNumber)}</span>
                </div>
              </TableCell>
              <TableCell>
                {Array.isArray(customer.productTypes) && customer.productTypes.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {customer.productTypes.map((pt: any) => {
                      const name = typeof pt === 'object' ? pt.name : pt;
                      const key = typeof pt === 'object' ? pt._id : pt;
                      return (
                        <span
                          key={key}
                          className="px-2 py-0.5 rounded-[0.375rem] text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200"
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-on-surface-variant">—</span>
                )}
              </TableCell>
              <TableCell>
                {customer.role === 'company_admin' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[0.5rem] text-xs font-bold uppercase tracking-[0.05em] bg-brand-100 text-brand-700">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[0.5rem] text-xs font-bold uppercase tracking-[0.05em] bg-surface-container text-on-surface-variant">
                    <User className="h-3 w-3" />
                    User
                  </span>
                )}
              </TableCell>
              <TableCell>{getStatusBadge(customer.status)}</TableCell>
              <TableCell className="text-on-surface-variant">{formatDate(customer.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => navigate(`/customers/view/${customer._id}`)}
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit(customer)}
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {showChangePassword && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-brand-600 hover:text-brand-700"
                      onClick={() => onChangePassword(customer)}
                      title="Change Password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-error hover:text-error/80"
                    onClick={() => handleDelete(customer)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
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
