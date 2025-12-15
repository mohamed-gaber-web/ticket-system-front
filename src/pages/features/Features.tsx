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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Features</h1>
          <p className="text-gray-600 mt-1">Manage software features</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Feature
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
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
