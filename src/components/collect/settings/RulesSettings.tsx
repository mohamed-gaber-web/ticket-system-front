import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged } from '@/redux/slices/collectSlice';
import { createReminderRule, deleteReminderRule, getEmailTemplates, getReminderRules, updateReminderRule } from '@/api/collectApi';
import { RECIPIENT_LABELS, TRIGGER_LABELS, apiError } from '@/lib/collect';
import { Chip, ConfirmButton, EmptyState, ErrorState, Field, INPUT, Loading, Modal, Panel, Select, TableBox, TD, TDN, TH, TypeDot } from '@/components/collect/CollectUi';
import { ReadOnlyNote } from './ReadOnlyNote';
import type { ContractType, EmailTemplate, Recipient, ReminderRule, Trigger } from '@/types/collect.types';

type Draft = Omit<ReminderRule, 'id' | 'key'>;

const blank = (templateKey = ''): Draft => ({ active: true, trigger: 'due', days: 7, recipient: 'client', templateKey, contractTypes: [] });

const TRIGGER_HINT: Record<Trigger, string> = {
  due: 'عدد الأيام قبل تاريخ استحقاق الدفعة',
  overdue: 'عدد الأيام بعد تاريخ استحقاق الدفعة غير المسددة',
  renewal: 'عدد الأيام قبل نهاية العقد (للأنواع القابلة للتجديد)',
  sign: 'عدد الأيام بعد إرسال العقد للعميل دون توقيع',
  cheque: 'عدد الأيام قبل تاريخ الشيك المحفوظ في الخزنة',
};

