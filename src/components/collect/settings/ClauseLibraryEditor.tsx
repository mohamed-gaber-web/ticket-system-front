import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Loader2, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks/hooks';
import { collectChanged } from '@/redux/slices/collectSlice';
import { putCollectSettings, resetCollectClauses } from '@/api/collectApi';
import { DOC_PLACEHOLDERS, apiError } from '@/lib/collect';
import { ConfirmButton, INPUT, Panel, TEXTAREA, TypeDot } from '@/components/collect/CollectUi';
import type { Clause, CollectSettings, ContractType } from '@/types/collect.types';

const isAll = (c: Clause) => !c.appliesTo?.length || c.appliesTo.includes('ALL');

/** The general clause library (printed in every contract of the ticked types). */
export function ClauseLibraryEditor({
  initial,
  types,
  readOnly,
  onSaved,
}: {
  initial: Clause[];
  types: ContractType[];
  readOnly: boolean;
  onSaved: (s: CollectSettings) => void;
}) {
  const dispatch = useAppDispatch();
  const [list, setList] = useState<Clause[]>(() => initial.map((c) => ({ ...c, appliesTo: c.appliesTo ?? ['ALL'] })));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (next: Clause[]) => {
    setList(next);
    setDirty(true);
  };
  const patch = (i: number, p: Partial<Clause>) => update(list.map((c, k) => (k === i ? { ...c, ...p } : c)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  const keysOf = (c: Clause) => (isAll(c) ? types.map((t) => t.key) : c.appliesTo ?? []);
  const toggleType = (i: number, key: string) => {
    const cur = new Set(keysOf(list[i]));
    if (cur.has(key)) cur.delete(key);
    else cur.add(key);
    const all = types.every((t) => cur.has(t.key));
    patch(i, { appliesTo: all ? ['ALL'] : [...cur] });
  };

  const save = async () => {
    if (list.some((c) => !c.title.trim())) {
      toast.error('اكتب عنوان كل بند');
      return;
    }
    if (list.some((c) => !isAll(c) && !(c.appliesTo ?? []).length)) {
      toast.error('كل بند لازم يظهر في نوع عقد واحد على الأقل');
      return;
    }
    setSaving(true);
    try {
      const r = await putCollectSettings({ clauses: list.map(({ title, body, appliesTo }) => ({ title, body, appliesTo })) });
      onSaved(r.data);
      setDirty(false);
      toast.success('تم حفظ البنود العامة');
      void dispatch(collectChanged());
    } catch (e) {
      toast.error(apiError(e, 'تعذر حفظ البنود'));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    try {
      const r = await resetCollectClauses();
      onSaved(r.data);
      setList(r.data.clauses.map((c) => ({ ...c, appliesTo: c.appliesTo ?? ['ALL'] })));
      setDirty(false);
      toast.success(r.message ?? 'تم استرجاع البنود الافتراضية');
      void dispatch(collectChanged());
    } catch (e) {
      toast.error(apiError(e, 'تعذر استرجاع البنود'));
    }
  };

  return (
    <Panel
      title={`البنود العامة (${list.length})`}
      hint={
        <>
          تُطبع في كل عقد من الأنواع المحددة، بالترتيب. البند متعدد السطور يُرقّم كبنود فرعية. المتغيرات المتاحة:{' '}
          {[...DOC_PLACEHOLDERS, 'العميل', 'رقم_العقد', 'العقد', 'قيمة_العقد'].map((p) => `{{${p}}}`).join(' · ')}. تعديل
          البنود العامة لا يغيّر العقود ذات البنود المخصصة.
        </>
      }
      action={
        !readOnly && (
          <>
            <ConfirmButton onConfirm={reset} label="استرجاع البنود الافتراضية" icon={false} variant="outline" />
            <Button onClick={() => void save()} disabled={saving || !dirty}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} حفظ البنود
            </Button>
          </>
        )
      }
    >
      <ol className="space-y-3">
        {list.map((c, i) => (
          <li key={c._id ?? `new-${i}`} className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-7 shrink-0 text-center text-sm font-bold tabular-nums text-on-surface-variant">{i + 1}</span>
              <input
                aria-label={`عنوان البند ${i + 1}`}
                className={`${INPUT} flex-1 basis-56 font-semibold`}
                value={c.title}
                disabled={readOnly}
                onChange={(e) => patch(i, { title: e.target.value })}
              />
              {!readOnly && (
                <div className="flex gap-1">
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="تحريك لأعلى" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="تحريك لأسفل" disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <ConfirmButton onConfirm={() => update(list.filter((_, k) => k !== i))} />
                </div>
              )}
            </div>
            <textarea
              aria-label={`نص البند ${i + 1}`}
              rows={Math.min(10, Math.max(3, c.body.split('\n').length + 1))}
              className={TEXTAREA}
              value={c.body}
              disabled={readOnly}
              onChange={(e) => patch(i, { body: e.target.value })}
            />
            <fieldset disabled={readOnly} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              <legend className="sr-only">يظهر في</legend>
              <span className="text-xs font-semibold text-on-surface-variant">يظهر في:</span>
              {types.map((t) => (
                <label key={t.key} className="inline-flex cursor-pointer items-center gap-1.5">
                  <input type="checkbox" className="accent-primary" checked={keysOf(c).includes(t.key)} onChange={() => toggleType(i, t.key)} />
                  <TypeDot color={t.color} /> {t.name}
                </label>
              ))}
              {isAll(c) && <span className="text-[11px] text-on-surface-variant">(كل الأنواع)</span>}
            </fieldset>
          </li>
        ))}
      </ol>
      {!readOnly && (
        <Button type="button" variant="outline" onClick={() => update([...list, { title: 'بند جديد', body: '', appliesTo: ['ALL'] }])}>
          <Plus /> بند جديد
        </Button>
      )}
    </Panel>
  );
}
