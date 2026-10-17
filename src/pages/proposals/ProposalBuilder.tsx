import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { saveAs } from 'file-saver';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Mail,
  Save,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  approveProposal,
  fetchCatalog,
  fetchProposal,
  requestApproval,
  resetBuilder,
  saveProposal,
} from '@/redux/slices/proposalBuilderSlice';
import { recordProposalExport, setProposalStatus } from '@/api/proposalApi';
import { discountOverLimit, formatUsd, milestonesComplete, needsApproval, proposalTotals } from '@/lib/proposalMath';
import { pdfFileName } from '@/lib/proposalPages';
import { buildProposalPdf, type PdfQuality } from '@/utils/proposalPdf';
import type { ProposalStatus } from '@/types/proposal.types';
import ProposalPreview from '@/components/proposals/ProposalPreview';
import { useProposalImages } from '@/components/proposals/useProposalImages';
import OpportunityTab from '@/components/proposals/OpportunityTab';
import ScopeTab from '@/components/proposals/ScopeTab';
import SowTab from '@/components/proposals/SowTab';
import PricingTab from '@/components/proposals/PricingTab';
import TermsTab from '@/components/proposals/TermsTab';
import SectionsTab from '@/components/proposals/SectionsTab';
import ProposalStatusBadge from '@/components/proposals/ProposalStatusBadge';
import SendProposalEmail from '@/components/proposals/SendProposalEmail';
import { cn } from '@/lib/utils';

type Tab = 'opp' | 'scope' | 'sow' | 'pricing' | 'terms' | 'sections';
const TABS: [Tab, string][] = [
  ['opp', 'Opportunity'],
  ['scope', 'Scope'],
  ['sow', 'SOW'],
  ['pricing', 'Pricing'],
  ['terms', 'Terms'],
  ['sections', 'Sections'],
];
const AUTOSAVE_MS = 30_000;

const apiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/**
 * Proposal Builder (PROPOSAL_BUILDER_SPEC.md §5.2): the five-step rail on the
 * left, the live PDF preview on the right. Drafts autosave every 30 s and on tab
 * change; the PDF is drawn in the browser from the same pages as the preview.
 */
