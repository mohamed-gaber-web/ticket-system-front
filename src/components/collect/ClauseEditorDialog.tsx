import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, FileDown, Loader2, Plus, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { initContractDocument, resetContractDocument, saveContractDocument } from '@/api/collectApi';
import { apiError } from '@/lib/collect';
import { Chip, ConfirmButton, ErrorState, Field, INPUT, Loading, Modal, TEXTAREA } from '@/components/collect/CollectUi';
import type { ContractDetail, ContractDocument } from '@/types/collect.types';

interface EditClause {
  key: number;
  title: string;
  body: string;
}

type Phase = 'choose' | 'loading' | 'edit' | 'error';

/**
 * Per-contract clause customisation (§7.4): the contract gets its own copy of
 * the clauses — from the global template for its type, or copied from another
 * customised contract of the same customer. Each save is a new version.
 * Editing the global library later never changes this copy.
 */
export function ClauseEditorDialog({
  contract,
  open,
  onClose,
  onSaved,
}: {
  contract: ContractDetail;
  open: boolean;
  onClose: () => void;
  onSaved: (detail: ContractDetail, openPdf: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [global, setGlobal] = useState<ContractDocument | null>(null);
  const [title, setTitle] = useState('');
  const [preamble, setPreamble] = useState('');
  const [typeTerms, setTypeTerms] = useState('');
  const [payTerms, setPayTerms] = useState('');
  const [scope, setScope] = useState('');
  const [notes, setNotes] = useState('');
  const [copiedFrom, setCopiedFrom] = useState<string | null>(null);
  const [clauses, setClauses] = useState<EditClause[]>([]);
  const [saving, setSaving] = useState<null | 'save' | 'pdf'>(null);
  const seq = useRef(0);
  const nextKey = () => ++seq.current;

  const load = async (fromId?: string) => {
    setPhase('loading');
    setError(null);
    try {
      const r = await initContractDocument(contract.id, fromId);
      setGlobal(r.global);
      setTitle(r.draft.title ?? '');
      setPreamble(r.draft.preamble ?? '');
      setTypeTerms(r.draft.typeTerms ?? '');
      setPayTerms(r.draft.payTerms ?? '');
      setCopiedFrom(r.draft.copiedFrom ?? null);
      setScope(r.scope ?? '');
      setNotes(r.notes ?? '');
      setClauses((r.draft.clauses ?? []).map((c) => ({ key: nextKey(), title: c.title, body: c.body })));
      setPhase('edit');
    } catch (e) {
      setError(apiError(e, 'Could not prepare the contract clauses'));
      setPhase('error');
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!contract.document && contract.customizedSiblings.length) setPhase('choose');
    else void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the dialog opens
  }, [open, contract.id]);

  const globalByTitle = useMemo(() => new Map((global?.clauses ?? []).map((c) => [c.title.trim(), c.body])), [global]);

  const patch = (key: number, p: Partial<EditClause>) => setClauses((list) => list.map((c) => (c.key === key ? { ...c, ...p } : c)));
  const move = (i: number, d: -1 | 1) =>
    setClauses((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async (openPdf: boolean) => {
    setSaving(openPdf ? 'pdf' : 'save');
    try {
      const res = await saveContractDocument(contract.id, {
        title,
        preamble,
        typeTerms,
        payTerms,
        clauses: clauses.map(({ title: t, body }) => ({ title: t, body })),
        copiedFrom,
        scope,
        notes,
      });
      toast.success(res.message ?? 'Contract clauses saved');
      onSaved(res.data, openPdf);
    } catch (e) {
      toast.error(apiError(e, 'Could not save the contract clauses'));
    } finally {
      setSaving(null);
    }
  };

  const reset = async () => {
    try {
      const res = await resetContractDocument(contract.id);
      toast.success(res.message ?? 'Reverted to the general template');
      onSaved(res.data, false);
    } catch (e) {
      toast.error(apiError(e, 'Could not revert to the general template'));
    }
  };

  const heading = contract.document ? `Edit contract clauses — ${contract.no}` : `Customize contract clauses — ${contract.no}`;

  if (phase === 'choose') {
    return (
      <Modal open={open} onClose={onClose} title={heading} description="This customer has other contracts with customized clauses. Where do you want to start?">
        <div className="space-y-2">
          <Button type="button" variant="outline" className="w-full justify-start" onClick={() => void load()}>
            Start from the general template
          </Button>
          {contract.customizedSiblings.map((s) => (
            <Button key={s.id} type="button" variant="outline" className="h-auto w-full justify-start whitespace-normal py-2 text-start" onClick={() => void load(s.id)}>
              Copy clauses from {s.no} — {s.name} (v{s.version})
            </Button>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      xwide
      title={heading}
      description={
        <>
          {contract.customer.name} · {contract.name}
          {contract.document ? ` · current version ${contract.document.version ?? 1}` : ''}
          {copiedFrom ? ` · copied from ${copiedFrom}` : ''}
        </>
      }
      footer={
        phase === 'edit' ? (
          <>
            <Button type="button" onClick={() => void save(false)} disabled={!!saving}>
              {saving === 'save' ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
            <Button type="button" variant="outline" onClick={() => void save(true)} disabled={!!saving}>
              {saving === 'pdf' ? <Loader2 className="animate-spin" /> : <FileDown />} Save & create PDF
            </Button>
            <span className="flex-1" />
            {contract.document && <ConfirmButton onConfirm={reset} label="Revert to general template" icon={false} variant="outline" />}
          </>
        ) : undefined
      }
    >
      {phase === 'loading' ? (
        <Loading rows={6} />
      ) : phase === 'error' ? (
        <ErrorState message={error ?? 'Could not prepare the contract clauses'} onRetry={() => void load()} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Contract title" htmlFor="ce-title">
              <input id="ce-title" className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          </div>
          <Field label="Preamble (one paragraph per line)" htmlFor="ce-pre">
            <textarea id="ce-pre" rows={4} className={TEXTAREA} value={preamble} onChange={(e) => setPreamble(e.target.value)} />
          </Field>
          <Field label="Scope of work & deliverables (one item per line)" htmlFor="ce-scope">
            <textarea id="ce-scope" rows={5} className={TEXTAREA} value={scope} onChange={(e) => setScope(e.target.value)} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Payment terms for this contract type" htmlFor="ce-type">
              <textarea id="ce-type" rows={5} className={TEXTAREA} value={typeTerms} onChange={(e) => setTypeTerms(e.target.value)} />
            </Field>
            <Field label="General payment terms" htmlFor="ce-pay">
              <textarea id="ce-pay" rows={5} className={TEXTAREA} value={payTerms} onChange={(e) => setPayTerms(e.target.value)} />
            </Field>
          </div>
          <Field label="Special terms for this contract" htmlFor="ce-notes">
            <textarea id="ce-notes" rows={3} className={TEXTAREA} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div className="space-y-2">
            <h3 className="gpc-h text-sm font-semibold text-on-surface">General clauses ({clauses.length})</h3>
            <p className="text-[11px] text-on-surface-variant">
              You can use {'{{governing_law}}'}, {'{{dispute_venue}}'} and {'{{first_party}}'} in the text.
            </p>
            {clauses.map((cl, i) => {
              const original = globalByTitle.get(cl.title.trim());
              const isNew = original === undefined;
              const changed = !isNew && original !== cl.body;
              return (
                <div key={cl.key} className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 shrink-0 text-xs font-bold tabular-nums text-on-surface-variant">{i + 1}</span>
                    <input
                      aria-label={`Clause ${i + 1} title`}
                      className={`${INPUT} min-w-[12rem] flex-1 font-semibold`}
                      value={cl.title}
                      onChange={(e) => patch(cl.key, { title: e.target.value })}
                    />
                    {isNew && <Chip tone="info">New</Chip>}
                    {changed && <Chip tone="warn">Modified</Chip>}
                    {changed && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => patch(cl.key, { body: original ?? '' })}>
                        <RotateCcw /> Original text
                      </Button>
                    )}
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="Move down" disabled={i === clauses.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown />
                    </Button>
                    <ConfirmButton onConfirm={() => setClauses((list) => list.filter((c) => c.key !== cl.key))} />
                  </div>
                  <textarea
                    aria-label={`Clause ${i + 1} text`}
                    rows={Math.min(10, Math.max(3, cl.body.split('\n').length + 1))}
                    className={TEXTAREA}
                    value={cl.body}
                    onChange={(e) => patch(cl.key, { body: e.target.value })}
                  />
                </div>
              );
            })}
            <Button type="button" variant="outline" onClick={() => setClauses((list) => [...list, { key: nextKey(), title: 'New clause', body: '' }])}>
              <Plus /> New clause for this contract
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
