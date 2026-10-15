import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks/hooks';
import { rebuildFromOpportunity, setField } from '@/redux/slices/proposalBuilderSlice';
import { personName, type Proposal, type ProposalOpportunity } from '@/types/proposal.types';
import { Field, Pill, RailSection, fieldCls } from './builderUi';

export default function OpportunityTab({ proposal, canEdit }: { proposal: Proposal; canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const opp = (typeof proposal.opportunity === 'object' ? proposal.opportunity : null) as ProposalOpportunity | null;
  const oppId = opp?._id ?? (proposal.opportunity as string);
  const entities = opp?.legalEntities?.length ?? 0;
  const contact = [opp?.contactPersonName, opp?.phonePrimary, opp?.email].filter(Boolean).join(' · ');

  const rebuild = async () => {
    const r = await Swal.fire({
      title: 'Rebuild from the opportunity?',
      text: 'Entities, modules, scope of work, pricing and terms are rebuilt from the opportunity and the price list. Your edits to this proposal are replaced and any approval is cleared.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003A8F',
      confirmButtonText: 'Rebuild',
    });
    if (r.isConfirmed) dispatch(rebuildFromOpportunity());
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5 rounded-xl bg-surface-container-low p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-bold text-on-surface">{opp?.companyName || proposal.client}</p>
          {opp?.status && <Pill tone="info">{opp.status}</Pill>}
        </div>
        <p className="text-xs text-on-surface-variant">{contact || 'No contact details'}</p>
        <p className="text-xs text-on-surface-variant">
          {opp?.country || proposal.country} · {entities} legal entit{entities === 1 ? 'y' : 'ies'} · {opp?.expectedUsers ? `${opp.expectedUsers} users` : 'users not set'}
        </p>
        <p className="text-xs text-on-surface-variant">Interested in: {opp?.proposalInterests?.length ? opp.proposalInterests.join(', ') : '—'}</p>
        <p className="text-xs text-on-surface-variant">Owner: {personName(opp?.assignedTo)}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/tele-sales/leads/${oppId}`}>
              <ExternalLink /> Edit opportunity
            </Link>
          </Button>
          {canEdit && proposal.status !== 'Sent' && (
            <Button type="button" variant="outline" size="sm" onClick={rebuild}>
              <RefreshCw /> Rebuild from opportunity
            </Button>
          )}
        </div>
      </div>

      <RailSection title="Proposal">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Presented date">
            <input
              type="date"
              className={fieldCls}
              value={proposal.presentedDate?.slice(0, 10) ?? ''}
              disabled={!canEdit}
              onChange={(e) => e.target.value && dispatch(setField({ key: 'presentedDate', value: e.target.value }))}
            />
          </Field>
          <Field label="Prepared by">
            <input className={fieldCls} value={personName(proposal.preparedBy)} readOnly disabled />
          </Field>
        </div>
        <p className="text-xs text-on-surface-variant">
          Proposal <b className="text-on-surface">{proposal.number}</b> · version {proposal.version} · {proposal.country} (VAT {proposal.vat}%) · USD
        </p>
        <p className="text-xs text-on-surface-variant">
          To change the client name, country, legal entities or interests, edit the opportunity, then rebuild — or adjust this proposal on the next tabs.
        </p>
      </RailSection>
    </div>
  );
}
