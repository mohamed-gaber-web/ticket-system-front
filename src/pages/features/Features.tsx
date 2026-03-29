import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
} from '@/redux/slices/featureSlice';
import FeatureTable from './FeatureTable';
import FeatureFormDialog from './FeatureFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import type { Feature, CreateFeatureData, UpdateFeatureData } from '@/types/feature.types';

export default function Features() {
  const dispatch = useAppDispatch();
  const { features, loading, total } = useAppSelector((state) => state.features);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';

    dispatch(fetchFeatures(params));
  };

  const handleSearch = () => {
    loadFeatures();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchFeatures());
  };

  const handleCreate = () => {
    setEditingFeature(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (feature: Feature) => {
    setEditingFeature(feature);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteFeature(id)).unwrap();
  };

  const handleFormSubmit = async (data: CreateFeatureData | UpdateFeatureData) => {
    try {
      if (editingFeature) {
        await dispatch(updateFeature({ id: editingFeature._id, data })).unwrap();
      } else {
        await dispatch(createFeature(data as CreateFeatureData)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingFeature(null);
    } catch (error) {
      // Error is handled in the slice with toast
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFeature(null);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Features</h1>
          <p className="text-on-surface-variant mt-1">Manage software features</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Feature
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
                placeholder="Search features..."
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
          Showing <span className="font-semibold">{features.length}</span> of{' '}
          <span className="font-semibold">{total}</span> features
        </div>
      </div>

      {/* Feature Table */}
      <FeatureTable
        features={features}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Form Dialog */}
      <FeatureFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        feature={editingFeature}
        loading={loading}
      />
    </div>
  );
}
