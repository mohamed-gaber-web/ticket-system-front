import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Eye, Loader2, Braces, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CustomSelect } from '@/components/ui/custom-select';
import * as salesAssistantApi from '@/api/salesAssistantApi';
import { apiErrorMessage } from '@/lib/salesAssistant';
import { cn } from '@/lib/utils';
import type {
  MessageTemplate,
  MessageTemplateInput,
  TemplateChannel,
  TemplatePreview,
  TemplatePurpose,
  TemplateVariable,
} from '@/types/salesAssistant.types';
import { TEMPLATE_PURPOSE_LABELS } from '@/types/salesAssistant.types';

interface MessageTemplateFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MessageTemplateInput) => Promise<void> | void;
  template?: MessageTemplate | null;
  loading: boolean;
  variables: TemplateVariable[];
  /** Preselect the channel when creating from a channel tab. */
  defaultChannel?: TemplateChannel;
}

const PURPOSE_OPTIONS = (Object.keys(TEMPLATE_PURPOSE_LABELS) as TemplatePurpose[]).map((p) => ({ value: p, label: TEMPLATE_PURPOSE_LABELS[p] }));
const GROUP_LABELS: Record<TemplateVariable['group'], string> = {
  lead: 'Lead', salesAgent: 'Sales agent', company: 'Company', product: 'Product', document: 'Document',
};

/** Convert the plain-text email editor content to simple paragraph HTML. */
const textToHtml = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('\n');

/** Inverse of textToHtml for editing an existing HTML email template. */
const htmlToText = (html: string) =>
  html
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    // A <br> followed by source-formatting whitespace is still one line break.
    .replace(/<br\s*\/?>\s*/gi, '\n')
    .replace(/<\/?(p|ul|ol|div)[^>]*>/gi, '')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/?strong>/gi, '**')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Email templates are stored as HTML (same allow-list as composed mail) but
// edited here as text with blank-line paragraphs; **bold** is kept as <strong>.
const editorToBody = (channel: TemplateChannel, text: string) =>
  channel === 'email' ? textToHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') : text;

