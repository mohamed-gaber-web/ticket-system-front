import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCategories, deleteCategory } from '@/redux/slices/categorySlice';
import CategoryTable from './components/CategoryTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import './categories.css';

export default function CategoryList() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { categories, loading, total } = useAppSelector((state) => state.categories);
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  const [searchTerm, setSearchTerm] = useState('');

  console.log('CategoryList render - categories:', categories);
  console.log('CategoryList render - loading:', loading);

  useEffect(() => {
    console.log('CategoryList useEffect - fetching categories');
    loadCategories();
  }, []);

  const loadCategories = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    dispatch(fetchCategories(params));
  };

  const handleSearch = () => {
    loadCategories();
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteCategory(id)).unwrap();
      toast.success('Category deleted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category');
    }
  };

  const handleRefresh = () => {
    setSearchTerm('');
    dispatch(fetchCategories({}));
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Categories</h1>
          <p className="text-on-surface-variant mt-1">Manage your ticket categories</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/categories/create')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <Input
                type="search"
                placeholder="Search by category name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
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
        <div className="mt-4 text-sm text-on-surface-variant">
          Showing <span className="font-semibold">{categories.length}</span> of{' '}
          <span className="font-semibold">{total}</span> categories
        </div>
      </div>

      {/* Category Table */}
      <CategoryTable categories={categories} onDelete={handleDelete} loading={loading} />
    </div>
  );
}
