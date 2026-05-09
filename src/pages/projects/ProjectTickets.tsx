import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTickets, deleteTicket } from '@/redux/slices/ticketSlice';
import { fetchServiceTypes } from '@/redux/slices/serviceTypeSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { fetchCustomers } from '@/redux/slices/customerSlice';
import { fetchCompanies } from '@/redux/slices/companySlice';
import { fetchCategories } from '@/redux/slices/categorySlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchModules } from '@/redux/slices/moduleSlice';
import { fetchSources } from '@/redux/slices/sourceSlice';
import { fetchCustomizedSolutions } from '@/redux/slices/customizedSolutionSlice';
import TicketTable from '@/pages/tickets/components/TicketTable';
import { ChevronLeft, ChevronRight, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 25;

export default function ProjectTickets() {
  const dispatch = useAppDispatch();
  const { tickets, loading, total, page, pages } = useAppSelector((s) => s.tickets);
  const { serviceTypes } = useAppSelector((s) => s.serviceTypes);
  const { userType } = useAppSelector((s) => s.auth);
  const isCustomer = userType === 'customer';

  const [currentPage, setCurrentPage] = useState(1);

  // Resolve "Project" service type ID from loaded list
  const projectId = serviceTypes?.find(
    (s) => s.name.toLowerCase() === 'project'
  )?._id;

  // Load supporting data for TicketTable display
  useEffect(() => {
    if (!isCustomer) {
      dispatch(fetchServiceTypes({ limit: 1000 }));
      dispatch(fetchConsultants({ limit: 1000 }));
      dispatch(fetchCustomers({ limit: 1000 }));
      dispatch(fetchCompanies({ limit: 1000 }));
      dispatch(fetchDepartments({ limit: 1000 }));
      dispatch(fetchModules({ limit: 1000 }));
      dispatch(fetchSources({ isActive: true, limit: 1000 }));
    }
    dispatch(fetchCategories({ limit: 9999 }));
    dispatch(fetchCustomizedSolutions({ limit: 9999 }));
  }, [isCustomer]);

  const fetchPage = useCallback((p: number) => {
    if (!projectId) return;
    dispatch(fetchTickets({ serviceType: projectId, page: p, limit: PAGE_SIZE }));
  }, [dispatch, projectId]);

  useEffect(() => {
    fetchPage(currentPage);
  }, [fetchPage, currentPage]);

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteTicket(id)).unwrap();
      toast.success('Ticket deleted successfully!');
      fetchPage(currentPage);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete ticket');
    }
  };

  const startItem = (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  const getPageNumbers = () => {
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(pages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
          <FolderKanban className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <h1 className="display-sm text-on-surface">Project Tickets</h1>
          <p className="text-on-surface-variant mt-0.5">
            All tickets with <span className="font-semibold">Project</span> service type
            {total > 0 && <span> · <span className="font-semibold text-on-surface">{total.toLocaleString()}</span> total</span>}
          </p>
        </div>
      </div>

      <TicketTable tickets={tickets} onDelete={handleDelete} loading={loading} />

      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-on-surface-variant">
            Showing <span className="font-semibold text-on-surface">{startItem}–{endItem}</span> of{' '}
            <span className="font-semibold text-on-surface">{total.toLocaleString()}</span> results
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {getPageNumbers().map((n) => (
              <button
                key={n}
                onClick={() => setCurrentPage(n)}
                aria-current={n === page ? 'page' : undefined}
                className={`min-w-[36px] h-9 rounded-[0.75rem] text-sm font-semibold transition-colors ${
                  n === page
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              aria-label="Next page"
              className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
