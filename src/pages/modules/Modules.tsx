import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchModules,
  createModule,
  updateModule,
  deleteModule,
} from '@/redux/slices/moduleSlice';
import ModuleTable from './ModuleTable';
import ModuleFormDialog from './ModuleFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import type { Module, CreateModuleData, UpdateModuleData } from '@/types/module.types';

export default function Modules() {
  const dispatch = useAppDispatch();
  const { modules, loading, total } = useAppSelector((state) => state.modules);
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';

    dispatch(fetchModules(params));
  };

  const handleSearch = () => {
    loadModules();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchModules());
  };

  const handleCreate = () => {
    setEditingModule(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteModule(id)).unwrap();
  };

  const handleFormSubmit = async (data: CreateModuleData | UpdateModuleData) => {
    try {
      if (editingModule) {
        await dispatch(updateModule({ id: editingModule._id, data })).unwrap();
      } else {
        await dispatch(createModule(data as CreateModuleData)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingModule(null);
    } catch (error) {
      // Error is handled in the slice with toast
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingModule(null);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Modules</h1>
          <p className="text-on-surface-variant mt-1">Manage software modules</p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Module
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
                placeholder="Search modules..."
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
          Showing <span className="font-semibold">{modules.length}</span> of{' '}
          <span className="font-semibold">{total}</span> modules
        </div>
      </div>

      {/* Module Table */}
      <ModuleTable
        modules={modules}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Form Dialog */}
      <ModuleFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        module={editingModule}
        loading={loading}
      />
    </div>
  );
}
