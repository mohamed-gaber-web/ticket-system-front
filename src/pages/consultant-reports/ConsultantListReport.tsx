import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../../redux/hooks/hooks';
import { fetchConsultants } from '../../redux/slices/consultantSlice';
import FilterPanel from '../../components/consultant-reports/FilterPanel';
import type { FilterState } from '../../components/consultant-reports/FilterPanel';
import ConsultantTable from '../../components/consultant-reports/ConsultantTable';
import { Button } from '../../components/ui/button';
import type { ConsultantQueryParams } from '../../types/consultant.types';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/reportExporter';

export default function ConsultantListReport() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { consultants, loading, total } = useAppSelector(
    (state) => state.consultants
  );

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    role: '',
    search: '',
  });

  useEffect(() => {
    loadConsultants();
  }, [page, rowsPerPage]);

  const loadConsultants = () => {
    const params: ConsultantQueryParams = {
      page,
      limit: rowsPerPage,
      ...(filters.status && { status: filters.status }),
      ...(filters.role && { role: filters.role }),
      ...(filters.search && { search: filters.search }),
    };

    dispatch(fetchConsultants(params));
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
    const params: ConsultantQueryParams = {
      page: 1,
      limit: rowsPerPage,
      ...(newFilters.status && { status: newFilters.status }),
      ...(newFilters.role && { role: newFilters.role }),
      ...(newFilters.search && { search: newFilters.search }),
    };
    dispatch(fetchConsultants(params));
  };

  const handleClearFilters = () => {
    setFilters({ status: '', role: '', search: '' });
    setPage(1);
    dispatch(fetchConsultants({ page: 1, limit: rowsPerPage }));
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(1);
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (consultants.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `consultant-report-${timestamp}`;

      switch (format) {
        case 'csv':
          exportToCSV(consultants, `${filename}.csv`);
          toast.success('Report exported as CSV');
          break;
        case 'excel':
          exportToExcel(consultants, `${filename}.xlsx`);
          toast.success('Report exported as Excel');
          break;
        case 'pdf':
          exportToPDF(consultants, `${filename}.pdf`);
          toast.success('Report exported as PDF');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/consultant-reports')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Consultant List Report</h1>
            <p className="text-gray-600 mt-1">
              Detailed view of all consultants with advanced filtering
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} />

      {/* Consultant Table */}
      <ConsultantTable
        consultants={consultants}
        isLoading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={total}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
    </div>
  );
}
