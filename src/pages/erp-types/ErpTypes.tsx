import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchErpTypes,
  createErpType,
  updateErpType,
  deleteErpType,
} from '@/redux/slices/erpTypeSlice';
import ErpTypeTable from './ErpTypeTable';
import ErpTypeFormDialog from './ErpTypeFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import type { ErpType, CreateErpTypeDto, UpdateErpTypeDto } from '@/types/erpType.types';

const PAGE_LIMIT = 10;

export default function ErpTypes() {
  const dispatch = useAppDispatch();
  const { erpTypes, loading, total, pages } = useAppSelector((state) => state.erpTypes);
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingErpType, setEditingErpType] = useState<ErpType | null>(null);

  useEffect(() => {
    loadErpTypes(currentPage);
  }, [currentPage]);

  const loadErpTypes = (page = 1) => {
    const params: any = { page, limit: PAGE_LIMIT };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';
    dispatch(fetchErpTypes(params));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    const params: any = { page: 1, limit: PAGE_LIMIT };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== '') params.isActive = statusFilter === 'active';
    dispatch(fetchErpTypes(params));
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCurrentPage(1);
    dispatch(fetchErpTypes({ page: 1, limit: PAGE_LIMIT }));
  };

  const handleCreate = () => {
    setEditingErpType(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (erpType: ErpType) => {
    setEditingErpType(erpType);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteErpType(id)).unwrap();
    loadErpTypes(currentPage);
  };

  const handleFormSubmit = async (data: CreateErpTypeDto | UpdateErpTypeDto) => {
    try {
      if (editingErpType) {
        await dispatch(updateErpType({ id: editingErpType._id, data })).unwrap();
      } else {
        await dispatch(createErpType(data as CreateErpTypeDto)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingErpType(null);
      loadErpTypes(currentPage);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingErpType(null);
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
          <h1 className="display-sm text-on-surface">ERP Types</h1>
          <p className="text-on-surface-variant mt-1">Manage ERP types</p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add ERP Type
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
                placeholder="Search ERP types..."
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
          Showing <span className="font-semibold text-on-surface">{total === 0 ? 0 : startItem}–{endItem}</span> of{' '}
          <span className="font-semibold text-on-surface">{total}</span> ERP types
        </div>
      </div>

      {/* ERP Type Table */}
      <ErpTypeTable
        erpTypes={erpTypes || []}
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
      <ErpTypeFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        erpType={editingErpType}
        loading={loading}
      />
    </div>
  );
}
