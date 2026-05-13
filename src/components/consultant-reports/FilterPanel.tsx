import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
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
          <CustomSelect
            variant="filter"
            value={filters.status}
            onChange={(value) => handleChange('status', value)}
            label="Status"
            options={[
              { value: '', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'on_leave', label: 'On Leave' },
            ]}
          />

          <CustomSelect
            variant="filter"
            value={filters.role}
            onChange={(value) => handleChange('role', value)}
            label="Role"
            options={[
              { value: '', label: 'All' },
              { value: 'consultant', label: 'Consultant' },
              { value: 'admin', label: 'Admin' },
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
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
