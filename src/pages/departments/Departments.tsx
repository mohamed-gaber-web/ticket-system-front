import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '@/redux/slices/departmentSlice';
import DepartmentTable from './DepartmentTable';
import DepartmentFormDialog from './DepartmentFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import type { Department, CreateDepartmentDto, UpdateDepartmentDto } from '@/types/department.types';

export default function Departments() {
  const dispatch = useAppDispatch();
  const { departments, loading, total } = useAppSelector((state) => state.departments);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  useEffect(() => {
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDepartments = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';

    dispatch(fetchDepartments(params));
  };

  const handleSearch = () => {
    loadDepartments();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchDepartments());
  };

  const handleCreate = () => {
    setEditingDepartment(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteDepartment(id)).unwrap();
  };

  const handleFormSubmit = async (data: CreateDepartmentDto | UpdateDepartmentDto) => {
    try {
      if (editingDepartment) {
        await dispatch(updateDepartment({ id: editingDepartment._id, data })).unwrap();
      } else {
        await dispatch(createDepartment(data as CreateDepartmentDto)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingDepartment(null);
      // Reload the list to ensure we have the latest data
      loadDepartments();
    } catch (error) {
      // Error is handled in the slice with toast
      console.error('Error submitting form:', error);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDepartment(null);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Departments</h1>
          <p className="text-on-surface-variant mt-1">Manage departments</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Department
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
                placeholder="Search departments..."
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
          Showing <span className="font-semibold">{departments?.length || 0}</span> of{' '}
          <span className="font-semibold">{total}</span> departments
        </div>
      </div>

      {/* Department Table */}
      <DepartmentTable
        departments={departments || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Form Dialog */}
      <DepartmentFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        department={editingDepartment}
        loading={loading}
      />
    </div>
  );
}
