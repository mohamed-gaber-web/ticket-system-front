import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Minus, Maximize2, Minimize2, Paperclip, Trash2, Link2, Bold, Italic,
  Underline, Strikethrough, List, ListOrdered, RemoveFormatting, Type, Send,
  Loader2, FileText, Image as ImageIcon, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import * as teleSalesApi from '@/api/teleSalesApi';
import { cn } from '@/lib/utils';
import type { EmailAttachment, LeadEmail } from '@/types/teleSales.types';

// Mirrors the server-side cap in emailService.js — Microsoft Graph's simple
// sendMail rejects anything much beyond this once base64 inflates it.
const MAX_TOTAL_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WindowState = 'normal' | 'minimized' | 'maximized';

/** A file being attached: uploaded to GridFS first, then referenced by fileId. */
interface PendingAttachment {
  localId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileId?: string;
  uploading: boolean;
  error?: string;
}

export interface GmailComposeProps {
  /** Lead the message is sent from — scopes the API call and the history tab.
   *  Omit for a standalone message composed from the leads toolbar. */
  leadId?: string;
  open: boolean;
  onClose: () => void;
  defaultTo?: string[];
  defaultSubject?: string;
  /** Company / contact name shown in the window header for context. */
  contextLabel?: string;
  /** Address shown in the "From" row. Purely informational. */
  fromLabel?: string;
  onSent?: (email: LeadEmail) => void;
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i]}`;
};

const isValidEmail = (value: string) => EMAIL_PATTERN.test(value);

/** Pull the API's message off an axios error, falling back to a readable default. */
const apiErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Split pasted or typed text on the separators Gmail also accepts. */
const splitAddresses = (value: string) =>
  value
    .split(/[,;\s]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

// ─── Recipient field ──────────────────────────────────────────────────────────

function RecipientField({
  label, values, onChange, autoFocus, trailing,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  autoFocus?: boolean;
  trailing?: React.ReactNode;
}) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const additions = splitAddresses(raw).filter((a) => !values.includes(a));
    if (additions.length) onChange([...values, ...additions]);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',' || e.key === ';') {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
      return;
    }
    // Backspace on an empty box pulls the last chip back for editing.
    if (e.key === 'Backspace' && !draft && values.length) {
      e.preventDefault();
      onChange(values.slice(0, -1));
      setDraft(values[values.length - 1]);
    }
  };

  return (
    <div className="flex items-start gap-2 border-b border-outline-variant/40 px-4 py-2 min-h-[42px]">
      <span className="text-sm text-on-surface-variant pt-1.5 w-9 shrink-0">{label}</span>
      <div className="flex-1 flex flex-wrap items-center gap-1.5 py-1">
        {values.map((address) => (
          <span
            key={address}
            className={cn(
              'group inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-[13px] max-w-full',
              isValidEmail(address)
                ? 'bg-surface-container-high text-on-surface'
                : 'bg-error/10 text-error ring-1 ring-error/30',
            )}
            title={isValidEmail(address) ? address : `${address} is not a valid email address`}
          >
            <span className="truncate">{address}</span>
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== address))}
              className="rounded-full p-0.5 opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
              aria-label={`Remove ${address}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          autoFocus={autoFocus}
          onChange={(e) => {
            // Pasting a whole list should chip it up immediately.
            if (/[,;]/.test(e.target.value)) commit(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim() && commit(draft)}
          className="flex-1 min-w-[140px] bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60"
          placeholder={values.length ? '' : 'Recipients'}
          aria-label={label}
        />
      </div>
      {trailing && <div className="flex items-center gap-2 pt-1 shrink-0">{trailing}</div>}
    </div>
  );
}

// ─── Formatting toolbar ───────────────────────────────────────────────────────

function ToolbarButton({
  icon, title, onAction, active,
}: { icon: React.ReactNode; title: string; onAction: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      // Keep the caret inside the editor: focus must not move on click.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onAction}
      className={cn(
        'p-1.5 rounded transition-colors text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
        active && 'bg-surface-container-high text-on-surface',
      )}
    >
      {icon}
    </button>
  );
}

// ─── Compose window ───────────────────────────────────────────────────────────

