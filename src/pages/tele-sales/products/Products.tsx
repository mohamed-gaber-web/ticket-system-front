import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Package, Plus, RefreshCw, Search, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  fetchProducts,
  fetchProductCategories,
  fetchSalesDocuments,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
} from '@/redux/slices/salesAssistantSlice';
import { isSystemAdmin } from '@/lib/teleSalesRole';
import * as salesAssistantApi from '@/api/salesAssistantApi';
import { apiErrorMessage } from '@/lib/salesAssistant';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { ProductCard } from '@/components/tele-sales/assistant/ProductCard';
import { ProductDetailDialog } from '@/components/tele-sales/assistant/ProductDetailDialog';
import ProductFormDialog from './ProductFormDialog';
import type { Product, ProductInput, ProductQueryParams } from '@/types/salesAssistant.types';

const PAGE_LIMIT = 24;

/**
 * The product catalog — an agent's reference while on a call. Read-only for
 * agents; admins add / edit / archive here. Sending a product to a lead
 * happens from the lead's Assistant tab, where the lead context exists.
 */
export default function Products() {
  const dispatch = useAppDispatch();
  const { products, productsTotal, productsPages, productCategories, productsLoading, documents } = useAppSelector((s) => s.salesAssistant);
  const user = useAppSelector((s) => s.auth.user);
  // Catalog writes are admin-only on the API
  const isAdmin = isSystemAdmin(user);

  const [search, setSearch] = useState('');
  // Search as you type, debounced — agents type a word mid-call and expect the list to follow.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    const params: ProductQueryParams = { page, limit: PAGE_LIMIT };
    if (debouncedSearch) params.search = debouncedSearch;
    if (category) params.category = category;
    if (isAdmin) params.status = status;
    dispatch(fetchProducts(params));
  }, [dispatch, page, debouncedSearch, category, status, isAdmin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    dispatch(fetchProductCategories());
    if (isAdmin) dispatch(fetchSalesDocuments({ status: 'all', limit: 200 }));
  }, [dispatch, isAdmin]);

  const handleRefresh = () => { setSearch(''); setCategory(''); setStatus('active'); setPage(1); };

  const handleSubmit = async (data: ProductInput) => {
    setSaving(true);
    try {
      if (editing) await dispatch(updateProduct({ id: editing._id, data })).unwrap();
      else await dispatch(createProduct(data)).unwrap();
      setFormOpen(false);
      setEditing(null);
      dispatch(fetchProductCategories());
    } catch {
      // toast shown by the slice
    } finally {
      setSaving(false);
    }
  };

  // The list omits the long fields (description, specifications); load the full record to edit.
  const handleEdit = async (product: Product) => {
    try {
      const r = await salesAssistantApi.getProductById(product._id);
      setEditing(r.data);
      setFormOpen(true);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to load product'));
    }
  };

  const handleDelete = async (product: Product) => {
    const result = await Swal.fire({
      title: `Delete "${product.name}"?`,
      text: 'Archiving keeps history intact; deleting removes it permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) dispatch(deleteProduct(product._id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Product Catalog</h1>
          <p className="text-on-surface-variant mt-1">Everything an agent needs to explain a product during a call.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
        <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
              <Input type="search" placeholder="Search by name, SKU, feature…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" autoFocus />
            </div>
          </div>
          <CustomSelect
            variant="filter"
            label="Category"
            value={category}
            onChange={(v) => { setCategory(v); setPage(1); }}
            options={[{ value: '', label: 'All categories' }, ...productCategories.map((c) => ({ value: c, label: c }))]}
          />
          {isAdmin && (
            <CustomSelect
              variant="filter"
              label="Status"
              value={status}
              onChange={(v) => { setStatus(v as typeof status); setPage(1); }}
              options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }, { value: 'all', label: 'All' }]}
            />
          )}
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Reset</Button>
          </div>
        </div>
        <div className="mt-3 text-sm text-on-surface-variant">
          <span className="font-semibold text-on-surface">{productsTotal}</span> product{productsTotal === 1 ? '' : 's'}
          {!isAdmin && (
            <span className="ml-3 inline-flex items-center gap-1 text-xs"><Info className="w-3.5 h-3.5" /> Open a lead to send product details.</span>
          )}
        </div>
      </div>

      {productsLoading && products.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-surface-container animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
          <Package className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No products found</p>
          <p className="text-xs mt-1">{isAdmin ? 'Add your first product to build the catalog.' : 'Try another search or category.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {products.map((p) => (
            <ProductCard
              key={p._id}
              product={p}
              onOpen={(prod) => setDetailId(prod._id)}
              onEdit={isAdmin ? handleEdit : undefined}
              onToggleStatus={isAdmin ? (prod) => dispatch(toggleProductStatus(prod._id)) : undefined}
              onDelete={isAdmin ? handleDelete : undefined}
            />
          ))}
        </div>
      )}

      {productsPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label="Previous page" className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-on-surface-variant px-2">Page {page} of {productsPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= productsPages} aria-label="Next page" className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <ProductDetailDialog productId={detailId} open={Boolean(detailId)} onClose={() => setDetailId(null)} onOpenRelated={(id) => setDetailId(id)} />

      {isAdmin && (
        <ProductFormDialog
          isOpen={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSubmit={handleSubmit}
          product={editing}
          loading={saving}
          documents={documents}
          products={products}
          categories={productCategories}
        />
      )}
    </div>
  );
}
