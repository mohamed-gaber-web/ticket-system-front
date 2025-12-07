import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCustomers, deleteCustomer } from '@/redux/slices/customerSlice';
import CustomerTable from './components/CustomerTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';

export default function Customers() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { customers, loading, total } = useAppSelector((state) => state.customers);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    dispatch(fetchCustomers(params));
  };

  const handleSearch = () => {
    loadCustomers();
  };

  const handleDelete = (id: string) => {
    dispatch(deleteCustomer(id));
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchCustomers({}));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer accounts</p>
        </div>
        <Button onClick={() => navigate('/customers/create')} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
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
                placeholder="Search by company name, email, or contact person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
              <option value="suspended">Suspended</option>
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
          Showing <span className="font-semibold">{customers.length}</span> of{' '}
          <span className="font-semibold">{total}</span> customers
        </div>
      </div>

      {/* Customer Table */}
      <CustomerTable customers={customers} onDelete={handleDelete} isLoading={loading} />
    </div>
  );
}
