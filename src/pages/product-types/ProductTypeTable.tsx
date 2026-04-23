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
import type { ProductType } from '@/types/productType.types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { toggleProductTypeStatus } from '@/redux/slices/productTypeSlice';

const MySwal = withReactContent(Swal);

interface ProductTypeTableProps {
  productTypes: ProductType[];
  onEdit: (productType: ProductType) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export default function ProductTypeTable({
  productTypes,
  onEdit,
  onDelete,
  loading,
}: ProductTypeTableProps) {
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  const handleDelete = (productType: ProductType) => {
    MySwal.fire({
      title: 'Are you sure?',
      html: `
        <div class="text-left">
          <p class="mb-2">You are about to delete:</p>
          <p class="font-semibold text-lg">${productType.name}</p>
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
        onDelete(productType._id);
      }
    });
  };

  const handleToggleStatus = (productType: ProductType) => {
    const newStatus = productType.isActive ? 'deactivate' : 'activate';
    MySwal.fire({
      title: `${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} product type?`,
      html: `
        <div class="text-left">
          <p class="mb-2">You are about to ${newStatus}:</p>
          <p class="font-semibold text-lg">${productType.name}</p>
          <p class="text-sm text-gray-600 mt-2">
            ${
              productType.isActive
                ? 'This product type will be disabled.'
                : 'This product type will be enabled.'
            }
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: productType.isActive ? '#EF4444' : '#10B981',
      cancelButtonColor: '#6B7280',
      confirmButtonText: `Yes, ${newStatus} it!`,
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(toggleProductTypeStatus(productType._id));
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (productTypes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-on-surface-variant text-lg">No product types found</p>
        <p className="text-on-surface-variant text-sm mt-2">Create your first product type to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1rem] bg-surface-container-lowest overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-container-low">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Created At</TableHead>
              <TableHead className="font-semibold">Updated At</TableHead>
              {isAdmin && <TableHead className="text-right font-semibold">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {productTypes.map((productType) => (
              <TableRow key={productType._id} className="hover:bg-surface-container-low transition-colors">
                <TableCell className="font-medium text-on-surface">{productType.name}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                      productType.isActive
                        ? 'bg-green-500/10 text-green-700'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {productType.isActive ? (
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
                <TableCell className="text-on-surface-variant text-sm">
                  {formatDate(productType.createdAt)}
                </TableCell>
                <TableCell className="text-on-surface-variant text-sm">
                  {formatDate(productType.updatedAt)}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(productType)}
                        className={`${
                          productType.isActive
                            ? 'text-orange-600 hover:text-orange-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {productType.isActive ? (
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
                        onClick={() => onEdit(productType)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-error hover:text-error"
                        onClick={() => handleDelete(productType)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
