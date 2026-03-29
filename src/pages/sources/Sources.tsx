import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchSources,
  createSource,
  updateSource,
  deleteSource,
} from '@/redux/slices/sourceSlice';
import SourceTable from './SourceTable';
import SourceFormDialog from './SourceFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import type { Source, CreateSourceData, UpdateSourceData } from '@/types/source.types';

export default function Sources() {
  const dispatch = useAppDispatch();
  const { sources, loading, total } = useAppSelector((state) => state.sources);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';

    dispatch(fetchSources(params));
  };

  const handleSearch = () => {
    loadSources();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchSources());
  };

  const handleCreate = () => {
    setEditingSource(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (source: Source) => {
    setEditingSource(source);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteSource(id)).unwrap();
  };

  const handleFormSubmit = async (data: CreateSourceData | UpdateSourceData) => {
    try {
      if (editingSource) {
        await dispatch(updateSource({ id: editingSource._id, data })).unwrap();
      } else {
        await dispatch(createSource(data as CreateSourceData)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingSource(null);
    } catch (error) {
      // Error is handled in the slice with toast
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSource(null);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Sources</h1>
          <p className="text-on-surface-variant mt-1">Manage ticket sources</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Source
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
                placeholder="Search sources..."
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
          Showing <span className="font-semibold">{sources.length}</span> of{' '}
          <span className="font-semibold">{total}</span> sources
        </div>
      </div>

      {/* Source Table */}
      <SourceTable
        sources={sources}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Form Dialog */}
      <SourceFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        source={editingSource}
        loading={loading}
      />
    </div>
  );
}
