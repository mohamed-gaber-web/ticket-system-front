import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Download, ExternalLink, FileText, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAccess } from '@/redux/hooks/useAccess';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchSocialPosts, setSearch, setSort, socialChanged, toggleCompare } from '@/redux/slices/socialSlice';
import { deleteSocialPost, deleteSocialSamples, downloadSocialCsv } from '@/api/socialApi';
import { SOCIAL_BASE, SocialLayout } from '@/components/social/SocialLayout';
import { BAD_TEXT, FilterBar, GOOD_TEXT, Pill, PlatformPill, TableBox, TD, TD_NUM, TH, ViewBar } from '@/components/social/SocialUi';
import { ConfirmButton, EmptyState, ErrorState } from '@/components/vault/VaultUi';
import { saveBlob } from '@/lib/vault';
import { apiError, fmtDay, fmtNumber, fmtPercent, MAX_COMPARE, monthLabel } from '@/lib/socialPulse';
import type { SocialPostRow } from '@/types/social.types';

const COLUMNS: { key: string; label: string; num?: boolean }[] = [
  { key: 'publishDate', label: 'Published' },
  { key: 'title', label: 'Post' },
  { key: 'platform', label: 'Platform' },
  { key: 'latestMonth', label: 'Last pull' },
  { key: 'reach', label: 'Reach', num: true },
  { key: 'engagement', label: 'Engagement', num: true },
  { key: 'er', label: 'Eng. rate', num: true },
  { key: 'clicks', label: 'Clicks', num: true },
  { key: 'leads', label: 'Leads', num: true },
];

