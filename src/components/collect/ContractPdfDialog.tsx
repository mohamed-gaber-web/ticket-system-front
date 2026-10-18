import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCollectSettings, getContract } from '@/api/collectApi';
import { buildContractHtml, contractPdfFileName } from '@/lib/collectDocument';
import { apiError } from '@/lib/collect';
import { ErrorState, Loading, Modal } from '@/components/collect/CollectUi';

/**
 * Contract PDF (§7): a preview of the printable contract in an iframe, and
 * "تنزيل PDF", which prints that iframe — the user picks "Save as PDF" in
 * Chrome's print dialog (no server-side PDF; Chrome does the page breaks).
 */
export function ContractPdfDialog({ contractId, open, onClose }: { contractId: string | null; open: boolean; onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!open || !contractId) return;
    let alive = true;
    setHtml(null);
    setError(null);
    Promise.all([getContract(contractId), getCollectSettings()])
      .then(([c, s]) => {
        if (!alive) return;
        setFileName(contractPdfFileName(c));
        setHtml(buildContractHtml(c, s, c.today, window.location.origin));
      })
      .catch((e) => alive && setError(apiError(e, 'تعذر تجهيز العقد للطباعة')));
    return () => {
      alive = false;
    };
  }, [open, contractId, reload]);

  const print = async () => {
    const w = frame.current?.contentWindow;
    const d = frame.current?.contentDocument;
    if (!w || !d) return;
    setPrinting(true);
    const prevTitle = document.title;
    try {
      d.title = fileName;
      // The print dialog's default file name comes from the document title.
      document.title = fileName;
      await d.fonts?.ready;
      await Promise.all(
        Array.from(d.images).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.addEventListener('load', () => res(), { once: true });
                img.addEventListener('error', () => res(), { once: true });
              }),
        ),
      );
      w.focus();
      w.print();
    } catch {
      toast.error('تعذر فتح نافذة الطباعة');
    } finally {
      document.title = prevTitle;
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      xwide
      title="PDF العقد للطباعة"
      description={fileName || undefined}
      footer={
        <>
          <Button type="button" onClick={() => void print()} disabled={!html || printing}>
            {printing ? <Loader2 className="animate-spin" /> : <FileDown />} تنزيل PDF
          </Button>
          <span className="text-xs text-on-surface-variant">اختر «حفظ بتنسيق PDF» في نافذة الطباعة</span>
        </>
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={() => setReload((r) => r + 1)} />
      ) : !html ? (
        <Loading rows={6} />
      ) : (
        <iframe
          ref={frame}
          title="معاينة العقد"
          srcDoc={html}
          className="h-[70vh] w-full rounded-[0.75rem] border border-outline-variant/40 bg-[#E6E9EE]"
        />
      )}
    </Modal>
  );
}
