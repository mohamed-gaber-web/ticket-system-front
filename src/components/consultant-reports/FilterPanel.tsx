import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, X } from 'lucide-react';
import type { ConsultantStatus, ConsultantRole } from '../../types/consultant.types';

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export interface FilterState {
  status: ConsultantStatus | '';
  role: ConsultantRole | '';
  search: string;
}

export default function FilterPanel({
  onFilterChange,
  onClearFilters,
}: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    role: '',
    search: '',
  });

  const handleChange = (field: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onFilterChange(filters);
  };

  const handleClear = () => {
    setFilters({ status: '', role: '', search: '' });
    onClearFilters();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full h-11 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full h-11 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="">All</option>
              <option value="consultant">Consultant</option>
              <option value="senior_consultant">Senior Consultant</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-11"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleApply}
              className="flex-1 h-11"
              variant="default"
            >
              <Search className="w-4 h-4 mr-2" />
              Apply
            </Button>
            <Button
              onClick={handleClear}
              className="h-11"
              variant="outline"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
