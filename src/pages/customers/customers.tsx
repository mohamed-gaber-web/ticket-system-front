import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCustomers, deleteCustomer, createCustomer, updateCustomer, adminResetCustomerPassword } from '@/redux/slices/customerSlice';
import { fetchErpTypes } from '@/redux/slices/erpTypeSlice';
import { fetchVersionNumbers } from '@/redux/slices/versionNumberSlice';
import CustomerTable from './components/CustomerTable';
import CustomerFormDialog from './components/CustomerFormDialog';
import AdminChangePasswordDialog from '@/components/admin/AdminChangePasswordDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from '@/components/ui/custom-select';
import type { Customer, CreateCustomerData, UpdateCustomerData } from '@/types/customer.types';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Customers() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { customers, loading, total, page, pages } = useAppSelector((state) => state.customers);
  const { userType, consultantRole } = useAppSelector((state) => state.auth);
  const isAdmin = userType === 'consultant' && consultantRole === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    dispatch(fetchErpTypes({}));
    dispatch(fetchVersionNumbers({}));
  }, []);

  const buildParams = (pageNum = currentPage, limit = itemsPerPage) => {
    const params: any = { page: pageNum, limit };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    return params;
  };

  // Auto-search with debounce when searchTerm or statusFilter changes — reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      dispatch(fetchCustomers(buildParams(1)));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // Re-fetch when page or page size changes
  useEffect(() => {
    dispatch(fetchCustomers(buildParams()));
  }, [currentPage, itemsPerPage]);

  const loadCustomers = () => {
    dispatch(fetchCustomers(buildParams()));
  };

  const handleSearch = () => {
    setCurrentPage(1);
    dispatch(fetchCustomers(buildParams(1)));
  };

  const handleDelete = (id: string) => {
    dispatch(deleteCustomer(id)).then(() => {
      const remainingOnPage = customers.length - 1;
      if (remainingOnPage === 0 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        loadCustomers();
      }
    });
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCurrentPage(1);
    dispatch(fetchCustomers({ page: 1, limit: itemsPerPage }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pages) return;
    setCurrentPage(newPage);
  };

  const getPageNumbers = () => {
    const maxVisible = 5;
    const pageNumbers: number[] = [];
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(pages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    return pageNumbers;
  };

  const startItem = total === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const endItem = Math.min(page * itemsPerPage, total);

  const handleCreate = () => {
    setEditingCustomer(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateCustomerData | UpdateCustomerData) => {
    try {
      if (editingCustomer) {
        await dispatch(updateCustomer({ id: editingCustomer._id, data: data as UpdateCustomerData })).unwrap();
        setIsDialogOpen(false);
        setEditingCustomer(null);
        loadCustomers();
      } else {
        await dispatch(createCustomer(data as CreateCustomerData)).unwrap();
        setIsDialogOpen(false);
        setEditingCustomer(null);
        loadCustomers();
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);

      // Close modal on error
      setIsDialogOpen(false);
      setEditingCustomer(null);

      // For create operations, reload after delay since customer might have been created
      // Don't reload immediately to avoid clearing the current customer list
      if (!editingCustomer) {
        setTimeout(() => {
          loadCustomers();
        }, 2000);
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Customers</h1>
          <p className="text-on-surface-variant mt-1">Manage your customer accounts</p>
        </div>
        {userType === 'consultant' && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/customers/summary')} className="gap-2">
              <BarChart2 className="h-4 w-4" />
              Summary
            </Button>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
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
                placeholder="Search by company name, email, or contact person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              { value: 'suspended', label: 'Suspended' },
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
          Showing <span className="font-semibold text-on-surface">{startItem}{endItem > startItem ? `–${endItem}` : ''}</span> of{' '}
          <span className="font-semibold text-on-surface">{total}</span> customers
        </div>
      </div>

      {/* Customer Table */}
      <CustomerTable
        customers={customers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onChangePassword={(customer) => setPasswordTarget({ id: customer._id, name: customer.companyName })}
        showChangePassword={isAdmin}
        isLoading={loading}
      />

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-on-surface-variant">
              Showing <span className="font-semibold text-on-surface">{startItem}–{endItem}</span> of{' '}
              <span className="font-semibold text-on-surface">{total.toLocaleString()}</span> customers
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-on-surface-variant">Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-7 px-2 pr-6 rounded-[0.5rem] text-xs font-semibold bg-surface-container-lowest border border-border text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer appearance-none"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                aria-label={`Page ${pageNum}`}
                aria-current={pageNum === page ? 'page' : undefined}
                className={`min-w-[36px] h-9 rounded-[0.75rem] text-sm font-semibold transition-colors ${
                  pageNum === page
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pages}
              aria-label="Next page"
              className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <CustomerFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        customer={editingCustomer}
        loading={loading}
      />

      {/* Change Password Dialog */}
      <AdminChangePasswordDialog
        open={!!passwordTarget}
        onOpenChange={(open) => { if (!open) setPasswordTarget(null); }}
        targetName={passwordTarget?.name ?? ''}
        loading={loading}
        onSubmit={async (newPassword) => {
          if (!passwordTarget) return;
          await dispatch(adminResetCustomerPassword({ id: passwordTarget.id, newPassword }));
        }}
      />
    </div>
  );
}
