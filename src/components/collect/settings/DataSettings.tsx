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

/** الإعدادات › البيانات — admin only. */
export function DataSettings() {
  const dispatch = useAppDispatch();
  const canAdmin = useAppSelector((s) => !!s.collect.meta?.canAdmin);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | 'export' | 'import' | 'demo'>(null);
  const [result, setResult] = useState<string | null>(null);

  if (!canAdmin) {
    return (
      <Panel title="البيانات">
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
      toast.error(apiError(e, 'تعذر تصدير البيانات'));
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
        throw new Error('الملف ليس JSON صالحًا');
      }
      const r = (await importCollect(payload)) as { message?: string };
      done(r.message ?? 'تم الاستيراد');
    } catch (err) {
      toast.error(err instanceof Error && !('response' in err) ? err.message : apiError(err, 'تعذر استيراد الملف'));
    } finally {
      setBusy(null);
    }
  };

  const doDemo = async () => {
    setBusy('demo');
    try {
      const r = (await seedCollectDemo()) as { message?: string };
      done(r.message ?? 'تمت إضافة البيانات التجريبية');
    } catch (e) {
      toast.error(apiError(e, 'تعذر إضافة البيانات التجريبية'));
    } finally {
      setBusy(null);
    }
  };

  const doWipe = async () => {
    try {
      const r = (await wipeCollect()) as { message?: string };
      done(r.message ?? 'تم مسح البيانات');
    } catch (e) {
      toast.error(apiError(e, 'تعذر مسح البيانات'));
    }
  };

  return (
    <Panel title="البيانات" hint="تصدير واستيراد كل بيانات التحصيل كملف JSON، والبيانات التجريبية، والمسح.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
          <p className="font-semibold text-on-surface">تصدير</p>
          <p className="text-xs text-on-surface-variant">الإعدادات والأنواع والقوالب والقواعد والعملاء والعقود والشيكات.</p>
          <Button variant="outline" onClick={() => void doExport()} disabled={!!busy}>
            {busy === 'export' ? <Loader2 className="animate-spin" /> : <Download />} تصدير JSON
          </Button>
        </div>
        <div className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
          <p className="font-semibold text-on-surface">استيراد</p>
          <p className="text-xs text-on-surface-variant">ملف تصدير من Grow Path Collect. يستبدل العقود والشيكات وسجل التذكيرات الحالية.</p>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            {busy === 'import' ? <Loader2 className="animate-spin" /> : <Upload />} استيراد JSON
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void doImport(e)} aria-label="ملف الاستيراد" />
        </div>
        <div className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
          <p className="font-semibold text-on-surface">البيانات التجريبية</p>
          <p className="text-xs text-on-surface-variant">عملاء وعقود تجريبية حول تاريخ اليوم (غير متاحة على النظام الفعلي).</p>
          <Button variant="outline" onClick={() => void doDemo()} disabled={!!busy}>
            {busy === 'demo' ? <Loader2 className="animate-spin" /> : <Database />} استعادة البيانات التجريبية
          </Button>
        </div>
        <div className="space-y-2 rounded-[0.75rem] bg-error/5 p-3">
          <p className="font-semibold text-error">مسح البيانات</p>
          <p className="text-xs text-on-surface-variant">يحذف كل العقود والشيكات وسجل التذكيرات ويزيل العملاء من قائمة التحصيل (الشركات نفسها تبقى).</p>
          <ConfirmButton onConfirm={doWipe} label="مسح العقود والعملاء والشيكات" variant="outline" size="default" />
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
