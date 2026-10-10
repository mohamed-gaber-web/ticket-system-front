import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, ClipboardList, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchSelect } from '@/components/ui/search-select';
import { useAccess } from '@/redux/hooks/useAccess';
import { useAppSelector } from '@/redux/hooks/hooks';
import {
  createSurvey,
  deleteSurvey,
  getSurveyCompanies,
  getSurveys,
  getSurveySummary,
  updateSurvey,
} from '@/api/marketingApi';
import type { CustomerSurvey, SurveyCompany, SurveySummary } from '@/types/marketing.types';
import { cn } from '@/lib/utils';

const RATING_LABELS = ['', 'Very poor', 'Poor', 'Average', 'Good', 'Excellent'];

interface Row {
  key: number;
  rating: number;
  comment: string;
}

let rowKey = 0;
const newRow = (rating = 0, comment = ''): Row => ({ key: ++rowKey, rating, comment });

const todayInput = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const personName = (p?: { firstName?: string; lastName?: string } | null) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(' ') || '—';
const apiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const px = size === 'sm' ? 'h-3.5 w-3.5' : 'h-6 w-6';
  return (
    <div className="flex items-center gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const star = <Star className={cn(px, n <= shown ? 'fill-amber-400 text-amber-400' : 'text-outline-variant')} />;
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} — ${RATING_LABELS[n]}`}
            title={RATING_LABELS[n]}
            className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-primary"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

/** The dynamic rating + comment rows; "+" adds a row. */
function SurveyEditor({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial?: CustomerSurvey | null;
  saving: boolean;
  onSave: (date: string, rows: Row[]) => void;
  onCancel?: () => void;
}) {
  const [date, setDate] = useState(initial ? initial.surveyDate.slice(0, 10) : todayInput());
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.items.length ? initial.items.map((i) => newRow(i.rating, i.comment ?? '')) : [newRow()],
  );

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  const add = () => setRows((rs) => [...rs, newRow()]);

  const submit = () => {
    const missing = rows.findIndex((r) => r.rating < 1);
    if (missing >= 0) {
      toast.error(`Pick a rating for row ${missing + 1}`);
      return;
    }
    onSave(date, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-on-surface-variant">Survey date</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </label>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.key} className="flex flex-col gap-3 rounded-[0.75rem] bg-surface-container-low p-3 sm:flex-row sm:items-start">
            <div className="flex items-center gap-3 sm:w-56 sm:flex-col sm:items-start sm:gap-1">
              <span className="text-xs font-semibold text-on-surface-variant">Rate {i + 1}</span>
              <StarRating value={row.rating} onChange={(v) => update(row.key, { rating: v })} />
              <span className="text-xs text-on-surface-variant">{row.rating ? RATING_LABELS[row.rating] : 'Not rated'}</span>
            </div>
            <Textarea
              value={row.comment}
              onChange={(e) => update(row.key, { comment: e.target.value })}
              placeholder="Comment"
              maxLength={2000}
              rows={2}
              className="flex-1"
              aria-label={`Comment ${i + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(row.key)}
              disabled={rows.length === 1}
              aria-label={`Remove rate ${i + 1}`}
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={add} className="gap-2" disabled={rows.length >= 50}>
          <Plus className="h-4 w-4" /> Add rate &amp; comment
        </Button>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          )}
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Save survey'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SurveyCard({
  survey,
  canEdit,
  onEdit,
  onDelete,
}: {
  survey: CustomerSurvey;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-[1rem] bg-surface-container-lowest p-5 ghost-border space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-on-surface">{fmtDate(survey.surveyDate)}</p>
          <p className="text-xs text-on-surface-variant">
            by {personName(survey.createdBy)}
            {survey.updatedBy && survey.updatedAt !== survey.createdAt ? ` · edited by ${personName(survey.updatedBy)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-sm font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <Star className="h-3.5 w-3.5 fill-current" /> {survey.averageRating.toFixed(1)}
          </span>
          {canEdit && !confirming && (
            <>
              <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit survey" title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setConfirming(true)} aria-label="Delete survey" title="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {confirming && (
            <span className="flex items-center gap-1 text-sm">
              Delete?
              <Button variant="destructive" size="sm" onClick={onDelete}>Yes</Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setConfirming(false)} aria-label="Keep survey">
                <X className="h-4 w-4" />
              </Button>
            </span>
          )}
        </div>
      </div>
      <ul className="divide-y divide-outline-variant/40">
        {survey.items.map((item, i) => (
          <li key={item._id ?? i} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex shrink-0 items-center gap-2 sm:w-48">
              <StarRating value={item.rating} size="sm" />
              <span className="text-xs text-on-surface-variant">{RATING_LABELS[item.rating]}</span>
            </div>
            <p className="text-sm text-on-surface whitespace-pre-wrap break-words">{item.comment || <span className="text-on-surface-variant">No comment</span>}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CustomerSurveys() {
  const access = useAccess();
  const myId = useAppSelector((s) => (s.auth.user as { _id?: string } | null)?._id);
  const [companies, setCompanies] = useState<SurveyCompany[]>([]);
  const [company, setCompany] = useState('');
  const [surveys, setSurveys] = useState<CustomerSurvey[]>([]);
  const [summary, setSummary] = useState<SurveySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomerSurvey | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSurveyCompanies()
      .then((r) => setCompanies(r.data))
      .catch((e) => toast.error(apiError(e, 'Failed to load customers')));
  }, []);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([getSurveys({ company: id, limit: 100 }), getSurveySummary(id)]);
      setSurveys(list.data);
      setSummary(sum.data);
    } catch (e) {
      toast.error(apiError(e, 'Failed to load surveys'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSurveys([]);
    setSummary(null);
    setCreating(false);
    setEditing(null);
    load(company);
  }, [company, load]);

  const options = useMemo(
    () => companies.map((c) => ({ value: c._id, label: c.name, sub: c.isActive ? undefined : 'Inactive' })),
    [companies],
  );
  const selected = companies.find((c) => c._id === company);

  const save = async (date: string, rows: Row[]) => {
    setSaving(true);
    const payload = { surveyDate: date, items: rows.map((r) => ({ rating: r.rating, comment: r.comment.trim() })) };
    try {
      if (editing) {
        await updateSurvey(editing._id, payload);
        toast.success('Survey updated');
        setEditing(null);
      } else {
        await createSurvey({ ...payload, company });
        toast.success('Survey saved');
        setCreating(false);
      }
      await load(company);
    } catch (e) {
      toast.error(apiError(e, 'Failed to save the survey'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteSurvey(id);
      toast.success('Survey deleted');
      await load(company);
    } catch (e) {
      toast.error(apiError(e, 'Failed to delete the survey'));
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="display-sm text-on-surface">CSP — Customer Satisfaction</h1>
        <p className="text-on-surface-variant mt-1">Pick a customer, then record their ratings and comments. Use + to add as many points as you need.</p>
      </div>

      <div className="bg-surface-container-lowest rounded-[1rem] p-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SearchSelect
          label="Customer"
          value={company}
          onChange={setCompany}
          options={options}
          placeholder="Select a customer company…"
          icon={<Building2 className="h-4 w-4" />}
          className="w-full md:max-w-md"
        />
        {company && summary && (
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs text-on-surface-variant">Surveys</p>
              <p className="text-lg font-bold text-on-surface">{summary.count}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Average rating</p>
              <p className="text-lg font-bold text-on-surface">{summary.average != null ? `${summary.average.toFixed(2)} / 5` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Last survey</p>
              <p className="text-lg font-bold text-on-surface">{fmtDate(summary.lastSurveyDate)}</p>
            </div>
          </div>
        )}
      </div>

      {!company ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[1rem] bg-surface-container-lowest py-16 text-center">
          <span className="rounded-full bg-surface-container-high p-4 text-on-surface-variant">
            <ClipboardList className="h-6 w-6" />
          </span>
          <p className="font-semibold text-on-surface">Select a customer to see or add surveys</p>
        </div>
      ) : (
        <>
          {(creating || editing) ? (
            <div className="rounded-[1rem] bg-surface-container-lowest p-5 ghost-border space-y-4">
              <h2 className="text-base font-bold text-on-surface">
                {editing ? 'Edit survey' : 'New survey'} — {selected?.name}
              </h2>
              <SurveyEditor
                key={editing?._id ?? 'new'}
                initial={editing}
                saving={saving}
                onSave={save}
                onCancel={() => { setCreating(false); setEditing(null); }}
              />
            </div>
          ) : (
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New survey
            </Button>
          )}

          {loading && surveys.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-32 rounded-[1rem] bg-surface-container-low animate-pulse" />)}
            </div>
          ) : surveys.length === 0 ? (
            !creating && <p className="text-sm text-on-surface-variant">No surveys for {selected?.name} yet.</p>
          ) : (
            <div className="space-y-3">
              {surveys.map((s) => (
                <SurveyCard
                  key={s._id}
                  survey={s}
                  canEdit={access.canManageMarketing || s.createdBy?._id === myId}
                  onEdit={() => { setCreating(false); setEditing(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onDelete={() => remove(s._id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
