import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_FILES,
  DOCUMENT_TYPES,
  documentFileProblem,
  formatBytes,
  formatDate,
  type DocumentTypeDef,
  type EmployeeDocumentType,
} from '@/lib/hr';
import {
  deleteEmployeeDocument,
  getEmployeeDocumentFile,
  getEmployeeDocuments,
  uploadEmployeeDocuments,
} from '@/api/consultantApi';
import type { EmployeeDocument } from '@/types/consultant.types';

/** Files chosen on the create form, uploaded once the employee exists. */
export interface StagedDocumentUpload {
  key: string;
  type: EmployeeDocumentType;
  files: File[];
  expiryDate?: string;
  notes?: string;
}

interface Props {
  /** Live mode: the saved employee. Omit to stage uploads (create form). */
  employeeId?: string;
  /** May add and remove documents (the API re-checks). */
  canEdit: boolean;
  staged?: StagedDocumentUpload[];
  onStagedChange?: (next: StagedDocumentUpload[]) => void;
}

const DAY = 24 * 60 * 60 * 1000;

const expiryState = (date?: string | null): 'expired' | 'soon' | null => {
  if (!date) return null;
  const left = new Date(date).getTime() - Date.now();
  if (left < 0) return 'expired';
  if (left < 30 * DAY) return 'soon';
  return null;
};

const FileIcon = ({ type }: { type?: string }) =>
  type?.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-primary shrink-0" /> : <FileText className="w-4 h-4 text-primary shrink-0" />;

/**
 * The employee's scanned documents, one card per document type (national ID,
 * birth certificate, graduation certificate, criminal record certificate…),
 * each holding any number of files. Required documents that are still missing
 * are flagged, and documents with an expiry date warn before they lapse.
 */