export default function MessageTemplateFormDialog({
  isOpen, onClose, onSubmit, template, loading, variables, defaultChannel = 'email',
}: MessageTemplateFormDialogProps) {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<TemplateChannel>(defaultChannel);
  const [purpose, setPurpose] = useState<TemplatePurpose>('general');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [errors, setErrors] = useState<{ name?: string; subject?: string; body?: string }>({});
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocused = useRef<'subject' | 'body'>('body');

  useEffect(() => {
    if (!isOpen) return;
    setName(template?.name ?? '');
    setChannel(template?.channel ?? defaultChannel);
    setPurpose(template?.purpose ?? 'general');
    setDescription(template?.description ?? '');
    setSubject(template?.subject ?? '');
    setBodyText(template ? (template.channel === 'email' ? htmlToText(template.body) : template.body) : '');
    setIsDefault(template?.isDefault ?? false);
    setStatus(template?.status ?? 'active');
    setErrors({});
    setPreview(null);
    setPreviewError(null);
  }, [template, isOpen, defaultChannel]);

  const groupedVariables = useMemo(() => {
    const groups = new Map<TemplateVariable['group'], TemplateVariable[]>();
    for (const v of variables) {
      if (!groups.has(v.group)) groups.set(v.group, []);
      groups.get(v.group)!.push(v);
    }
    return [...groups.entries()];
  }, [variables]);

  // Insert at the caret of whichever field was last focused.
  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    if (lastFocused.current === 'subject' && channel === 'email' && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? subject.length;
      const next = subject.slice(0, start) + token + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); });
      return;
    }
    const el = bodyRef.current;
    const start = el?.selectionStart ?? bodyText.length;
    const end = el?.selectionEnd ?? bodyText.length;
    const next = bodyText.slice(0, start) + token + bodyText.slice(end);
    setBodyText(next);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); });
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setPreviewError(null);
    try {
      const r = await salesAssistantApi.previewTemplate({ channel, subject, body: editorToBody(channel, bodyText) });
      setPreview(r.data);
    } catch (err) {
      setPreviewError(apiErrorMessage(err, 'Preview failed'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Name is required';
    if (channel === 'email' && !subject.trim()) next.subject = 'Email templates need a subject';
    if (!bodyText.trim()) next.body = 'Body is required';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({
      name: name.trim(),
      channel,
      purpose,
      description: description.trim(),
      subject: channel === 'email' ? subject.trim() : '',
      body: editorToBody(channel, bodyText),
      isDefault,
      status,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="form-dialog-overlay">
      <div className="form-dialog-content max-w-5xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-outline-variant/20">
          <div>
            <h2 className="text-xl font-semibold text-on-surface">{template ? 'Edit Template' : 'New Template'}</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Placeholders like <code className="font-mono">{'{{lead.firstName}}'}</code> are filled in from the lead, you, the company and the product when the message is prepared.</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px]">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label htmlFor="t-name" className="form-label">Name <span className="text-error">*</span></label>
                  <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Company Profile" className={errors.name ? 'ring-[2px] ring-error/30' : ''} />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>
                <div>
                  <label className="form-label">Channel</label>
                  <div className="flex rounded-xl bg-surface-container p-1">
                    {(['email', 'whatsapp'] as TemplateChannel[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        disabled={Boolean(template)}
                        onClick={() => setChannel(c)}
                        className={cn('flex-1 text-sm font-medium rounded-lg py-1.5 transition-colors disabled:cursor-not-allowed', channel === c ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                      >
                        {c === 'email' ? 'Email' : 'WhatsApp'}
                      </button>
                    ))}
                  </div>
                </div>
                <CustomSelect label="Used for" value={purpose} onChange={(v) => setPurpose(v as TemplatePurpose)} options={PURPOSE_OPTIONS} />
              </div>

              {channel === 'email' && (
                <div>
                  <label htmlFor="t-subject" className="form-label">Subject <span className="text-error">*</span></label>
                  <Input ref={subjectRef} id="t-subject" value={subject} onChange={(e) => setSubject(e.target.value)} onFocus={() => { lastFocused.current = 'subject'; }} placeholder="Company Profile — {{company.name}}" className={cn('font-mono text-sm', errors.subject && 'ring-[2px] ring-error/30')} />
                  {errors.subject && <p className="form-error">{errors.subject}</p>}
                </div>
              )}

              <div>
                <label htmlFor="t-body" className="form-label">
                  Message <span className="text-error">*</span>
                  <span className="text-on-surface-variant font-normal ml-1">{channel === 'email' ? '(blank line = new paragraph, **bold**)' : '(sent as plain text)'}</span>
                </label>
                <Textarea
                  ref={bodyRef}
                  id="t-body"
                  rows={14}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  onFocus={() => { lastFocused.current = 'body'; }}
                  className={cn('font-mono text-sm leading-relaxed', errors.body && 'ring-[2px] ring-error/30')}
                  placeholder={'Hello {{lead.firstName}},\n\nThank you for your interest in {{company.name}}.\n\n{{salesAgent.name}}\n{{salesAgent.phone}}'}
                />
                {errors.body && <p className="form-error">{errors.body}</p>}
              </div>

              <div>
                <label htmlFor="t-desc" className="form-label">Note for agents</label>
                <Input id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When to use this template" />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="form-checkbox" />
                  <span className="ml-2.5 text-sm font-medium text-on-surface">Default for “{TEMPLATE_PURPOSE_LABELS[purpose]}” quick action</span>
                </label>
                {template && (
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" checked={status === 'active'} onChange={(e) => setStatus(e.target.checked ? 'active' : 'inactive')} className="form-checkbox" />
                    <span className="ml-2.5 text-sm font-medium text-on-surface">Active</span>
                  </label>
                )}
              </div>

              {/* Preview */}
              <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Preview <span className="font-normal normal-case">(sample lead)</span></p>
                  <Button type="button" size="sm" variant="outline" onClick={handlePreview} disabled={previewing || !bodyText.trim()} className="gap-2">
                    {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Preview
                  </Button>
                </div>
                <div className="p-4 text-sm">
                  {previewError && <p className="text-error text-xs">{previewError}</p>}
                  {!preview && !previewError && <p className="text-xs text-on-surface-variant">Click Preview to see the message with sample data.</p>}
                  {preview && (
                    <div className="space-y-2">
                      {preview.channel === 'email' && preview.subject && <p className="font-semibold text-on-surface">{preview.subject}</p>}
                      {preview.channel === 'email'
                        ? <div className="prose prose-sm max-w-none text-on-surface [&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-5 [&_li]:list-disc" dangerouslySetInnerHTML={{ __html: preview.body }} />
                        : <pre className="whitespace-pre-wrap font-sans text-on-surface">{preview.body}</pre>}
                      {preview.missing.length > 0 && (
                        <p className="text-xs text-accent-orange-700 inline-flex items-start gap-1 mt-2">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>Empty in this preview: {preview.missing.join(', ')} — product / document values only fill in when the message is sent with one.</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Variable picker */}
            <aside className="border-t lg:border-t-0 lg:border-l border-outline-variant/20 p-4 space-y-4 bg-surface-container-low/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant inline-flex items-center gap-1"><Braces className="w-3.5 h-3.5" /> Insert variable</p>
              {groupedVariables.length === 0 && <p className="text-xs text-on-surface-variant">Variables unavailable.</p>}
              {groupedVariables.map(([group, vars]) => (
                <div key={group}>
                  <p className="text-[11px] font-semibold text-on-surface-variant mb-1">{GROUP_LABELS[group]}</p>
                  <div className="flex flex-wrap gap-1">
                    {vars.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        title={v.label}
                        className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-surface-container-highest text-on-surface hover:bg-primary hover:text-on-primary transition-colors"
                      >
                        {v.key.split('.')[1]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </aside>
          </div>

          <div className="flex justify-end gap-3 p-6 pt-4 border-t border-outline-variant/20">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving…' : template ? 'Update Template' : 'Create Template'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
