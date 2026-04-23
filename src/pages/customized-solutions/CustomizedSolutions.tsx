import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchCustomizedSolutions,
  createCustomizedSolution,
  updateCustomizedSolution,
  deleteCustomizedSolution,
} from '@/redux/slices/customizedSolutionSlice';
import CustomizedSolutionTable from './CustomizedSolutionTable';
import CustomizedSolutionFormDialog from './CustomizedSolutionFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import type { CustomizedSolution, CreateCustomizedSolutionData, UpdateCustomizedSolutionData } from '@/types/customizedSolution.types';

export default function CustomizedSolutions() {
  const dispatch = useAppDispatch();
  const { customizedSolutions, loading, total } = useAppSelector((state) => state.customizedSolutions);
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSolution, setEditingSolution] = useState<CustomizedSolution | null>(null);

  useEffect(() => {
    loadCustomizedSolutions();
  }, []);

  const loadCustomizedSolutions = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';

    dispatch(fetchCustomizedSolutions(params));
  };

  const handleSearch = () => {
    loadCustomizedSolutions();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchCustomizedSolutions());
  };

  const handleCreate = () => {
    setEditingSolution(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (solution: CustomizedSolution) => {
    setEditingSolution(solution);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteCustomizedSolution(id)).unwrap();
  };

  const handleFormSubmit = async (data: CreateCustomizedSolutionData | UpdateCustomizedSolutionData) => {
    try {
      if (editingSolution) {
        await dispatch(updateCustomizedSolution({ id: editingSolution._id, data })).unwrap();
      } else {
        await dispatch(createCustomizedSolution(data as CreateCustomizedSolutionData)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingSolution(null);
    } catch (error) {
      // Error is handled in the slice with toast
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSolution(null);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Customized Solutions</h1>
          <p className="text-on-surface-variant mt-1">Manage customized solutions</p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customized Solution
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
                placeholder="Search customized solutions..."
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
          Showing <span className="font-semibold">{customizedSolutions.length}</span> of{' '}
          <span className="font-semibold">{total}</span> customized solutions
        </div>
      </div>

      {/* Table */}
      <CustomizedSolutionTable
        customizedSolutions={customizedSolutions}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Form Dialog */}
      <CustomizedSolutionFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        solution={editingSolution}
        loading={loading}
      />
    </div>
  );
}
