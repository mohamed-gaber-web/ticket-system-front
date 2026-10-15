import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks/hooks';
import {
  addMilestone,
  removeMilestone,
  setLicenseField,
  setPaymentPreset,
  setTerms,
  updateMilestone,
} from '@/redux/slices/proposalBuilderSlice';
import { milestonesComplete, milestonesTotal } from '@/lib/proposalMath';
import type { Proposal, ProposalCatalog } from '@/types/proposal.types';
import LinesTextarea from './LinesTextarea';
import { Box, Field, NativeSelect, NumberInput, Pill, RailSection, RemoveButton, fieldCls } from './builderUi';

export default function TermsTab({ proposal, catalog, canEdit }: { proposal: Proposal; catalog: ProposalCatalog; canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const presets = Object.keys(catalog.config.paymentPresets);
  const total = Math.round(milestonesTotal(proposal) * 100) / 100;
  const complete = milestonesComplete(proposal);

  return (
    <div className="space-y-6">
      <RailSection title="Payment terms">
        <Field label="Preset">
          <NativeSelect value={proposal.payment.preset || 'Custom'} ariaLabel="Payment preset" disabled={!canEdit} onChange={(v) => dispatch(setPaymentPreset(v))}>
            {presets.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
            <option value="Custom">Custom</option>
          </NativeSelect>
        </Field>
        {proposal.payment.milestones.map((m, i) => (
          <Box key={i}>
            <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_2rem] gap-1.5">
              <input
                className={fieldCls}
                value={m.phase}
                aria-label={`Milestone ${i + 1}`}
                disabled={!canEdit}
                onChange={(e) => dispatch(updateMilestone({ i, patch: { phase: e.target.value } }))}
              />
              <NumberInput value={m.pct} max={100} ariaLabel={`Milestone ${i + 1} percent`} disabled={!canEdit} onChange={(v) => dispatch(updateMilestone({ i, patch: { pct: v } }))} />
              <RemoveButton label={`Remove milestone ${i + 1}`} onClick={() => dispatch(removeMilestone(i))} disabled={!canEdit} />
            </div>
            <LinesTextarea
              value={m.items}
              rows={2}
              placeholder="Deliverables in this milestone, one per line"
              ariaLabel={`Milestone ${i + 1} deliverables`}
              disabled={!canEdit}
              onChange={(items) => dispatch(updateMilestone({ i, patch: { items } }))}
            />
          </Box>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button type="button" variant="outline" size="sm" onClick={() => dispatch(addMilestone())}>
              <Plus /> Milestone
            </Button>
          )}
          {complete ? <Pill tone="ok">Total 100%</Pill> : <Pill tone="warn">Total {total}%, should be 100%</Pill>}
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={proposal.licenses.payInAdvance}
            disabled={!canEdit}
            onChange={(e) => dispatch(setLicenseField({ key: 'payInAdvance', value: e.target.checked }))}
          />
          License Payment 100% In Advance
        </label>
      </RailSection>

      <RailSection title="General terms" hint="One term per line.">
        <LinesTextarea value={proposal.terms} rows={9} ariaLabel="General terms" disabled={!canEdit} onChange={(lines) => dispatch(setTerms(lines))} />
      </RailSection>
    </div>
  );
}
