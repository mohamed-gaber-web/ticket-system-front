import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Database, Download, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged } from '@/redux/slices/collectSlice';
import { exportCollect, importCollect, seedCollectDemo, wipeCollect } from '@/api/collectApi';
import { apiError } from '@/lib/collect';
import { ConfirmButton, Panel } from '@/components/collect/CollectUi';
import { ReadOnlyNote } from './ReadOnlyNote';

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Settings › Data — admin only. */
export function DataSettings() {
  const dispatch = useAppDispatch();
  const canAdmin = useAppSelector((s) => !!s.collect.meta?.canAdmin);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | 'export' | 'import' | 'demo'>(null);
  const [result, setResult] = useState<string | null>(null);

  if (!canAdmin) {
    return (
      <Panel title="Data">
        <ReadOnlyNote />
      </Panel>
    );
  }

  const done = (message: string) => {
    setResult(message);
    toast.success(message);
    void dispatch(collectChanged());
  };

  const doExport = async () => {
    setBusy('export');
    try {
      saveBlob(await exportCollect(), `grow-path-collect-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (e) {
      toast.error(apiError(e, 'Could not export the data'));
    } finally {
      setBusy(null);
    }
  };

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('import');
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(await file.text());
      } catch {
        throw new Error('The file is not valid JSON');
      }
      const r = (await importCollect(payload)) as { message?: string };
      done(r.message ?? 'Import complete');
    } catch (err) {
      toast.error(err instanceof Error && !('response' in err) ? err.message : apiError(err, 'Could not import the file'));
    } finally {
      setBusy(null);
    }
  };

  const doDemo = async () => {
    setBusy('demo');
    try {
      const r = (await seedCollectDemo()) as { message?: string };
      done(r.message ?? 'Demo data added');
    } catch (e) {
      toast.error(apiError(e, 'Could not add the demo data'));
    } finally {
      setBusy(null);
    }
  };

  const doWipe = async () => {
    try {
      const r = (await wipeCollect()) as { message?: string };
      done(r.message ?? 'Data wiped');
    } catch (e) {
      toast.error(apiError(e, 'Could not wipe the data'));
    }
  };

  return (
    <Panel title="Data" hint="Export and import all Collect data as a JSON file, demo data, and wipe.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
          <p className="font-semibold text-on-surface">Export</p>
          <p className="text-xs text-on-surface-variant">Settings, types, templates, rules, customers, contracts and cheques.</p>
          <Button variant="outline" onClick={() => void doExport()} disabled={!!busy}>
            {busy === 'export' ? <Loader2 className="animate-spin" /> : <Download />} Export JSON
          </Button>
        </div>
        <div className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
          <p className="font-semibold text-on-surface">Import</p>
          <p className="text-xs text-on-surface-variant">A Grow Path Collect export file. Replaces the current contracts, cheques and reminder log.</p>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy === 'import' ? <Loader2 className="animate-spin" /> : <Upload />} Import JSON
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void doImport(e)} aria-label="Import file" />
        </div>
        <div className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
          <p className="font-semibold text-on-surface">Demo data</p>
          <p className="text-xs text-on-surface-variant">Demo customers and contracts around today’s date (not available in production).</p>
          <Button variant="outline" onClick={() => void doDemo()} disabled={!!busy}>
            {busy === 'demo' ? <Loader2 className="animate-spin" /> : <Database />} Restore demo data
          </Button>
        </div>
        <div className="space-y-2 rounded-[0.75rem] bg-error/5 p-3">
          <p className="font-semibold text-error">Wipe data</p>
          <p className="text-xs text-on-surface-variant">Deletes all contracts, cheques and the reminder log and removes customers from the Collect list (the companies themselves stay).</p>
          <ConfirmButton onConfirm={doWipe} label="Wipe contracts, customers and cheques" variant="outline" size="default" />
        </div>
      </div>
      {result && (
        <p role="status" className="rounded-[0.75rem] bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          {result}
        </p>
      )}
    </Panel>
  );
}
