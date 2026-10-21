import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { FileSignature, FilterX, Loader2, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import { deleteProposal, getProposalFilterOptions, getProposals, type ProposalFilterOptions } from '@/api/proposalApi';
import { formatUsd } from '@/lib/proposalMath';
import { useAccess } from '@/redux/hooks/useAccess';
import { personName, type ProposalStatus, type ProposalSummary } from '@/types/proposal.types';
import ProposalStatusBadge, { NeedsYourApproval } from '@/components/proposals/ProposalStatusBadge';
import NewProposalDialog from '@/components/proposals/NewProposalDialog';

const STATUSES: ProposalStatus[] = ['Draft', 'Pending approval', 'Approved', 'Sent', 'Accepted', 'Rejected'];

/** The multi-select filters, in display order; each lives in the URL as a comma list. */
const FILTERS = [
  { key: 'status', label: 'Status', all: 'All statuses' },
  { key: 'owner', label: 'Owner (agent)', all: 'All owners' },
  { key: 'preparedBy', label: 'Prepared by', all: 'Anyone' },
  { key: 'leadSource', label: 'Lead source', all: 'All sources' },
  { key: 'industry', label: 'Industry', all: 'All industries' },
  { key: 'country', label: 'Country', all: 'All countries' },
] as const;
type FilterKey = (typeof FILTERS)[number]['key'];
type FilterValues = Record<FilterKey, string[]>;

const listFromUrl = (params: URLSearchParams, key: string) =>
  (params.get(key) ?? '').split(',').map((v) => v.trim()).filter(Boolean);
const named = (values: string[]): MultiSelectItem[] => values.map((v) => ({ _id: v, name: v }));
const PAGE_SIZE = 20;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const apiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export default function ProposalsList() {
  const { canManageProposals, isAdmin } = useAccess();
  const [rows, setRows] = useState<ProposalSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [options, setOptions] = useState<ProposalFilterOptions | null>(null);

  // Filters live in the URL so a filtered list can be bookmarked or shared.
  const filters = useMemo(
    () => Object.fromEntries(FILTERS.map(({ key }) => [key, listFromUrl(searchParams, key)])) as FilterValues,
    [searchParams],
  );
  const activeCount = FILTERS.reduce((n, { key }) => n + (filters[key].length ? 1 : 0), 0);

  const setFilter = (key: FilterKey, values: string[]) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (values.length) next.set(key, values.join(','));
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
    setPage(1);
  };
  const clearFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        FILTERS.forEach(({ key }) => next.delete(key));
        return next;
      },
      { replace: true },
    );
    setPage(1);
  };

  useEffect(() => {
    getProposalFilterOptions()
      .then((res) => setOptions(res.data))
      .catch(() => setOptions(null));
  }, []);

  const items: Record<FilterKey, MultiSelectItem[]> = useMemo(
    () => ({
      status: named(options?.statuses ?? STATUSES),
      owner: options?.owners ?? [],
      preparedBy: options?.preparedBy ?? [],
      leadSource: named(options?.leadSources ?? []),
      industry: named(options?.industries ?? []),
      country: named(options?.countries ?? []),
    }),
    [options],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProposals({
        q: q || undefined,
        ...filters,
        status: filters.status as ProposalStatus[],
        page,
        limit: PAGE_SIZE,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      toast.error(apiError(e, 'Could not load proposals'));
    } finally {
      setLoading(false);
    }
  }, [q, filters, page]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  // Delete is offered only on rows the API says the caller may delete (Draft, by
  // the author or a sales manager). The confirm guards an irreversible action.
  const remove = async (p: ProposalSummary) => {
    const confirmed = await Swal.fire({
      title: `Delete proposal ${p.number}?`,
      text: 'This permanently deletes this draft proposal. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
    });
    if (!confirmed.isConfirmed) return;
    setDeletingId(p._id);
    try {
      await deleteProposal(p._id);
      toast.success(`Deleted ${p.number}`);
      setRows((cur) => cur.filter((r) => r._id !== p._id));
      setTotal((n) => Math.max(0, n - 1));
    } catch (e) {
      toast.error(apiError(e, 'Could not delete the proposal'));
    } finally {
      setDeletingId(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-sm text-on-surface">Proposals</h1>
          <p className="mt-1 text-on-surface-variant">Business proposals built from opportunities — scope, pricing, terms and a branded PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageProposals && (
            <Button asChild variant="outline">
              <Link to="/proposals/price-list">
                <Settings2 /> Price list
              </Link>
            </Button>
          )}
          <Button onClick={() => setCreating(true)}>
            <Plus /> New proposal
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-[1rem] bg-surface-container-lowest p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search number or client"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {FILTERS.map(({ key, label, all }) => (
            <div key={key} className="min-w-0 space-y-1">
              <span className="text-xs font-medium text-on-surface-variant">{label}</span>
              <MultiSelect
                items={items[key]}
                value={filters[key]}
                onChange={(values) => setFilter(key, values)}
                placeholder={all}
                loading={!options && key !== 'status'}
                searchPlaceholder={`Search ${label.toLowerCase()}…`}
                emptyMessage="Nothing to filter by yet"
              />
            </div>
          ))}
        </div>
        {activeCount > 0 && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-on-surface-variant">
              {activeCount} filter{activeCount === 1 ? '' : 's'} applied · {total} proposal{total === 1 ? '' : 's'}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <FilterX /> Clear filters
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[1rem] bg-surface-container-lowest">
        {loading && !rows.length ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-container-low" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="rounded-full bg-surface-container-high p-4 text-on-surface-variant">
              <FileSignature className="h-6 w-6" />
            </span>
            <p className="font-semibold text-on-surface">{q || activeCount ? 'No proposal matches these filters' : 'No proposals yet'}</p>
            <p className="max-w-sm text-sm text-on-surface-variant">Start one from an opportunity with “New proposal”, or from the Proposals tab of an opportunity.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <th className="px-4 py-3">Proposal</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Prepared by</th>
                  <th className="px-4 py-3 text-right">Grand total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {rows.map((p) => (
                  <tr key={p._id} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-4 py-3">
                      <Link to={`/proposals/${p._id}`} className="font-semibold text-primary hover:underline">
                        {p.number}
                      </Link>
                      <span className="block text-xs text-on-surface-variant">Version {p.version}</span>
                    </td>
                    <td className="px-4 py-3 text-on-surface">{p.client}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{fmtDate(p.presentedDate)}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{personName(p.preparedBy)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-on-surface">{formatUsd(p.totals?.grand ?? 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ProposalStatusBadge status={p.status} />
                        {isAdmin && p.status === 'Pending approval' && <NeedsYourApproval overLimit={p.discountOverLimit} />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Admins may always delete (the API enforces it); the
                          permissions flag covers sales managers / draft authors. */}
                      {(p.permissions?.delete || isAdmin) && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-on-surface-variant hover:text-error"
                          aria-label={`Delete proposal ${p.number}`}
                          title="Delete this proposal"
                          disabled={deletingId === p._id}
                          onClick={() => remove(p)}
                        >
                          {deletingId === p._id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-outline-variant/30 px-4 py-3 text-sm">
            <span className="text-on-surface-variant">
              {total} proposals · page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <NewProposalDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