function RuleDialog({
  open,
  rule,
  templates,
  types,
  onClose,
  onSaved,
}: {
  open: boolean;
  rule: ReminderRule | null;
  templates: EmailTemplate[];
  types: ContractType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<Draft>(() => blank());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setD(rule ? { ...rule, contractTypes: [...rule.contractTypes] } : blank(templates[0]?.key ?? ''));
  }, [open, rule, templates]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const toggleType = (key: string) =>
    set('contractTypes', d.contractTypes.includes(key) ? d.contractTypes.filter((k) => k !== key) : [...d.contractTypes, key]);

  const save = async () => {
    if (!d.templateKey) {
      toast.error('اختر قالب البريد');
      return;
    }
    setSaving(true);
    try {
      if (rule) await updateReminderRule(rule.id, d);
      else await createReminderRule(d);
      toast.success('تم حفظ القاعدة');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'تعذر حفظ القاعدة'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? 'تعديل قاعدة التذكير' : 'قاعدة تذكير جديدة'}
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="التذكير" htmlFor="ru-trigger">
          <Select id="ru-trigger" value={d.trigger} onChange={(e) => set('trigger', e.target.value as Trigger)}>
            {(Object.keys(TRIGGER_LABELS) as Trigger[]).map((t) => (
              <option key={t} value={t}>
                {TRIGGER_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="عدد الأيام" htmlFor="ru-days" hint={TRIGGER_HINT[d.trigger]}>
          <input id="ru-days" type="number" min={0} className={INPUT} value={d.days} onChange={(e) => set('days', Math.max(0, Math.round(Number(e.target.value))))} />
        </Field>
        <Field label="المستلم" htmlFor="ru-rec">
          <Select id="ru-rec" value={d.recipient} onChange={(e) => set('recipient', e.target.value as Recipient)}>
            {(Object.keys(RECIPIENT_LABELS) as Recipient[]).map((r) => (
              <option key={r} value={r}>
                {RECIPIENT_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="قالب البريد" htmlFor="ru-tpl">
          <Select id="ru-tpl" value={d.templateKey} onChange={(e) => set('templateKey', e.target.value)}>
            {!d.templateKey && <option value="">اختر القالب</option>}
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold text-on-surface-variant">أنواع العقود (بدون تحديد = كل الأنواع)</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {types.map((t) => (
            <label key={t.key} className="inline-flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" className="accent-primary" checked={d.contractTypes.includes(t.key)} onChange={() => toggleType(t.key)} />
              <TypeDot color={t.color} /> {t.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="accent-primary" checked={d.active} onChange={(e) => set('active', e.target.checked)} />
        القاعدة مفعّلة
      </label>
    </Modal>
  );
}

/** الإعدادات › قواعد التذكير */
export function RulesSettings() {
  const dispatch = useAppDispatch();
  const canAdmin = useAppSelector((s) => !!s.collect.meta?.canAdmin);
  const types = useAppSelector((s) => s.collect.meta?.types ?? []);
  const [rules, setRules] = useState<ReminderRule[] | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReminderRule | null | 'new'>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, t] = await Promise.all([getReminderRules(), getEmailTemplates()]);
      setRules(r);
      setTemplates(t);
    } catch (e) {
      setError(apiError(e, 'تعذر تحميل القواعد'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = () => {
    void load();
    void dispatch(collectChanged());
  };

  const toggleActive = async (r: ReminderRule) => {
    setRules((list) => list?.map((x) => (x.id === r.id ? { ...x, active: !r.active } : x)) ?? null);
    try {
      await updateReminderRule(r.id, {
        active: !r.active,
        trigger: r.trigger,
        days: r.days,
        recipient: r.recipient,
        templateKey: r.templateKey,
        contractTypes: r.contractTypes,
      });
      void dispatch(collectChanged());
    } catch (e) {
      toast.error(apiError(e, 'تعذر حفظ القاعدة'));
      void load();
    }
  };

  const remove = async (r: ReminderRule) => {
    try {
      await deleteReminderRule(r.id);
      toast.success('تم حذف القاعدة');
      changed();
    } catch (e) {
      toast.error(apiError(e, 'تعذر حذف القاعدة'));
    }
  };

  const tplName = (key: string) => templates.find((t) => t.key === key)?.name ?? key;
  const typeOf = (key: string) => types.find((t) => t.key === key);

  return (
    <Panel
      title="قواعد التذكير"
      hint="كل قاعدة ترسل قالب بريد لعدد من الأيام قبل أو بعد حدث. لو انطبقت أكثر من قاعدة على نفس الدفعة يظهر التذكير الأحدث فقط."
      action={
        canAdmin ? (
          <Button onClick={() => setEditing('new')} disabled={!templates.length}>
            <Plus /> قاعدة جديدة
          </Button>
        ) : undefined
      }
    >
      {!canAdmin && <ReadOnlyNote />}
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !rules ? (
        <Loading />
      ) : rules.length === 0 ? (
        <EmptyState title="لا توجد قواعد تذكير" />
      ) : (
        <TableBox>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-outline-variant/40">
              <tr>
                <th className={TH}>مفعّلة</th>
                <th className={TH}>التذكير</th>
                <th className={TH}>الأيام</th>
                <th className={TH}>المستلم</th>
                <th className={TH}>القالب</th>
                <th className={TH}>الأنواع</th>
                {canAdmin && (
                  <th className={TH}>
                    <span className="sr-only">إجراءات</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {rules.map((r) => (
                <tr key={r.id} className={r.active ? undefined : 'opacity-60'}>
                  <td className={TD}>
                    <input
                      type="checkbox"
                      className="accent-primary"
                      aria-label="القاعدة مفعّلة"
                      checked={r.active}
                      disabled={!canAdmin}
                      onChange={() => void toggleActive(r)}
                    />
                  </td>
                  <td className={TD}>{TRIGGER_LABELS[r.trigger]}</td>
                  <td className={TDN}>{r.days} يوم</td>
                  <td className={TD}>{RECIPIENT_LABELS[r.recipient]}</td>
                  <td className={TD}>{tplName(r.templateKey)}</td>
                  <td className={TD}>
                    {r.contractTypes.length ? (
                      <div className="flex flex-wrap gap-1">
                        {r.contractTypes.map((k) => (
                          <Chip key={k} dot={typeOf(k)?.color}>
                            {typeOf(k)?.name ?? k}
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <span className="text-on-surface-variant">كل الأنواع</span>
                    )}
                  </td>
                  {canAdmin && (
                    <td className={TD}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                          <Pencil /> تعديل
                        </Button>
                        <ConfirmButton onConfirm={() => remove(r)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableBox>
      )}
      <RuleDialog
        open={editing !== null}
        rule={editing === 'new' ? null : editing}
        templates={templates}
        types={types}
        onClose={() => setEditing(null)}
        onSaved={changed}
      />
    </Panel>
  );
}