export default function ProposalBuilder() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { proposal, catalog, status, dirty, error, lastSavedAt } = useAppSelector((s) => s.proposalBuilder);
  const [tab, setTab] = useState<Tab>('opp');
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const pagesRef = useRef<string[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const images = useProposalImages(proposal);

  // Leaving the page inside the app saves what is pending. Declared before the
  // load effect so its cleanup runs before resetBuilder clears the draft.
  const saveRef = useRef<() => unknown>(() => null);
  // Keyed on the id: going from /proposals/A to /proposals/B keeps this page
  // mounted, so A's pending edits are saved here before the reset below.
  useEffect(() => () => void saveRef.current(), [id]);

  useEffect(() => {
    dispatch(fetchCatalog());
    if (id) dispatch(fetchProposal(id));
    return () => {
      dispatch(resetBuilder());
    };
  }, [dispatch, id]);

  const canEdit = Boolean(proposal?.permissions?.edit);
  const canApprove = Boolean(proposal?.permissions?.approve);
  const maxDiscount = catalog?.settings.maxDiscount ?? 10;
  const totals = useMemo(() => proposalTotals(proposal), [proposal]);
  const waiting = proposal ? needsApproval(proposal, maxDiscount) : false;
  const overLimit = proposal ? discountOverLimit(proposal, maxDiscount) : false;

  // ── saving ──
  const save = useCallback(
    // One save at a time; edits made meanwhile stay dirty for the next one.
    (quiet = false) => (canEdit && dirty && status !== 'saving' ? dispatch(saveProposal({ quiet })) : null),
    [canEdit, dirty, status, dispatch],
  );
  saveRef.current = () => save(true);
  useEffect(() => {
    if (!dirty || !canEdit) return;
    const t = window.setTimeout(() => save(true), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [dirty, canEdit, save, proposal]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const changeTab = (t: Tab) => {
    if (dirty) save(true);
    setTab(t);
  };

  const onPages = useCallback((pages: string[]) => {
    pagesRef.current = pages;
    setPageCount(pages.length);
  }, []);

  // ── actions ──
  /** False (and says why) while an over-limit discount waits for approval. */
  const exportAllowed = () => {
    if (!waiting) return true;
    toast.error(`The discount is above ${maxDiscount}%. A sales manager must approve it first.`);
    setTab('pricing');
    return false;
  };

  /** Save pending edits, pass the export gate and draw the PDF (shared by Download and Send by email). */
  const makePdf = async (onProgress: (text: string) => void, quality: PdfQuality = 'normal') => {
    if (!proposal) throw 'The proposal is not loaded yet.';
    if (dirty && canEdit) await dispatch(saveProposal({ quiet: true })).unwrap();
    await recordProposalExport(proposal._id);
    // Let the preview rebuild with the latest edits before rasterising.
    await new Promise((r) => setTimeout(r, 250));
    return buildProposalPdf(pagesRef.current, (done, total) => onProgress(`Building PDF ${Math.min(done + 1, total)}/${total}…`), quality);
  };

  const downloadPdf = async () => {
    if (!proposal || !exportAllowed()) return;
    try {
      setPdfProgress('Preparing…');
      const blob = await makePdf(setPdfProgress);
      saveAs(blob, pdfFileName(proposal));
      toast.success(`PDF ready: ${pdfFileName(proposal)}`);
    } catch (e) {
      toast.error(typeof e === 'string' ? e : apiError(e, 'The PDF could not be built. Try again.'));
    } finally {
      setPdfProgress(null);
    }
  };

  // After the email goes out, a Draft / Approved proposal becomes Sent (what
  // "Mark Sent" is for), as long as the payment milestones are complete.
  const afterEmailSent = async () => {
    setEmailOpen(false);
    if (!proposal || !canEdit || !['Draft', 'Approved'].includes(proposal.status) || !milestonesComplete(proposal)) return;
    try {
      await setProposalStatus(proposal._id, 'Sent');
      await dispatch(fetchProposal(proposal._id));
      toast.success('Proposal marked Sent');
    } catch (e) {
      toast.error(apiError(e, 'The email went out, but the proposal could not be marked Sent'));
    }
  };

  const changeStatus = async (next: ProposalStatus) => {
    if (!proposal) return;
    setMenuOpen(false);
    if (next === 'Sent' && !milestonesComplete(proposal)) {
      toast.error('Payment milestones must add up to 100% first.');
      setTab('terms');
      return;
    }
    const r = await Swal.fire({
      title: `Mark as ${next}?`,
      text:
        next === 'Accepted' || next === 'Rejected'
          ? 'An accepted or rejected proposal is locked. Create a new version to change it.'
          : next === 'Sent'
            ? 'Use this once the PDF has gone to the customer.'
            : 'The proposal becomes editable again.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#003A8F',
      confirmButtonText: `Mark ${next}`,
    });
    if (!r.isConfirmed) return;
    try {
      if (dirty && canEdit) await dispatch(saveProposal({ quiet: true })).unwrap();
      await setProposalStatus(proposal._id, next);
      await dispatch(fetchProposal(proposal._id));
      toast.success(`Marked ${next}`);
    } catch (e) {
      toast.error(typeof e === 'string' ? e : apiError(e, 'Could not change the status'));
    }
  };

  // ── render ──
  if (status === 'error') {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-lg space-y-3 rounded-2xl bg-surface-container-lowest p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-on-surface-variant" />
          <p className="font-semibold text-on-surface">{error || 'Proposal not found'}</p>
          <Button asChild variant="outline">
            <Link to="/proposals">Back to proposals</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (!proposal || !catalog) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-on-surface-variant">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading proposal…
      </div>
    );
  }

  const opportunity = typeof proposal.opportunity === 'object' ? proposal.opportunity : null;
  const opportunityId = opportunity?._id ?? (typeof proposal.opportunity === 'string' ? proposal.opportunity : '');

  const statusMoves: ProposalStatus[] =
    proposal.status === 'Sent' ? ['Accepted', 'Rejected', 'Draft'] : ['Draft', 'Approved'].includes(proposal.status) ? ['Sent'] : [];

  return (
    <div className="p-6 space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Back to proposals">
            <Link to="/proposals">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-on-surface">Proposal Builder</h1>
              <ProposalStatusBadge status={proposal.status} />
            </div>
            <p className="truncate text-sm text-on-surface-variant">
              {proposal.client} · {proposal.number}
              {status === 'saving' ? ' · Saving…' : dirty ? ' · Unsaved changes' : lastSavedAt ? ' · All changes saved' : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button type="button" variant="outline" onClick={() => save(false)} disabled={!dirty || status === 'saving'}>
              {status === 'saving' ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          )}
          {waiting && canApprove && (
            <Button type="button" variant="outline" onClick={() => dispatch(approveProposal())}>
              <BadgeCheck /> Approve discount
            </Button>
          )}
          {waiting && !canApprove && canEdit && !dirty && (
            <Button type="button" variant="outline" onClick={() => dispatch(requestApproval())}>
              <ShieldAlert /> {proposal.status === 'Pending approval' ? 'Remind manager' : 'Request approval'}
            </Button>
          )}
          {statusMoves.length > 0 && canEdit && (
            <div className="relative">
              <Button type="button" variant="outline" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                <Send /> Status <ChevronDown />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 z-30 mt-1 min-w-40 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-1 shadow-ambient">
                  {statusMoves.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-container-high"
                      onClick={() => changeStatus(s)}
                    >
                      Mark {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {canEdit && opportunityId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => exportAllowed() && setEmailOpen(true)}
              disabled={Boolean(pdfProgress)}
              title={waiting ? 'Needs approval first' : 'Email the PDF to the customer'}
            >
              <Mail /> Send by email
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={downloadPdf} disabled={Boolean(pdfProgress)} title={waiting ? 'Needs approval first' : undefined}>
            {pdfProgress ? <Loader2 className="animate-spin" /> : <Download />} {pdfProgress ?? 'Download PDF'}
          </Button>
        </div>
      </div>

      {waiting && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {proposal.status === 'Pending approval'
            ? `Your sales manager was asked to approve the discount above ${maxDiscount}%. The PDF unlocks once it is approved.`
            : `A discount is above ${maxDiscount}%. Saving sends it to your sales manager for approval; the PDF unlocks once it is approved.`}
        </div>
      )}
      {!canEdit && (
        <div className="rounded-xl bg-surface-container-low px-4 py-2.5 text-sm text-on-surface-variant">
          {['Accepted', 'Rejected'].includes(proposal.status)
            ? `This proposal is ${proposal.status.toLowerCase()} and locked. Create a new version from the opportunity to change it.`
            : 'You can view this proposal but not edit it.'}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-2">
        {/* rail */}
        <aside className="min-w-0 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
          <div role="tablist" className="flex overflow-x-auto border-b border-outline-variant/30">
            {TABS.map(([k, label], i) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => changeTab(k)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-3 py-3 text-sm font-semibold transition-colors',
                  tab === k ? 'border-accent-orange-500 text-on-surface' : 'border-transparent text-on-surface-variant hover:text-on-surface',
                )}
              >
                <span
                  className={cn(
                    'grid h-5 w-5 place-items-center rounded-full text-[11px]',
                    tab === k ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  {i + 1}
                </span>
                {label}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab === 'opp' && <OpportunityTab proposal={proposal} canEdit={canEdit} />}
            {tab === 'scope' && <ScopeTab proposal={proposal} catalog={catalog} canEdit={canEdit} />}
            {tab === 'sow' && <SowTab proposal={proposal} catalog={catalog} images={images} canEdit={canEdit} />}
            {tab === 'pricing' && <PricingTab proposal={proposal} catalog={catalog} canEdit={canEdit} />}
            {tab === 'terms' && <TermsTab proposal={proposal} catalog={catalog} canEdit={canEdit} />}
            {tab === 'sections' && <SectionsTab proposal={proposal} canEdit={canEdit} />}
          </div>
        </aside>

        {/* preview */}
        <section className="min-w-0 space-y-2 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <p className="text-xs text-on-surface-variant">
            <b className="text-on-surface">{pageCount} pages</b> · {proposal.number} · {formatUsd(totals.grand)} incl. VAT
            {overLimit && !waiting && ' · discount approved'}
          </p>
          <ProposalPreview proposal={proposal} catalog={catalog} images={images} onPages={onPages} />
        </section>
      </div>

      {opportunityId && (
        <SendProposalEmail
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          leadId={opportunityId}
          leadEmail={opportunity?.email}
          contactName={opportunity?.contactPersonName || opportunity?.companyName || proposal.client}
          proposalNumber={proposal.number}
          fileName={pdfFileName(proposal)}
          buildPdf={makePdf}
          onSent={afterEmailSent}
        />
      )}
    </div>
  );
}
