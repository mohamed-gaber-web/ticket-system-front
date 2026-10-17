import { useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Download, FileText, Image as ImageIcon, Loader2, Paperclip, RefreshCw, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/hr';
import { downloadVaultAttachment, uploadVaultAttachment } from '@/api/vaultApi';
import {
  ATTACHMENTS_HELP,
  ATTACHMENT_MAX_FILES,
  apiError,
  attachmentProblem,
  blobApiError,
  fmtDateTime,
  isUploading,
  saveBlob,
  type AttachmentDraft,
} from '@/lib/vault';
import type { VaultAttachment } from '@/types/vault.types';
import { Chip } from './VaultUi';

// Files kept with a vault account (RDP/VPN configs, certificates, screenshots).
// The editor uploads each file the moment it is picked (POST /vault/attachments)
// and the entry save sends `attachments: [{ fileId }]`. Downloads are an authed
// blob fetch, never a plain link — the server decrypts and logs every one.

function FileIcon({ type }: { type?: string }) {
  const Icon = type?.startsWith('image/') ? ImageIcon : FileText;
  return <Icon className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden="true" />;
}

// ── Form section ────────────────────────────────────────────────────────────

let draftSeq = 0;

interface EditorProps {
  items: AttachmentDraft[];
  setItems: Dispatch<SetStateAction<AttachmentDraft[]>>;
  /** Editing an account whose stored files are still loading / failed to load. */
  loadState: 'ready' | 'loading' | 'failed';
  onRetryLoad?: () => void;
  disabled?: boolean;
}

export function VaultAttachmentsEditor({ items, setItems, loadState, onRetryLoad, disabled }: EditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const kept = items.filter((d) => !d.error).length;
  const canAdd = !disabled && loadState === 'ready' && kept < ATTACHMENT_MAX_FILES;

  const patch = (key: string, change: Partial<AttachmentDraft>) =>
    setItems((prev) => prev.map((d) => (d.key === key ? { ...d, ...change } : d)));

  const upload = async (draft: AttachmentDraft, file: File) => {
    try {
      const res = await uploadVaultAttachment(file, (progress) => patch(draft.key, { progress }));
      patch(draft.key, { ...res.data, progress: undefined, error: undefined });
    } catch (e) {
      patch(draft.key, { progress: undefined, error: apiError(e, 'Upload failed') });
    }
  };

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list);
    const issues: string[] = [];
    const accepted: File[] = [];
    let room = ATTACHMENT_MAX_FILES - kept;
    for (const f of files) {
      const problem = attachmentProblem(f);
      if (problem) issues.push(problem);
      else if (room <= 0) issues.push(`${f.name}: an account can hold at most ${ATTACHMENT_MAX_FILES} files.`);
      else {
        accepted.push(f);
        room -= 1;
      }
    }
    setProblems(issues);
    const drafts = accepted.map<[AttachmentDraft, File]>((f) => [
      { key: `new-${++draftSeq}`, fileName: f.name, fileType: f.type, fileSize: f.size, progress: 0 },
      f,
    ]);
    if (!drafts.length) return;
    setItems((prev) => [...prev, ...drafts.map(([d]) => d)]);
    drafts.forEach(([d, f]) => void upload(d, f));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (canAdd && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <fieldset
      className={cn(
        'space-y-3 rounded-xl border p-3 transition-colors sm:p-4',
        dragging ? 'border-primary bg-primary/5' : 'border-outline-variant/30',
      )}
      aria-describedby="vault-attachments-help"
      onDragOver={(e) => {
        if (!canAdd) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <legend className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
        Attachments <span className="font-semibold text-on-surface-variant">({kept}/{ATTACHMENT_MAX_FILES})</span>
      </legend>
      <p id="vault-attachments-help" className="text-[11px] leading-snug text-on-surface-variant">
        {ATTACHMENTS_HELP}
      </p>

      {loadState === 'loading' ? (
        <p className="flex items-center gap-2 text-sm text-on-surface-variant" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading the attached files…
        </p>
      ) : loadState === 'failed' ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">Couldn&apos;t load the attached files. Saving now leaves them unchanged.</span>
          {onRetryLoad && (
            <Button type="button" size="sm" variant="outline" onClick={onRetryLoad}>
              <RefreshCw /> Try again
            </Button>
          )}
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <ul className="space-y-1.5" aria-label="Attached files">
              {items.map((d) => (
                <li key={d.key} className="rounded-lg bg-surface-container-low px-2.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <FileIcon type={d.fileType} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-on-surface" title={d.fileName}>
                        {d.fileName}
                      </p>
                      <p className={cn('truncate text-[11px]', d.error ? 'font-semibold text-error' : 'text-on-surface-variant')}>
                        {d.error
                          ? d.error
                          : isUploading(d)
                            ? `Uploading… ${d.progress ?? 0}%`
                            : [formatBytes(d.fileSize), d.uploadedAt ? fmtDateTime(d.uploadedAt) : 'Uploaded — attached on save'].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-on-surface-variant hover:text-error"
                      onClick={() => setItems((prev) => prev.filter((x) => x.key !== d.key))}
                      disabled={disabled}
                      aria-label={isUploading(d) ? `Cancel ${d.fileName}` : `Remove ${d.fileName}`}
                    >
                      <X />
                    </Button>
                  </div>
                  {isUploading(d) && (
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-high"
                      role="progressbar"
                      aria-label={`Uploading ${d.fileName}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={d.progress ?? 0}
                    >
                      <div className="h-full bg-primary transition-all" style={{ width: `${d.progress ?? 0}%` }} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {problems.length > 0 && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <ul className="min-w-0 space-y-0.5">
                {problems.map((p) => (
                  <li key={p} className="break-words">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {kept < ATTACHMENT_MAX_FILES ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={!canAdd}
              aria-describedby="vault-attachments-help"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant/60 px-3 py-3 text-sm text-on-surface-variant outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-[2px] focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Choose files or drop them here
            </button>
          ) : (
            <p className="text-xs text-on-surface-variant">This account holds the maximum of {ATTACHMENT_MAX_FILES} files. Remove one to add another.</p>
          )}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </fieldset>
  );
}

// ── Details modal list ──────────────────────────────────────────────────────

export function VaultAttachmentList({ entryId, attachments }: { entryId: string; attachments: VaultAttachment[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const download = async (a: VaultAttachment) => {
    setBusyId(a.fileId);
    try {
      saveBlob(await downloadVaultAttachment(entryId, a.fileId), a.fileName);
    } catch (e) {
      toast.error(await blobApiError(e, `Could not download ${a.fileName}`));
    } finally {
      setBusyId(null);
    }
  };

  if (!attachments.length) return <p className="text-sm text-on-surface-variant">No files attached.</p>;

  return (
    <ul className="divide-y divide-outline-variant/20 rounded-xl bg-surface-container-low px-3">
      {attachments.map((a) => (
        <li key={a.fileId} className="flex items-center gap-2 py-2">
          <FileIcon type={a.fileType} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-on-surface" title={a.fileName}>
              {a.fileName}
            </p>
            <p className="truncate text-[11px] text-on-surface-variant">
              {[formatBytes(a.fileSize), a.uploadedBy?.name, fmtDateTime(a.uploadedAt)].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => download(a)}
            disabled={busyId !== null}
            aria-label={`Download ${a.fileName}`}
          >
            {busyId === a.fileId ? <Loader2 className="animate-spin" /> : <Download />} Download
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** Paperclip + count chip for an account card. */
export function AttachmentCountChip({ count }: { count: number }) {
  const label = `${count} attached file${count === 1 ? '' : 's'}`;
  return (
    <Chip title={label}>
      <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{label}</span>
    </Chip>
  );
}