export default function GmailCompose({
  leadId, open, onClose, defaultTo = [], defaultSubject = '', contextLabel, fromLabel, onSent,
}: GmailComposeProps) {
  const [windowState, setWindowState] = useState<WindowState>('normal');
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Selection is lost when the link box takes focus — stash it to restore.
  const savedRange = useRef<Range | null>(null);
  // Mirrors `attachments` so the upload loop can budget against the live total
  // without a stale closure or an impure state updater.
  const attachmentsRef = useRef<PendingAttachment[]>([]);
  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);

  // Reset to a clean sheet every time the window is opened.
  useEffect(() => {
    if (!open) return;
    setWindowState('normal');
    setTo(defaultTo.filter(Boolean).map((t) => t.toLowerCase()));
    setCc([]);
    setBcc([]);
    setShowCc(false);
    setShowBcc(false);
    setSubject(defaultSubject);
    setAttachments([]);
    setShowLinkInput(false);
    setSending(false);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      // With recipients already filled in, the cursor belongs in the message.
      if (defaultTo.length) editorRef.current.focus();
    }
    // defaultTo/defaultSubject are read once per open on purpose — retyping the
    // subject must not be undone by a parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalAttachmentBytes = useMemo(
    () => attachments.reduce((sum, a) => sum + a.fileSize, 0),
    [attachments],
  );
  const uploading = attachments.some((a) => a.uploading);

  const bodyIsEmpty = () => !(editorRef.current?.innerText ?? '').trim();

  const hasContent = useCallback(
    () => to.length > 0 || cc.length > 0 || bcc.length > 0 || subject.trim() !== '' ||
      attachments.length > 0 || !bodyIsEmpty(),
    [to, cc, bcc, subject, attachments],
  );

  // ── Attachments ────────────────────────────────────────────────────────────

  const uploadFiles = useCallback(async (files: File[]) => {
    let runningTotal = attachmentsRef.current.reduce((sum, a) => sum + a.fileSize, 0);

    for (const file of files) {
      if (runningTotal + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
        toast.error(
          `${file.name} would exceed the ${formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)} total attachment limit`,
        );
        continue;
      }
      runningTotal += file.size;

      const localId = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      setAttachments((prev) => [...prev, {
        localId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        uploading: true,
      }]);

      try {
        const uploaded = await teleSalesApi.uploadFile(file);
        setAttachments((prev) => prev.map((a) =>
          a.localId === localId
            ? { ...a, uploading: false, fileId: uploaded.data.fileId, fileType: uploaded.data.fileType || a.fileType }
            : a));
      } catch (err) {
        const message = apiErrorMessage(err, 'Upload failed');
        setAttachments((prev) => prev.map((a) =>
          a.localId === localId ? { ...a, uploading: false, error: message } : a));
        toast.error(`${file.name}: ${message}`);
      }
    }
  }, []);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) uploadFiles(files);
  };

  // ── Rich text ──────────────────────────────────────────────────────────────

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const openLinkInput = () => {
    const selection = window.getSelection();
    savedRange.current = selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    setLinkDraft('');
    setShowLinkInput(true);
  };

  const applyLink = () => {
    const url = linkDraft.trim();
    if (!url) { setShowLinkInput(false); return; }
    const href = /^(https?:\/\/|mailto:|tel:)/i.test(url) ? url : `https://${url}`;

    editorRef.current?.focus();
    if (savedRange.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRange.current);
    }

    const selection = window.getSelection();
    if (selection && selection.toString()) {
      document.execCommand('createLink', false, href);
    } else {
      // Nothing highlighted — drop the URL in as its own link, like Gmail does.
      document.execCommand('insertHTML', false, `<a href="${href}">${href}</a>`);
    }
    setShowLinkInput(false);
    setLinkDraft('');
  };

  // Paste as plain text so foreign styling never rides into the message.
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // ── Send / discard ─────────────────────────────────────────────────────────

  const handleSend = async () => {
    const recipients = [...to, ...cc, ...bcc];
    if (to.length === 0) { toast.error('Add at least one recipient'); return; }

    const invalid = recipients.find((a) => !isValidEmail(a));
    if (invalid) { toast.error(`"${invalid}" is not a valid email address`); return; }

    if (!subject.trim()) {
      const confirmed = await Swal.fire({
        title: 'Send without a subject?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Send anyway',
        confirmButtonColor: '#003A8F',
      });
      if (!confirmed.isConfirmed) return;
    }

    if (uploading) { toast.error('Wait for attachments to finish uploading'); return; }

    const ready: EmailAttachment[] = attachments
      .filter((a) => a.fileId && !a.error)
      .map((a) => ({ fileId: a.fileId!, fileName: a.fileName, fileType: a.fileType, fileSize: a.fileSize }));

    if (ready.length === 0 && bodyIsEmpty()) { toast.error('Write a message before sending'); return; }

    setSending(true);
    try {
      const payload = {
        to,
        cc,
        bcc,
        subject: subject.trim() || '(no subject)',
        message: editorRef.current?.innerHTML ?? '',
        attachments: ready,
      };
      const response = leadId
        ? await teleSalesApi.sendLeadEmail(leadId, payload)
        : await teleSalesApi.sendComposedEmail(payload);
      toast.success('Message sent');
      onSent?.(response.data);
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to send the message'));
    } finally {
      setSending(false);
    }
  };

  const handleDiscard = async () => {
    if (hasContent()) {
      const confirmed = await Swal.fire({
        title: 'Discard this draft?',
        text: 'The message will not be saved.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Discard',
        confirmButtonColor: '#ef4444',
      });
      if (!confirmed.isConfirmed) return;
    }
    onClose();
  };

  // Escape tucks the window away rather than losing the draft.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || windowState === 'minimized') return;
      // A confirm dialog on top owns Escape — let it close itself first.
      if (document.querySelector('.swal2-container')) return;
      setWindowState('minimized');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, windowState]);

  if (!open) return null;

  const headerTitle = windowState === 'minimized' && subject.trim() ? subject.trim() : 'New Message';

  // ── Window chrome ──────────────────────────────────────────────────────────

  const header = (
    <div
      className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[#404040] text-white rounded-t-lg cursor-pointer select-none"
      onClick={() => windowState === 'minimized' && setWindowState('normal')}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{headerTitle}</p>
        {contextLabel && windowState !== 'minimized' && (
          <p className="text-[11px] text-white/60 truncate">to {contextLabel}</p>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          title={windowState === 'minimized' ? 'Expand' : 'Minimize'}
          aria-label={windowState === 'minimized' ? 'Expand' : 'Minimize'}
          onClick={(e) => { e.stopPropagation(); setWindowState(windowState === 'minimized' ? 'normal' : 'minimized'); }}
          className="p-1.5 rounded hover:bg-white/15"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          title={windowState === 'maximized' ? 'Exit full screen' : 'Full screen'}
          aria-label={windowState === 'maximized' ? 'Exit full screen' : 'Full screen'}
          onClick={(e) => { e.stopPropagation(); setWindowState(windowState === 'maximized' ? 'normal' : 'maximized'); }}
          className="p-1.5 rounded hover:bg-white/15"
        >
          {windowState === 'maximized' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button
          type="button"
          title="Save & close"
          aria-label="Close"
          onClick={(e) => { e.stopPropagation(); handleDiscard(); }}
          className="p-1.5 rounded hover:bg-white/15"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const windowClasses = cn(
    'flex flex-col bg-surface-container-lowest shadow-2xl border border-outline-variant/30 pointer-events-auto',
    windowState === 'minimized' && 'w-[320px] rounded-t-lg',
    windowState === 'normal' && 'w-[min(560px,calc(100vw-2rem))] h-[min(620px,calc(100vh-2rem))] rounded-t-lg',
    windowState === 'maximized' && 'w-[min(960px,calc(100vw-4rem))] h-[min(85vh,860px)] rounded-lg',
  );

  const composeWindow = (
    <div className={windowClasses} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      {header}

      {/* Hidden rather than unmounted while minimized, so the draft survives. */}
      <div className={cn('flex flex-col flex-1 min-h-0', windowState === 'minimized' && 'hidden')}>
        {/* Header rows: From / To / Cc / Bcc / Subject */}
        <div className="shrink-0">
          {fromLabel && (
            <div className="flex items-center gap-2 border-b border-outline-variant/40 px-4 py-2">
              <span className="text-sm text-on-surface-variant w-9 shrink-0">From</span>
              <span className="text-sm text-on-surface truncate">{fromLabel}</span>
            </div>
          )}

          <RecipientField
            label="To"
            values={to}
            onChange={setTo}
            autoFocus={to.length === 0}
            trailing={
              <>
                {!showCc && (
                  <button type="button" onClick={() => setShowCc(true)}
                    className="text-sm text-on-surface-variant hover:text-on-surface hover:underline">Cc</button>
                )}
                {!showBcc && (
                  <button type="button" onClick={() => setShowBcc(true)}
                    className="text-sm text-on-surface-variant hover:text-on-surface hover:underline">Bcc</button>
                )}
              </>
            }
          />

          {showCc && <RecipientField label="Cc" values={cc} onChange={setCc} autoFocus />}
          {showBcc && <RecipientField label="Bcc" values={bcc} onChange={setBcc} autoFocus />}

          <div className="border-b border-outline-variant/40 px-4 py-2.5">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={250}
              placeholder="Subject"
              aria-label="Subject"
              className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60"
            />
          </div>
        </div>

        {/* Message body */}
        <div className="flex-1 min-h-0 relative">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onPaste={handlePaste}
            data-placeholder="Write your message…"
            role="textbox"
            aria-multiline="true"
            aria-label="Message body"
            className={cn(
              'h-full w-full overflow-y-auto px-4 py-3 text-sm text-on-surface outline-none',
              'gmail-compose-body',
            )}
          />
          {dragOver && (
            <div className="absolute inset-2 rounded-lg border-2 border-dashed border-primary bg-primary/5 flex items-center justify-center pointer-events-none">
              <p className="text-sm font-medium text-primary">Drop files to attach</p>
            </div>
          )}
        </div>

        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="shrink-0 max-h-28 overflow-y-auto px-4 py-2 border-t border-outline-variant/30 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div key={att.localId}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs max-w-[240px]',
                  att.error
                    ? 'border-error/40 bg-error/5 text-error'
                    : 'border-outline-variant/40 bg-surface-container-lowest text-on-surface',
                )}>
                {att.uploading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-on-surface-variant" />
                  : att.error
                    ? <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    : att.fileType.startsWith('image/')
                      ? <ImageIcon className="w-3.5 h-3.5 shrink-0 text-on-surface-variant" />
                      : <FileText className="w-3.5 h-3.5 shrink-0 text-on-surface-variant" />}
                <span className="truncate" title={att.fileName}>{att.fileName}</span>
                <span className="text-on-surface-variant shrink-0">{formatFileSize(att.fileSize)}</span>
                <button type="button" aria-label={`Remove ${att.fileName}`}
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.localId !== att.localId))}
                  className="rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-surface-container-high shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <span className="self-center text-[11px] text-on-surface-variant">
              {formatFileSize(totalAttachmentBytes)} of {formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)}
            </span>
          </div>
        )}

        {/* Link input */}
        {showLinkInput && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-t border-outline-variant/30 bg-surface-container-low">
            <Link2 className="w-4 h-4 text-on-surface-variant shrink-0" />
            <input
              value={linkDraft}
              autoFocus
              onChange={(e) => setLinkDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                if (e.key === 'Escape') { e.preventDefault(); setShowLinkInput(false); }
              }}
              placeholder="Paste or type a link…"
              aria-label="Link URL"
              className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60"
            />
            <button type="button" onClick={applyLink}
              className="text-sm font-medium text-primary hover:underline">Apply</button>
            <button type="button" onClick={() => setShowLinkInput(false)}
              className="text-sm text-on-surface-variant hover:text-on-surface">Cancel</button>
          </div>
        )}

        {/* Formatting toolbar */}
        {showToolbar && (
          <div className="shrink-0 flex items-center gap-0.5 px-3 py-1.5 border-t border-outline-variant/30 bg-surface-container-low overflow-x-auto">
            <ToolbarButton icon={<Bold className="w-4 h-4" />} title="Bold (Ctrl+B)" onAction={() => exec('bold')} />
            <ToolbarButton icon={<Italic className="w-4 h-4" />} title="Italic (Ctrl+I)" onAction={() => exec('italic')} />
            <ToolbarButton icon={<Underline className="w-4 h-4" />} title="Underline (Ctrl+U)" onAction={() => exec('underline')} />
            <ToolbarButton icon={<Strikethrough className="w-4 h-4" />} title="Strikethrough" onAction={() => exec('strikeThrough')} />
            <span className="mx-1 h-4 w-px bg-outline-variant/50" />
            <ToolbarButton icon={<List className="w-4 h-4" />} title="Bulleted list" onAction={() => exec('insertUnorderedList')} />
            <ToolbarButton icon={<ListOrdered className="w-4 h-4" />} title="Numbered list" onAction={() => exec('insertOrderedList')} />
            <span className="mx-1 h-4 w-px bg-outline-variant/50" />
            <ToolbarButton icon={<Link2 className="w-4 h-4" />} title="Insert link" onAction={openLinkInput} active={showLinkInput} />
            <ToolbarButton icon={<RemoveFormatting className="w-4 h-4" />} title="Remove formatting" onAction={() => exec('removeFormat')} />
          </div>
        )}

        {/* Action bar */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-outline-variant/30 rounded-b-lg">
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || uploading}
            className={cn(
              'inline-flex items-center gap-2 rounded-full bg-[#0b57d0] px-6 py-2 text-sm font-medium text-white',
              'hover:bg-[#0a4fbb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b57d0]/40',
              'disabled:opacity-60 disabled:cursor-not-allowed transition-colors',
            )}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending…' : 'Send'}
          </button>

          <div className="flex items-center gap-0.5 ml-1">
            <ToolbarButton
              icon={<Type className="w-4 h-4" />}
              title="Formatting options"
              onAction={() => setShowToolbar((v) => !v)}
              active={showToolbar}
            />
            <ToolbarButton
              icon={<Paperclip className="w-4 h-4" />}
              title="Attach files"
              onAction={() => fileInputRef.current?.click()}
            />
          </div>

          <div className="ml-auto">
            <ToolbarButton icon={<Trash2 className="w-4 h-4" />} title="Discard draft" onAction={handleDiscard} />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    </div>
  );

  // Full screen sits over a dim backdrop; the docked states hug the corner and
  // let the page stay usable behind them.
  return createPortal(
    windowState === 'maximized' ? (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
        {composeWindow}
      </div>
    ) : (
      <div className="fixed bottom-0 right-4 sm:right-8 z-[70] pointer-events-none">
        {composeWindow}
      </div>
    ),
    document.body,
  );
}
