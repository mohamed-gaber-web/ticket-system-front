import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from '@/redux/slices/environmentSlice';
import EnvironmentTable from './EnvironmentTable';
import EnvironmentFormDialog from './EnvironmentFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import type { Environment, CreateEnvironmentData, UpdateEnvironmentData } from '@/types/environment.types';

export default function Environments() {
  const dispatch = useAppDispatch();
  const { environments, loading, total } = useAppSelector((state) => state.environments);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';

    dispatch(fetchEnvironments(params));
  };

  const handleSearch = () => {
    loadEnvironments();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchEnvironments());
  };

  const handleCreate = () => {
    setEditingEnvironment(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (environment: Environment) => {
    setEditingEnvironment(environment);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteEnvironment(id)).unwrap();
  };

  const handleFormSubmit = async (data: CreateEnvironmentData | UpdateEnvironmentData) => {
    try {
      if (editingEnvironment) {
        await dispatch(updateEnvironment({ id: editingEnvironment._id, data })).unwrap();
      } else {
        await dispatch(createEnvironment(data as CreateEnvironmentData)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingEnvironment(null);
    } catch (error) {
      // Error is handled in the slice with toast
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEnvironment(null);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Environments</h1>
          <p className="text-on-surface-variant mt-1">Manage system environments</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Environment
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <Input
                type="search"
                placeholder="Search environments..."
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
          Showing <span className="font-semibold">{environments.length}</span> of{' '}
          <span className="font-semibold">{total}</span> environments
        </div>
      </div>

      {/* Environment Table */}
      <EnvironmentTable
        environments={environments}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Form Dialog */}
      <EnvironmentFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        environment={editingEnvironment}
        loading={loading}
      />
    </div>
  );
}
