import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchProductTypes,
  createProductType,
  updateProductType,
  deleteProductType,
} from '@/redux/slices/productTypeSlice';
import ProductTypeTable from './ProductTypeTable';
import ProductTypeFormDialog from './ProductTypeFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import type { ProductType, CreateProductTypeData, UpdateProductTypeData } from '@/types/productType.types';

export default function ProductTypes() {
  const dispatch = useAppDispatch();
  const { productTypes, loading, total } = useAppSelector((state) => state.productTypes);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProductType, setEditingProductType] = useState<ProductType | null>(null);

  useEffect(() => {
    loadProductTypes();
  }, []);

  const loadProductTypes = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';

    dispatch(fetchProductTypes(params));
  };

  const handleSearch = () => {
    loadProductTypes();
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchProductTypes());
  };

  const handleCreate = () => {
    setEditingProductType(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (productType: ProductType) => {
    setEditingProductType(productType);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteProductType(id)).unwrap();
  };

  const handleFormSubmit = async (data: CreateProductTypeData | UpdateProductTypeData) => {
    try {
      if (editingProductType) {
        await dispatch(updateProductType({ id: editingProductType._id, data })).unwrap();
      } else {
        await dispatch(createProductType(data as CreateProductTypeData)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingProductType(null);
    } catch (error) {
      // Error is handled in the slice with toast
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProductType(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Types</h1>
          <p className="text-gray-600 mt-1">Manage product types</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product Type
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
                placeholder="Search product types..."
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
          Showing <span className="font-semibold">{productTypes.length}</span> of{' '}
          <span className="font-semibold">{total}</span> product types
        </div>
      </div>

      {/* Product Type Table */}
      <ProductTypeTable
        productTypes={productTypes}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Form Dialog */}
      <ProductTypeFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        productType={editingProductType}
        loading={loading}
      />
    </div>
  );
}
