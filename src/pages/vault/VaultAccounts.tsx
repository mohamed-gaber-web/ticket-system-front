import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useAccess } from '@/redux/hooks/useAccess';
import { deleteVaultEntry, fetchVaultEntries } from '@/redux/slices/vaultEntriesSlice';
import { setSendDraftEntries } from '@/redux/slices/vaultSendSlice';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useVaultSetup } from '@/hooks/useVaultSetup';
import type { VaultEntry } from '@/types/vault.types';
import { VaultLayout } from '@/components/vault/VaultLayout';
import { VaultEntryCard } from '@/components/vault/VaultEntryCard';
import { VaultEntryDetailsDialog } from '@/components/vault/VaultEntryDetailsDialog';
import { VaultEntryFormDialog } from '@/components/vault/VaultEntryFormDialog';
import { LookupSelect } from '@/components/vault/LookupSelect';
import { EmptyState, ErrorState, VaultSelect } from '@/components/vault/VaultUi';

const PAGE_SIZE = 24;
const FILTER_KEYS = ['ownerType', 'client', 'category', 'environment'] as const;

/** Accounts: searchable card grid of every stored sign-in. Filters live in the URL. */
export default function VaultAccounts() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAdmin } = useAccess();
  useVaultSetup();
  const { items, total, pages, status, error } = useAppSelector((s) => s.vaultEntries);
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const filters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ''])) as Record<(typeof FILTER_KEYS)[number], string>,
    [params],
  );

  // Search box: typed locally, written to the URL 300 ms after the last key.
  const [search, setSearch] = useState(q);
  const debounced = useDebouncedValue(search, 300);
  useEffect(() => {
    if (debounced.trim() === q) return;
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (debounced.trim()) next.set('q', debounced.trim());
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [debounced, q, setParams]);

  const setParam = (key: string, value: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace: key !== 'page' },
    );

  const load = useCallback(() => {
    void dispatch(
      fetchVaultEntries({
        q: q || undefined,
        ownerType: filters.ownerType || undefined,
        client: filters.client || undefined,
        category: filters.category || undefined,
        environment: filters.environment || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    );
  }, [dispatch, q, filters, page]);

  useEffect(load, [load]);

  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; entry: VaultEntry | null }>({ open: false, entry: null });

  const send = (id: string) => {
    dispatch(setSendDraftEntries([id]));
    navigate('/vault/send');
  };

  const remove = async (entry: VaultEntry) => {
    const res = await dispatch(deleteVaultEntry(entry._id));
    if (deleteVaultEntry.fulfilled.match(res)) {
      toast.success(`${entry.platform} deleted`);
      load();
    } else {
      toast.error((res.payload as string) ?? 'Could not delete the account');
    }
  };

  const hasFilters = !!q || FILTER_KEYS.some((k) => filters[k]);
  const clearFilters = () => {
    setSearch('');
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <VaultLayout
      title="Accounts"
      description="Client and company sign-ins. Passwords stay hidden until you reveal or copy them, and every reveal is logged."
      actions={
        isAdmin && (
          <Button onClick={() => setForm({ open: true, entry: null })}>
            <Plus /> New account
          </Button>
        )
      }
    >
      <div className="grid grid-cols-1 gap-2 rounded-[1rem] bg-surface-container-lowest p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by platform, client or username"
            aria-label="Search accounts"
            className="pl-9"
          />
        </div>
        <VaultSelect aria-label="Owner" value={filters.ownerType} onChange={(e) => setParam('ownerType', e.target.value)}>
          <option value="">All accounts</option>
          <option value="client">Client accounts</option>
          <option value="company">Company accounts</option>
        </VaultSelect>
        <LookupSelect aria-label="Client" source="clients" value={filters.client} emptyLabel="All clients" onChange={(v) => setParam('client', v)} />
        <LookupSelect aria-label="Category" source="category" value={filters.category} emptyLabel="All categories" onChange={(v) => setParam('category', v)} />
        <LookupSelect
          aria-label="Environment"
          source="environment"
          value={filters.environment}
          emptyLabel="All environments"
          onChange={(v) => setParam('environment', v)}
        />
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="sm:col-span-2 lg:col-span-1">
            <X /> Clear
          </Button>
        )}
      </div>

      {status === 'failed' ? (
        <ErrorState message={error ?? 'Could not load the accounts'} onRetry={load} />
      ) : status !== 'succeeded' && !items.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,310px),1fr))] gap-3" aria-busy="true" aria-label="Loading accounts">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-[1rem] bg-surface-container-low" />
          ))}
        </div>
      ) : !items.length ? (
        <div className="rounded-[1rem] bg-surface-container-lowest">
          <EmptyState
            icon={<KeyRound className="h-6 w-6" />}
            title={hasFilters ? 'No matching accounts' : 'No accounts yet'}
            hint={hasFilters ? 'Try another search or clear the filters.' : isAdmin ? 'Add the first one with "New account".' : 'An admin adds the accounts.'}
          />
        </div>
      ) : (
        <>
          <p className="text-xs text-on-surface-variant" aria-live="polite">
            {total} account{total === 1 ? '' : 's'}
            {status === 'loading' ? ' · updating…' : ''}
          </p>
          <div className={`grid grid-cols-[repeat(auto-fill,minmax(min(100%,310px),1fr))] gap-3 ${status === 'loading' ? 'opacity-60' : ''}`}>
            {items.map((e) => (
              <VaultEntryCard
                key={e._id}
                entry={e}
                canManage={isAdmin}
                onSend={() => send(e._id)}
                onDetails={() => setDetailsId(e._id)}
                onEdit={() => setForm({ open: true, entry: e })}
                onDelete={() => remove(e)}
              />
            ))}
          </div>
          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-2 text-sm">
              <span className="text-on-surface-variant">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setParam('page', String(page + 1))}>
                  Next
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      <VaultEntryDetailsDialog
        entryId={detailsId}
        canManage={isAdmin}
        onClose={() => setDetailsId(null)}
        onEdit={(entry) => {
          setDetailsId(null);
          setForm({ open: true, entry });
        }}
      />
      {isAdmin && (
        <VaultEntryFormDialog
          open={form.open}
          entry={form.entry}
          onClose={() => setForm({ open: false, entry: null })}
          onSaved={() => {
            setForm({ open: false, entry: null });
            load();
          }}
        />
      )}
    </VaultLayout>
  );
}
