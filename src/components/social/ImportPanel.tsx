import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ChevronDown, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAppSelector } from '@/redux/hooks/hooks';
import { commitSocialImport, getSocialMapping, previewSocialImport, putSocialMapping } from '@/api/socialApi';
import { Field, NativeSelect, Pill, PlatformPill, TableBox, TD, TD_NUM, TH } from '@/components/social/SocialUi';
import { Panel } from '@/components/vault/VaultUi';
import {
  HEADER_NOT_FOUND,
  IMPORT_FIELDS,
  IMPORT_FIELD_LABELS,
  TEMPLATE_COLUMNS,
  TEMPLATE_EXAMPLE,
  TEMPLATE_FILE_NAME,
  autoMap,
  buildImportRows,
  detectHeaderRow,
  headerSignature,
  mappedCount,
  type ColumnMapping,
} from '@/lib/socialImport';
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
  apiError,
  engagement,
  fmtDay,
  fmtNumber,
  monthLabel,
} from '@/lib/socialPulse';
import type { ImportMode, ImportPreview, ImportRow } from '@/types/social.types';

const MAX_ROWS = 5000;
const PREVIEW_LIMIT = 300;
const CHUNK = 250;

interface Loaded {
  fileName: string;
  workbook: XLSX.WorkBook;
  sheet: string;
  grid: unknown[][];
  headerIndex: number;
  headers: string[];
  signature: string;
}

function downloadImportTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, TEMPLATE_EXAMPLE]);
  ws['!cols'] = TEMPLATE_COLUMNS.map((c, i) => ({ wch: i === 0 ? 48 : i === 1 ? 40 : Math.max(10, c.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Posts');
  XLSX.writeFile(wb, TEMPLATE_FILE_NAME);
}

const modeText = (m: ImportMode) => (m === 'month' ? 'numbers for this month only' : 'lifetime totals');

/** Panel A of Monthly pull (§7.5): import a platform export or the template into the pull month. */
export function ImportPanel({ month, onImported }: { month: string; onImported: () => void }) {
  const categories = useAppSelector((s) => s.social.meta?.categories ?? []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [mode, setMode] = useState<ImportMode>('cumulative');
  const [defPlatform, setDefPlatform] = useState('');
  const [defType, setDefType] = useState('');
  const [defCategory, setDefCategory] = useState('');
  const [mappingOpen, setMappingOpen] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const reset = () => {
    setLoaded(null);
    setMapping(null);
    setPreview(null);
    setExcluded(new Set());
    setReadError(null);
    setPreviewError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const openSheet = async (workbook: XLSX.WorkBook, sheet: string, fileName: string) => {
    setPreview(null);
    setExcluded(new Set());
    const ws = workbook.Sheets[sheet];
    const grid = ws ? XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' }) : [];
    const { index, score } = detectHeaderRow(grid);
    if (score < 2) {
      setLoaded({ fileName, workbook, sheet, grid: [], headerIndex: -1, headers: [], signature: '' });
      setMapping(null);
      setReadError(HEADER_NOT_FOUND);
      return;
    }
    setReadError(null);
    const headers = (grid[index] ?? []).map((h) => String(h ?? '').trim());
    const signature = await headerSignature(headers);
    let next = autoMap(headers);
    try {
      const saved = (await getSocialMapping(signature)).mapping;
      const merged = { ...next };
      for (const f of IMPORT_FIELDS) {
        const v = Number(saved?.[f]);
        if (Number.isInteger(v) && v >= -1 && v < headers.length) merged[f] = v;
      }
      next = merged;
    } catch {
      /* no saved mapping for these headers — keep the automatic one */
    }
    setLoaded({ fileName, workbook, sheet, grid, headerIndex: index, headers, signature });
    setMapping(next);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setLastMessage(null);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      if (workbook.SheetNames.length === 0) throw new Error('empty');
      await openSheet(workbook, workbook.SheetNames[0], file.name);
    } catch {
      reset();
      setReadError("Couldn't read this file. Use an .xlsx, .xls or .csv export, or the template.");
    }
  };

  const rows: ImportRow[] = useMemo(
    () => (loaded && mapping && loaded.headerIndex >= 0 ? buildImportRows(loaded.grid, loaded.headerIndex, mapping) : []),
    [loaded, mapping],
  );

  const options = useMemo(
    () => ({ month, mode, defaults: { platform: defPlatform, type: defType, category: defCategory.trim() } }),
    [month, mode, defPlatform, defType, defCategory],
  );

  // Any change to the rows, mode, defaults or month re-runs the server preview.
  useEffect(() => {
    if (rows.length === 0 || !month) {
      setPreview(null);
      return;
    }
    if (rows.length > MAX_ROWS) {
      setPreview(null);
      setPreviewError(`This sheet has ${rows.length} rows. Import at most ${MAX_ROWS} at a time — split the file.`);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setPreviewing(true);
      setPreviewError(null);
      try {
        const p = await previewSocialImport({ ...options, rows });
        if (!cancelled) setPreview(p);
      } catch (e) {
        if (!cancelled) setPreviewError(apiError(e, 'Could not preview the import'));
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [rows, options, month]);

  const changeMapping = (field: (typeof IMPORT_FIELDS)[number], col: number) => {
    if (!mapping || !loaded) return;
    const next = { ...mapping };
    // A column serves one field: take it away from whichever field had it.
    if (col >= 0) for (const f of IMPORT_FIELDS) if (next[f] === col) next[f] = -1;
    next[field] = col;
    setMapping(next);
    void putSocialMapping(loaded.signature, next).catch(() => {
      /* remembering the mapping is a convenience; the import works without it */
    });
  };

  const included = useMemo(
    () => (preview?.items ?? []).filter((it) => it.status !== 'skip' && !excluded.has(it.rowIndex)),
    [preview, excluded],
  );

  const commit = async () => {
    if (!loaded || included.length === 0) return;
    const indexes = included.map((it) => it.rowIndex);
    const total = indexes.length;
    const sum = { updated: 0, created: 0, failed: 0 };
    setProgress({ done: 0, total });
    try {
      for (let i = 0; i < indexes.length; i += CHUNK) {
        const part = indexes.slice(i, i + CHUNK);
        try {
          const r = await commitSocialImport({
            ...options,
            rows,
            excludedRowIndexes: [...excluded],
            commitRowIndexes: part,
            fileName: loaded.fileName,
          });
          sum.updated += r.updated;
          sum.created += r.created;
          sum.failed += r.failed.length;
        } catch {
          sum.failed += part.length;
        }
        setProgress({ done: Math.min(total, i + part.length), total });
      }
    } finally {
      setProgress(null);
    }
    const ok = sum.updated + sum.created;
    if (sum.failed === 0) toast.success(`Imported ${ok} posts into ${monthLabel(month)}`);
    else toast.error(`Imported ${ok}, ${sum.failed} failed. Try again for the rest`);
    setLastMessage(`Last import: ${ok} posts into ${monthLabel(month)}.`);
    reset();
    onImported();
  };

  const counts = preview?.counts;
  const recognised = mapping ? mappedCount(mapping) : 0;

  return (
    <Panel
      title="Import from Excel or CSV"
      action={
        <Button type="button" size="sm" variant="outline" onClick={downloadImportTemplate}>
          <FileSpreadsheet /> Download Excel template
        </Button>
      }
    >
      <p className="-mt-1 text-sm text-on-surface-variant">
        Upload an export from Meta Business Suite, LinkedIn, YouTube Studio or TikTok, or the template. The numbers are recorded against the pull
        month above.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="File" htmlFor="sp-imp-file">
          <Input
            id="sp-imp-file"
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => void onFile(e.target.files?.[0])}
            className="cursor-pointer"
          />
        </Field>
        <Field label="Sheet" htmlFor="sp-imp-sheet">
          <NativeSelect
            id="sp-imp-sheet"
            value={loaded?.sheet ?? ''}
            disabled={!loaded || loaded.workbook.SheetNames.length < 2}
            onChange={(e) => loaded && void openSheet(loaded.workbook, e.target.value, loaded.fileName)}
          >
            {!loaded && <option value="">—</option>}
            {loaded?.workbook.SheetNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="File numbers are" htmlFor="sp-imp-mode">
          <NativeSelect id="sp-imp-mode" value={mode} onChange={(e) => setMode(e.target.value as ImportMode)}>
            <option value="cumulative">Lifetime totals since publishing</option>
            <option value="month">For this month only</option>
          </NativeSelect>
        </Field>
        <Field label="Platform if not in file" htmlFor="sp-imp-platform">
          <NativeSelect id="sp-imp-platform" value={defPlatform} onChange={(e) => setDefPlatform(e.target.value)}>
            <option value="">Detect from link</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Type if not in file" htmlFor="sp-imp-type">
          <NativeSelect id="sp-imp-type" value={defType} onChange={(e) => setDefType(e.target.value)}>
            <option value="">From file, else "Image"</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTENT_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Category for new posts" htmlFor="sp-imp-category">
          <Input id="sp-imp-category" dir="auto" list="sp-imp-categories" value={defCategory} maxLength={100} onChange={(e) => setDefCategory(e.target.value)} />
          <datalist id="sp-imp-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>

      {readError && (
        <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {readError}
        </p>
      )}
      {lastMessage && !loaded && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{lastMessage}</p>}

      {loaded && mapping && (
        <div className="rounded-[0.75rem] bg-surface-container-low">
          <button
            type="button"
            aria-expanded={mappingOpen}
            onClick={() => setMappingOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 rounded-[0.75rem] px-3 py-2.5 text-left text-sm font-semibold text-on-surface outline-none focus-visible:ring-[2px] focus-visible:ring-primary/40"
          >
            <span>
              Column mapping: {recognised} of {IMPORT_FIELDS.length} fields recognised <span className="font-normal text-on-surface-variant">(click to review)</span>
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', mappingOpen && 'rotate-180')} aria-hidden="true" />
          </button>
          {mappingOpen && (
            <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {IMPORT_FIELDS.map((f) => (
                <Field key={f} label={IMPORT_FIELD_LABELS[f]} htmlFor={`sp-map-${f}`}>
                  <div className={cn('rounded-[0.5rem]', mapping[f] >= 0 && 'ring-2 ring-emerald-500/60')}>
                    <NativeSelect id={`sp-map-${f}`} value={String(mapping[f])} onChange={(e) => changeMapping(f, Number(e.target.value))}>
                      <option value="-1">— Not in file —</option>
                      {loaded.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </Field>
              ))}
            </div>
          )}
        </div>
      )}

      {previewError && (
        <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {previewError}
        </p>
      )}

      {loaded && rows.length > 0 && (previewing || preview) && (
        <div className={cn('space-y-3', previewing && 'opacity-60')} aria-busy={previewing}>
          <div className="flex flex-wrap items-center gap-2">
            {counts && (
              <>
                <Pill tone="ok">{counts.update} existing posts to update</Pill>
                <Pill tone="accent">{counts.new} new posts</Pill>
                {counts.skipped > 0 && <Pill tone="warn">{counts.skipped} skipped</Pill>}
              </>
            )}
            <span className="text-xs text-on-surface-variant">
              {monthLabel(month)} · {modeText(mode)}
            </span>
            <span className="flex-1" />
            <Button type="button" onClick={() => void commit()} disabled={!!progress || previewing || included.length === 0}>
              {progress ? (
                <>
                  <Loader2 className="animate-spin" /> Importing {progress.done}/{progress.total}
                </>
              ) : (
                <>
                  <Upload /> Import {included.length} posts
                </>
              )}
            </Button>
          </div>

          {preview && (
            <TableBox className="max-h-[32rem] overflow-y-auto bg-surface-container-low">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="sticky top-0 z-[1] bg-surface-container-low">
                  <tr className="border-b border-outline-variant/40">
                    <th className={TH}>Include</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Post</th>
                    <th className={TH}>Platform</th>
                    <th className={TH}>Published</th>
                    <th className={`${TH} text-right`}>Reach</th>
                    <th className={`${TH} text-right`}>Engagement</th>
                    <th className={`${TH} text-right`}>Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {preview.items.slice(0, PREVIEW_LIMIT).map((it) => {
                    const skip = it.status === 'skip';
                    const differs = it.status === 'update' && it.fileTitle && it.fileTitle !== it.title;
                    return (
                      <tr key={it.rowIndex} className={cn(skip && 'opacity-70')}>
                        <td className={TD}>
                          <Checkbox
                            checked={!skip && !excluded.has(it.rowIndex)}
                            disabled={skip}
                            aria-label={`Include row ${it.rowIndex + 1}`}
                            onCheckedChange={(v) =>
                              setExcluded((prev) => {
                                const next = new Set(prev);
                                if (v) next.delete(it.rowIndex);
                                else next.add(it.rowIndex);
                                return next;
                              })
                            }
                          />
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap')}>
                          {it.status === 'update' ? (
                            <span className="inline-flex flex-wrap items-center gap-1">
                              <Pill tone="ok">Update</Pill>
                              {it.engagementGain != null && (
                                <span className="text-[11px] tabular-nums text-on-surface-variant">+{fmtNumber(Math.max(0, it.engagementGain))} eng.</span>
                              )}
                            </span>
                          ) : it.status === 'new' ? (
                            <Pill tone="accent">New</Pill>
                          ) : (
                            <Pill tone="warn">{it.issue}</Pill>
                          )}
                        </td>
                        <td className={cn(TD, 'min-w-[14rem] max-w-[22rem]')}>
                          <p dir="auto" className="line-clamp-2 font-semibold text-on-surface">
                            {it.title || it.fileTitle || '—'}
                          </p>
                          {differs && (
                            <p dir="auto" className="line-clamp-1 text-[11px] text-on-surface-variant">
                              In file: {it.fileTitle}
                            </p>
                          )}
                        </td>
                        <td className={TD}>{it.platform ? <PlatformPill platform={it.platform} /> : '—'}</td>
                        <td className={cn(TD, 'whitespace-nowrap tabular-nums')}>{fmtDay(it.publishDate)}</td>
                        <td className={TD_NUM}>{fmtNumber(it.values?.reach)}</td>
                        <td className={TD_NUM}>{it.values ? fmtNumber(engagement(it.values)) : '—'}</td>
                        <td className={TD_NUM}>{fmtNumber(it.values?.clicks)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableBox>
          )}
          {preview && preview.items.length > PREVIEW_LIMIT && (
            <p className="text-xs text-on-surface-variant">
              Showing the first {PREVIEW_LIMIT} of {preview.items.length} rows. The import includes all of them.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
