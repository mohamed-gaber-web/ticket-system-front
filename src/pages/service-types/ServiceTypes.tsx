import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchServiceTypes,
  createServiceType,
  updateServiceType,
  deleteServiceType,
} from '@/redux/slices/serviceTypeSlice';
import ServiceTypeTable from './ServiceTypeTable';
import ServiceTypeFormDialog from './ServiceTypeFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import type { ServiceType, CreateServiceTypeDto, UpdateServiceTypeDto } from '@/types/serviceType.types';

export default function ServiceTypes() {
  const dispatch = useAppDispatch();
  const { serviceTypes, loading, total } = useAppSelector((state) => state.serviceTypes);
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState<ServiceType | null>(null);

  useEffect(() => {
    loadServiceTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadServiceTypes = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';

    dispatch(fetchServiceTypes(params));
  };

  const handleSearch = () => {
    loadServiceTypes();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchServiceTypes());
  };

  const handleCreate = () => {
    setEditingServiceType(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (serviceType: ServiceType) => {
    setEditingServiceType(serviceType);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteServiceType(id)).unwrap();
  };

  const handleFormSubmit = async (data: CreateServiceTypeDto | UpdateServiceTypeDto) => {
    try {
      if (editingServiceType) {
        await dispatch(updateServiceType({ id: editingServiceType._id, data })).unwrap();
      } else {
        await dispatch(createServiceType(data as CreateServiceTypeDto)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingServiceType(null);
      // Reload the list to ensure we have the latest data
      loadServiceTypes();
    } catch (error) {
      // Error is handled in the slice with toast
      console.error('Error submitting form:', error);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingServiceType(null);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Service Types</h1>
          <p className="text-on-surface-variant mt-1">Manage service types</p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Service Type
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <Input
                type="search"
                placeholder="Search service types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>

          <CustomSelect
            variant="filter"
            value={statusFilter}
            onChange={setStatusFilter}
            label="Status"
            options={[
              { value: '', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />

          <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-on-surface-variant">
          Showing <span className="font-semibold">{serviceTypes?.length || 0}</span> of{' '}
          <span className="font-semibold">{total}</span> service types
        </div>
      </div>

      {/* Service Type Table */}
      <ServiceTypeTable
        serviceTypes={serviceTypes || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Form Dialog */}
      <ServiceTypeFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        serviceType={editingServiceType}
        loading={loading}
      />
    </div>
  );
}
