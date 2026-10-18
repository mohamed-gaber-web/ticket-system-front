import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged } from '@/redux/slices/collectSlice';
import { createEmailTemplate, deleteEmailTemplate, getEmailTemplates, updateEmailTemplate } from '@/api/collectApi';
import { PLACEHOLDERS, apiError } from '@/lib/collect';
import { ConfirmButton, EmptyState, ErrorState, Field, INPUT, Loading, Modal, Panel, TEXTAREA } from '@/components/collect/CollectUi';
import { ReadOnlyNote } from './ReadOnlyNote';
import type { EmailTemplate } from '@/types/collect.types';

type Draft = Pick<EmailTemplate, 'name' | 'subject' | 'body'>;
type Target = 'subject' | 'body';

function TemplateDialog({ open, template, onClose, onSaved }: { open: boolean; template: EmailTemplate | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>({ name: '', subject: '', body: '' });
  const [saving, setSaving] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef<Target>('body');

  useEffect(() => {
    if (open) setD(template ? { name: template.name, subject: template.subject, body: template.body } : { name: '', subject: '', body: '' });
  }, [open, template]);

  /** Insert {{token}} at the cursor of the last focused field. */
  const insert = (token: string) => {
    const target = lastFocus.current;
    const el = target === 'subject' ? subjectRef.current : bodyRef.current;
    const text = `{{${token}}}`;
    const value = d[target];
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    setD((x) => ({ ...x, [target]: next }));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const save = async () => {
    if (!d.name.trim()) {
      toast.error('اكتب اسم القالب');
      return;
    }
    setSaving(true);
    try {
      if (template) await updateEmailTemplate(template.id, d);
      else await createEmailTemplate(d);
      toast.success('تم حفظ القالب');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'تعذر حفظ القالب'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={template ? `تعديل القالب — ${template.name}` : 'قالب بريد جديد'}
      footer={
        <>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} حفظ
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </>
      }
    >
      <Field label="اسم القالب" htmlFor="tp-name" required>
        <input id="tp-name" className={INPUT} value={d.name} onChange={(e) => setD((x) => ({ ...x, name: e.target.value }))} />
      </Field>
      <Field label="الموضوع" htmlFor="tp-subject">
        <input
          id="tp-subject"
          ref={subjectRef}
          className={INPUT}
          value={d.subject}
          onFocus={() => (lastFocus.current = 'subject')}
          onChange={(e) => setD((x) => ({ ...x, subject: e.target.value }))}
        />
      </Field>
      <Field label="نص الرسالة" htmlFor="tp-body">
        <textarea
          id="tp-body"
          ref={bodyRef}
          rows={10}
          className={TEXTAREA}
          value={d.body}
          onFocus={() => (lastFocus.current = 'body')}
          onChange={(e) => setD((x) => ({ ...x, body: e.target.value }))}
        />
      </Field>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-on-surface-variant">اضغط على متغير لإدراجه في مكان المؤشر:</p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <button
              key={p}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(p)}
              className="rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-primary outline-none hover:bg-primary/15 focus-visible:ring-[2px] focus-visible:ring-primary/40"
            >
              {`{{${p}}}`}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/** الإعدادات › قوالب البريد */
export function TemplatesSettings() {
  const dispatch = useAppDispatch();
  const canAdmin = useAppSelector((s) => !!s.collect.meta?.canAdmin);
  const [rows, setRows] = useState<EmailTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmailTemplate | null | 'new'>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await getEmailTemplates());
    } catch (e) {
      setError(apiError(e, 'تعذر تحميل القوالب'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = () => {
    void load();
    void dispatch(collectChanged());
  };

  const remove = async (t: EmailTemplate) => {
    try {
      await deleteEmailTemplate(t.id);
      toast.success('تم حذف القالب');
      changed();
    } catch (e) {
      toast.error(apiError(e, 'تعذر حذف القالب'));
    }
  };

  return (
    <Panel
      title="قوالب البريد"
      hint="المتغيرات بين {{ }} تُستبدل ببيانات العقد والعميل عند تجهيز التذكير."
      action={
        canAdmin ? (
          <Button onClick={() => setEditing('new')}>
            <Plus /> قالب جديد
          </Button>
        ) : undefined
      }
    >
      {!canAdmin && <ReadOnlyNote />}
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title="لا توجد قوالب" />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((t) => (
            <li key={t.id} className="flex min-w-0 flex-col gap-2 rounded-[0.75rem] bg-surface-container-low p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface">{t.name}</p>
                  <p className="truncate text-xs text-on-surface-variant" title={t.subject}>
                    {t.subject}
                  </p>
                </div>
                {canAdmin && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                      <Pencil /> تعديل
                    </Button>
                    <ConfirmButton onConfirm={() => remove(t)} />
                  </div>
                )}
                {!canAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(t)}>
                    عرض
                  </Button>
                )}
              </div>
              <p className="pre line-clamp-4 text-[13px] leading-relaxed text-on-surface-variant">{t.body}</p>
            </li>
          ))}
        </ul>
      )}
      {canAdmin ? (
        <TemplateDialog open={editing !== null} template={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={changed} />
      ) : (
        <Modal open={editing !== null && editing !== 'new'} onClose={() => setEditing(null)} title={editing && editing !== 'new' ? editing.name : ''} wide>
          {editing && editing !== 'new' && (
            <>
              <p className="font-semibold text-on-surface">{editing.subject}</p>
              <p className="pre text-sm leading-relaxed text-on-surface">{editing.body}</p>
            </>
          )}
        </Modal>
      )}
    </Panel>
  );
}
