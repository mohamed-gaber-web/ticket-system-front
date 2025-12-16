import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchVersionNumbers,
  createVersionNumber,
  updateVersionNumber,
  deleteVersionNumber,
} from '@/redux/slices/versionNumberSlice';
import VersionNumberTable from './VersionNumberTable';
import VersionNumberFormDialog from './VersionNumberFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import type { VersionNumber, CreateVersionNumberDto, UpdateVersionNumberDto } from '@/types/versionNumber.types';

export default function VersionNumbers() {
  const dispatch = useAppDispatch();
  const { versionNumbers, loading, total } = useAppSelector((state) => state.versionNumbers);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVersionNumber, setEditingVersionNumber] = useState<VersionNumber | null>(null);

  useEffect(() => {
    loadVersionNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVersionNumbers = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';

    dispatch(fetchVersionNumbers(params));
  };

  const handleSearch = () => {
    loadVersionNumbers();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchVersionNumbers());
  };

  const handleCreate = () => {
    setEditingVersionNumber(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (versionNumber: VersionNumber) => {
    setEditingVersionNumber(versionNumber);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteVersionNumber(id)).unwrap();
  };

  const handleFormSubmit = async (data: CreateVersionNumberDto | UpdateVersionNumberDto) => {
    try {
      if (editingVersionNumber) {
        await dispatch(updateVersionNumber({ id: editingVersionNumber._id, data })).unwrap();
      } else {
        await dispatch(createVersionNumber(data as CreateVersionNumberDto)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingVersionNumber(null);
      loadVersionNumbers();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVersionNumber(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Version Numbers</h1>
          <p className="text-gray-600 mt-1">Manage version numbers</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Version Number
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search version numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

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

        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold">{versionNumbers?.length || 0}</span> of{' '}
          <span className="font-semibold">{total}</span> version numbers
        </div>
      </div>

      <VersionNumberTable
        versionNumbers={versionNumbers || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <VersionNumberFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        versionNumber={editingVersionNumber}
        loading={loading}
      />
    </div>
  );
}