export function EmployeeDocuments({ employeeId, canEdit, staged = [], onStagedChange }: Props) {
  const live = Boolean(employeeId);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(live);

  const load = useCallback(() => {
    if (!employeeId) return;
    setLoading(true);
    getEmployeeDocuments(employeeId)
      .then((res) => setDocuments(res.data))
      .catch(() => toast.error('Could not load documents'))
      .finally(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => load(), [load]);

  const byType = useMemo(() => {
    const map = new Map<EmployeeDocumentType, EmployeeDocument[]>();
    for (const d of documents) map.set(d.type, [...(map.get(d.type) ?? []), d]);
    return map;
  }, [documents]);

  const stagedByType = useMemo(() => {
    const map = new Map<EmployeeDocumentType, StagedDocumentUpload[]>();
    for (const s of staged) map.set(s.type, [...(map.get(s.type) ?? []), s]);
    return map;
  }, [staged]);

  const required = DOCUMENT_TYPES.filter((t) => t.required);
  const has = (t: EmployeeDocumentType) => (byType.get(t)?.length ?? 0) + (stagedByType.get(t)?.length ?? 0) > 0;
  const completed = required.filter((t) => has(t.value)).length;

  return (
    <div className="space-y-4">
      {/* Required-documents checklist */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'text-xs font-semibold rounded-full px-2.5 py-1',
            completed === required.length ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800',
          )}
        >
          {completed} of {required.length} required documents
        </span>
        {required.map((t) => (
          <span
            key={t.value}
            className={cn(
              'inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border',
              has(t.value) ? 'border-green-200 text-green-700' : 'border-outline-variant/40 text-on-surface-variant',
            )}
          >
            {has(t.value) ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            {t.label}
          </span>
        ))}
      </div>

      {!live && (
        <p className="text-xs text-on-surface-variant">
          Files you add here are uploaded as soon as the employee is created.
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {DOCUMENT_TYPES.map((def) => (
            <DocumentCard
              key={def.value}
              def={def}
              employeeId={employeeId}
              canEdit={canEdit}
              documents={byType.get(def.value) ?? []}
              staged={stagedByType.get(def.value) ?? []}
              onUploaded={(docs) => setDocuments((prev) => [...docs, ...prev])}
              onDeleted={(id) => setDocuments((prev) => prev.filter((d) => d._id !== id))}
              onStage={(s) => onStagedChange?.([...staged, s])}
              onUnstage={(key) => onStagedChange?.(staged.filter((s) => s.key !== key))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  def: DocumentTypeDef;
  employeeId?: string;
  canEdit: boolean;
  documents: EmployeeDocument[];
  staged: StagedDocumentUpload[];
  onUploaded: (docs: EmployeeDocument[]) => void;
  onDeleted: (id: string) => void;
  onStage: (s: StagedDocumentUpload) => void;
  onUnstage: (key: string) => void;
}

function DocumentCard({ def, employeeId, canEdit, documents, staged, onUploaded, onDeleted, onStage, onUnstage }: CardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File[]>([]);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const missing = def.required && documents.length === 0 && staged.length === 0;

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list);
    const problems = files.map(documentFileProblem).filter((p): p is string => p !== null);
    problems.forEach((p) => toast.error(p));
    const good = files.filter((f) => !documentFileProblem(f));
    setPending((prev) => {
      const next = [...prev, ...good];
      if (next.length > DOCUMENT_MAX_FILES) toast.error(`Upload at most ${DOCUMENT_MAX_FILES} files at a time`);
      return next.slice(0, DOCUMENT_MAX_FILES);
    });
  };

  const reset = () => {
    setPending([]);
    setExpiryDate('');
    setNotes('');
    setProgress(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const submit = async () => {
    if (!pending.length) return;
    if (!employeeId) {
      onStage({ key: `${def.value}-${Date.now()}`, type: def.value, files: pending, expiryDate: expiryDate || undefined, notes: notes || undefined });
      reset();
      return;
    }
    setProgress(0);
    try {
      const res = await uploadEmployeeDocuments(
        employeeId,
        { type: def.value, files: pending, expiryDate: expiryDate || undefined, notes: notes || undefined },
        setProgress,
      );
      onUploaded(res.data);
      toast.success(res.message);
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed');
      setProgress(null);
    }
  };

  const open = async (doc: EmployeeDocument, download = false) => {
    if (!employeeId) return;
    // Open the tab synchronously so the popup blocker allows it
    const tab = download ? null : window.open('', '_blank');
    setBusyId(doc._id);
    try {
      const blob = await getEmployeeDocumentFile(employeeId, doc._id);
      const url = URL.createObjectURL(blob);
      if (tab) {
        tab.location.href = url;
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      tab?.close();
      toast.error('Could not open the file');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (doc: EmployeeDocument) => {
    if (!employeeId) return;
    const confirm = await Swal.fire({
      title: 'Delete document?',
      text: doc.fileName,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete',
    });
    if (!confirm.isConfirmed) return;
    setBusyId(doc._id);
    try {
      await deleteEmployeeDocument(employeeId, doc._id);
      onDeleted(doc._id);
      toast.success('Document deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (canEdit && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'rounded-xl border bg-surface-container-lowest p-4 flex flex-col gap-3 transition-colors',
        dragging ? 'border-primary bg-primary/5' : missing ? 'border-amber-300/70' : 'border-outline-variant/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
            {def.label}
            {def.required && <span className="text-error">*</span>}
          </p>
          <p className="text-xs text-on-surface-variant">
            <span dir="rtl" lang="ar">{def.labelAr}</span>
          </p>
        </div>
        {missing ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 shrink-0">Missing</span>
        ) : documents.length + staged.length > 0 ? (
          <span className="text-[10px] font-semibold rounded-full bg-surface-container-high text-on-surface-variant px-2 py-0.5 shrink-0">
            {documents.length + staged.reduce((n, s) => n + s.files.length, 0)} file(s)
          </span>
        ) : null}
      </div>

      {/* Saved files */}
      {documents.length > 0 && (
        <ul className="space-y-1.5">
          {documents.map((doc) => {
            const exp = expiryState(doc.expiryDate);
            return (
              <li key={doc._id} className="flex items-center gap-2 rounded-lg bg-surface-container-low px-2.5 py-1.5">
                <FileIcon type={doc.fileType} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => open(doc)}
                    className="block text-left text-sm text-on-surface truncate w-full hover:text-primary hover:underline"
                    title={doc.fileName}
                  >
                    {doc.fileName}
                  </button>
                  <p className="text-[11px] text-on-surface-variant truncate">
                    {formatBytes(doc.fileSize)} · {formatDate(doc.createdAt)}
                    {doc.expiryDate && (
                      <span className={cn(exp === 'expired' && 'text-error font-semibold', exp === 'soon' && 'text-amber-700 font-semibold')}>
                        {' '}· {exp === 'expired' ? 'Expired' : 'Expires'} {formatDate(doc.expiryDate)}
                      </span>
                    )}
                    {doc.notes && <span> · {doc.notes}</span>}
                  </p>
                </div>
                {busyId === doc._id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />
                ) : (
                  <div className="flex items-center shrink-0">
                    <button type="button" title="View" onClick={() => open(doc)} className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" title="Download" onClick={() => open(doc, true)} className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <button type="button" title="Delete" onClick={() => remove(doc)} className="p-1 rounded hover:bg-error/10 text-error">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Staged (create form) */}
      {staged.map((s) => (
        <div key={s.key} className="rounded-lg border border-dashed border-primary/40 px-2.5 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-primary">Uploads on save</span>
            <button type="button" title="Remove" onClick={() => onUnstage(s.key)} className="p-0.5 rounded hover:bg-surface-container-high text-on-surface-variant">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {s.files.map((f) => (
            <p key={f.name + f.size} className="text-xs text-on-surface truncate flex items-center gap-1.5">
              <Paperclip className="w-3 h-3 shrink-0" /> {f.name} <span className="text-on-surface-variant">({formatBytes(f.size)})</span>
            </p>
          ))}
          {s.expiryDate && <p className="text-[11px] text-on-surface-variant">Expires {formatDate(s.expiryDate)}</p>}
        </div>
      ))}

      {/* Pending selection */}
      {canEdit && pending.length > 0 && (
        <div className="rounded-lg bg-surface-container-low p-3 space-y-2">
          {pending.map((f, i) => (
            <div key={f.name + i} className="flex items-center gap-2 text-xs">
              <Paperclip className="w-3 h-3 shrink-0 text-on-surface-variant" />
              <span className="truncate flex-1">{f.name}</span>
              <span className="text-on-surface-variant">{formatBytes(f.size)}</span>
              {progress === null && (
                <button type="button" onClick={() => setPending((p) => p.filter((_, j) => j !== i))} className="text-on-surface-variant hover:text-error">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <div className={cn('grid gap-2', def.expires ? 'grid-cols-2' : 'grid-cols-1')}>
            {def.expires && (
              <div>
                <label className="form-label !mb-1">Expiry date</label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-8 text-xs" />
              </div>
            )}
            <div>
              <label className="form-label !mb-1">Note</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" maxLength={500} className="h-8 text-xs" />
            </div>
          </div>
          {progress !== null && (
            <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={reset} disabled={progress !== null}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={submit} disabled={progress !== null}>
              {progress !== null ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
              {employeeId ? `Upload ${pending.length}` : `Add ${pending.length}`}
            </Button>
          </div>
        </div>
      )}

      {canEdit && pending.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant/60 px-3 py-2 text-xs text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Add files or drop them here
        </button>
      )}
      {!canEdit && documents.length === 0 && <p className="text-xs text-on-surface-variant">No files</p>}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={DOCUMENT_ACCEPT}
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />
    </div>
  );
}