/** Posts table (§7.4): server-sorted, numbers follow the current view. */
export default function SocialPosts() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { canWriteSocial } = useAccess();
  const { ui, posts, postsStatus, postsError, dataVersion, meta } = useAppSelector((s) => s.social);
  const { view, month, filters, q, sort, compareIds } = ui;
  const [search, setSearchText] = useState(q);
  const [exporting, setExporting] = useState(false);

  // Search box → store, debounced.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (search !== q) dispatch(setSearch(search));
    }, 300);
    return () => window.clearTimeout(t);
  }, [search, q, dispatch]);

  const query = useMemo(
    () => ({ ...filters, q, view, month: view === 'month' ? month : undefined, sort: sort.key, dir: sort.dir }),
    [filters, q, view, month, sort],
  );

  useEffect(() => {
    if (view === 'month' && !month) return;
    void dispatch(fetchSocialPosts(query));
  }, [dispatch, query, view, month, dataVersion]);

  const avgEr = useMemo(() => {
    const reach = posts.reduce((s, r) => s + (r.values.reach ?? 0), 0);
    const eng = posts.reduce((s, r) => s + r.engagement, 0);
    return reach > 0 ? eng / reach : null;
  }, [posts]);

  const onCompare = (id: string) => {
    if (!compareIds.includes(id) && compareIds.length >= MAX_COMPARE) {
      toast.error(`You can compare up to ${MAX_COMPARE} posts`);
      return;
    }
    dispatch(toggleCompare(id));
  };

  const onDelete = async (row: SocialPostRow) => {
    try {
      await deleteSocialPost(row.id);
      if (compareIds.includes(row.id)) dispatch(toggleCompare(row.id));
      toast.success('Post deleted');
      void dispatch(socialChanged());
    } catch (e) {
      toast.error(apiError(e, 'Could not delete the post'));
    }
  };

  const onDeleteSamples = async () => {
    try {
      const { deleted } = await deleteSocialSamples();
      toast.success(`${deleted} example post${deleted === 1 ? '' : 's'} deleted`);
      void dispatch(socialChanged());
    } catch (e) {
      toast.error(apiError(e, 'Could not delete the example posts'));
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      saveBlob(await downloadSocialCsv({ ...filters, q }), 'growpath-social-results.csv');
    } catch (e) {
      toast.error(apiError(e, 'Could not export the results'));
    } finally {
      setExporting(false);
    }
  };

  const erTone = (er: number | null) =>
    er == null || avgEr == null ? '' : er >= avgEr * 1.2 ? GOOD_TEXT : er <= avgEr * 0.6 ? BAD_TEXT : '';

  const filtered = Object.values(filters).some(Boolean) || !!q || view === 'month';
  const loading = postsStatus === 'loading' || postsStatus === 'idle';

  return (
    <SocialLayout title="Posts">
      <ViewBar />
      <FilterBar />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search titles"
            aria-label="Search titles"
            className="pl-9"
          />
        </div>
        {canWriteSocial && (meta?.sampleCount ?? 0) > 0 && (
          <ConfirmButton
            onConfirm={onDeleteSamples}
            label={`Delete example posts (${meta?.sampleCount})`}
            confirmLabel="Confirm: delete examples"
            size="default"
          />
        )}
        <Button variant="outline" onClick={onExport} disabled={exporting}>
          <Download /> {exporting ? 'Exporting…' : 'Export CSV (all months)'}
        </Button>
        {canWriteSocial && (
          <Button asChild>
            <Link to={`${SOCIAL_BASE}/posts/new`}>
              <Plus /> New post
            </Link>
          </Button>
        )}
      </div>

      {postsStatus === 'failed' && posts.length === 0 ? (
        <ErrorState message={postsError ?? 'Could not load the posts'} onRetry={() => void dispatch(fetchSocialPosts(query))} />
      ) : !loading && posts.length === 0 ? (
        <div className="rounded-[1rem] bg-surface-container-lowest">
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title={filtered && (meta?.postCount ?? 0) > 0 ? 'No posts match the current view or filter' : 'No posts entered yet'}
            hint={
              canWriteSocial ? (
                <Button className="mt-2" onClick={() => navigate(`${SOCIAL_BASE}/posts/new`)}>
                  <Plus /> Add a post
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <TableBox className={cn(loading && 'opacity-60')}>
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-outline-variant/40">
              <tr>
                <th className={TH} scope="col">
                  Compare
                </th>
                {COLUMNS.map((c) => {
                  const active = sort.key === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      className={cn(TH, c.num && 'text-right')}
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button
                        type="button"
                        onClick={() => dispatch(setSort(c.key))}
                        className={cn('inline-flex items-center gap-1 rounded uppercase outline-none hover:text-on-surface focus-visible:ring-[2px] focus-visible:ring-primary/40', active && 'text-primary')}
                      >
                        {c.label}
                        {active && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                  );
                })}
                <th className={cn(TH, 'text-right')} scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {posts.map((r) => {
                const current = r.latestMonth === meta?.currentMonth;
                const gain = r.lastGainEngagement == null ? null : Math.max(0, r.lastGainEngagement);
                return (
                  <tr key={r.id} className="hover:bg-surface-container-low/60">
                    <td className={TD}>
                      <Checkbox
                        checked={compareIds.includes(r.id)}
                        onCheckedChange={() => onCompare(r.id)}
                        aria-label={`Compare ${r.title}`}
                      />
                    </td>
                    <td className={cn(TD, 'whitespace-nowrap tabular-nums text-on-surface-variant')}>{fmtDay(r.publishDate)}</td>
                    <td className={cn(TD, 'min-w-[16rem] max-w-[24rem]')}>
                      {r.link ? (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          dir="auto"
                          className="inline-flex items-start gap-1 font-semibold text-on-surface hover:text-primary hover:underline"
                        >
                          <span className="line-clamp-2">{r.title}</span>
                          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
                        </a>
                      ) : (
                        <span dir="auto" className="line-clamp-2 font-semibold text-on-surface">
                          {r.title}
                        </span>
                      )}
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-on-surface-variant">
                        {r.category && <span dir="auto">{r.category}</span>}
                        {r.boosted && <span>· Paid</span>}
                        {r.isSample && <Pill tone="accent">Example</Pill>}
                      </div>
                    </td>
                    <td className={TD}>
                      <PlatformPill platform={r.platform} />
                    </td>
                    <td className={cn(TD, 'whitespace-nowrap')}>
                      <Pill tone={current ? 'ok' : 'warn'} title={current ? 'Pulled this month' : 'Not pulled this month'}>
                        {monthLabel(r.latestMonth)}
                      </Pill>
                      <p className="mt-0.5 text-[11px] tabular-nums text-on-surface-variant">
                        {r.pullCount} pull{r.pullCount === 1 ? '' : 's'}
                        {gain != null && ` · +${fmtNumber(gain)} eng.`}
                      </p>
                    </td>
                    <td className={TD_NUM}>{fmtNumber(r.values.reach)}</td>
                    <td className={TD_NUM}>{fmtNumber(r.engagement)}</td>
                    <td className={cn(TD_NUM, 'font-semibold', erTone(r.er))}>{fmtPercent(r.er)}</td>
                    <td className={TD_NUM}>{fmtNumber(r.values.clicks)}</td>
                    <td className={TD_NUM}>{fmtNumber(r.values.leads)}</td>
                    <td className={cn(TD, 'text-right')}>
                      <div className="flex justify-end gap-1">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`${SOCIAL_BASE}/posts/${r.id}`}>{canWriteSocial ? 'Update' : 'View'}</Link>
                        </Button>
                        {canWriteSocial && <ConfirmButton onConfirm={() => onDelete(r)} ariaLabel={`Delete ${r.title}`} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableBox>
      )}

      <p className="text-xs text-on-surface-variant">
        Tick "Compare" on two to four posts, then open the Compare tab. "{canWriteSocial ? 'Update' : 'View'}" opens the post's monthly history.
      </p>
    </SocialLayout>
  );
}
