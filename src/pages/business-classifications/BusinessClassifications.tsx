import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchBusinessClassifications,
  createBusinessClassification,
  updateBusinessClassification,
  deleteBusinessClassification,
} from '@/redux/slices/businessClassificationSlice';
import BusinessClassificationTable from './BusinessClassificationTable';
import BusinessClassificationFormDialog from './BusinessClassificationFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import type {
  BusinessClassification,
  CreateBusinessClassificationData,
  UpdateBusinessClassificationData,
} from '@/types/businessClassification.types';

const PAGE_LIMIT = 10;

export default function BusinessClassifications() {
  const dispatch = useAppDispatch();
  const { businessClassifications, loading, total, pages } = useAppSelector(
    (state) => state.businessClassifications
  );
  // Admin can be a consultant-admin or a tele_sales admin (whose role lives on user.role).
  const isAdmin = useAppSelector(
    (state) => state.auth.consultantRole === 'admin' || (state.auth.user as any)?.role === 'admin'
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BusinessClassification | null>(null);

  useEffect(() => {
    loadItems(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadItems = (page = 1) => {
    const params: any = { page, limit: PAGE_LIMIT };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';
    dispatch(fetchBusinessClassifications(params));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    const params: any = { page: 1, limit: PAGE_LIMIT };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';
    dispatch(fetchBusinessClassifications(params));
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCurrentPage(1);
    dispatch(fetchBusinessClassifications({ page: 1, limit: PAGE_LIMIT }));
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: BusinessClassification) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteBusinessClassification(id)).unwrap();
    loadItems(currentPage);
  };

  const handleFormSubmit = async (
    data: CreateBusinessClassificationData | UpdateBusinessClassificationData
  ) => {
    try {
      if (editingItem) {
        await dispatch(
          updateBusinessClassification({ id: editingItem._id, data })
        ).unwrap();
      } else {
        await dispatch(
          createBusinessClassification(data as CreateBusinessClassificationData)
        ).unwrap();
      }
      setIsDialogOpen(false);
      setEditingItem(null);
      loadItems(currentPage);
    } catch (error) {
      // Error is handled in the slice with toast
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const getPageNumbers = () => {
    const pageNumbers: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(pages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    return pageNumbers;
  };

  const startItem = (currentPage - 1) * PAGE_LIMIT + 1;
  const endItem = Math.min(currentPage * PAGE_LIMIT, total);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Business Classifications</h1>
          <p className="text-on-surface-variant mt-1">
            Manage the business classifications (specific activities) used on tele-sales leads
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Business Classification
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
                placeholder="Search business classifications..."
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
          Showing{' '}
          <span className="font-semibold text-on-surface">
            {total === 0 ? 0 : startItem}–{endItem}
          </span>{' '}
          of <span className="font-semibold text-on-surface">{total}</span> business classifications
        </div>
      </div>

      {/* Table */}
      <BusinessClassificationTable
        items={businessClassifications}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      {/* Pagination */}
      {total > 0 && pages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={pageNum === currentPage ? 'page' : undefined}
              className={`min-w-[36px] h-9 rounded-[0.75rem] text-sm font-semibold transition-colors ${
                pageNum === currentPage
                  ? 'bg-primary-fixed text-on-primary-fixed'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= pages}
            aria-label="Next page"
            className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Form Dialog */}
      <BusinessClassificationFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        item={editingItem}
        loading={loading}
      />
    </div>
  );
}
