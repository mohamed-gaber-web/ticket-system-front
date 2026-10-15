import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks/hooks';
import {
  addImplGroup,
  addImplLine,
  addLicense,
  removeImplGroup,
  removeImplLine,
  removeLicense,
  setField,
  setImplDiscount,
  setLicenseField,
  setNotes,
  updateImplGroup,
  updateImplLine,
  updateLicense,
} from '@/redux/slices/proposalBuilderSlice';
import { discountOverLimit, formatUsd, needsApproval, proposalTotals } from '@/lib/proposalMath';
import { personName, type Proposal, type ProposalCatalog, type ProposalOpportunity } from '@/types/proposal.types';
import LinesTextarea from './LinesTextarea';
import { Box, Field, NativeSelect, NumberInput, Pill, RailSection, RemoveButton, fieldCls } from './builderUi';

const groupBy = <T,>(list: T[], key: (x: T) => string) => {
  const m = new Map<string, T[]>();
  list.forEach((x) => m.set(key(x), [...(m.get(key(x)) ?? []), x]));
  return [...m];
};

export default function PricingTab({ proposal, catalog, canEdit }: { proposal: Proposal; catalog: ProposalCatalog; canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const max = catalog.settings.maxDiscount;
  const t = useMemo(() => proposalTotals(proposal), [proposal]);
  const services = groupBy(catalog.services.filter((s) => s.active), (s) => s.category);
  const skus = groupBy(catalog.skus.filter((s) => s.active), (s) => s.family || 'Other');
  const opp = typeof proposal.opportunity === 'object' ? (proposal.opportunity as ProposalOpportunity) : null;
  const users = opp?.expectedUsers || 1;
  const over = discountOverLimit(proposal, max);
  const waiting = needsApproval(proposal, max);

  const addService = (g: number, code: string) => {
    if (!code) return;
    if (code === '__custom') {
      dispatch(addImplLine({ g, line: { serviceId: '', name: 'New item', qty: 1, unitPrice: 0 } }));
      return;
    }
    const s = catalog.services.find((x) => x.code === code);
    if (s) dispatch(addImplLine({ g, line: { serviceId: s.code, name: s.name, qty: 1, unitPrice: s.price || 0 } }));
  };

  const addSku = (code: string) => {
    const s = catalog.skus.find((x) => x.code === code);
    if (s) dispatch(addLicense({ skuId: s.code, name: s.name, skuCode: s.skuCode, qty: users, pricePerUserMonth: s.pricePerUserMonth }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Currency">
          <input className={fieldCls} value="USD ($)" readOnly disabled />
        </Field>
        <Field label="VAT %">
          <NumberInput value={proposal.vat} max={100} step={0.5} ariaLabel="VAT percent" disabled={!canEdit} onChange={(v) => dispatch(setField({ key: 'vat', value: v }))} />
        </Field>
      </div>

      <RailSection
        title="Implementation tables"
        hint={'One table per legal entity, like "LT Implementation". Columns: description · qty · unit price.'}
      >
        {proposal.implementation.groups.map((g, gi) => (
          <Box key={gi}>
            <div className="grid grid-cols-[minmax(0,1fr)_2rem] gap-1.5">
              <input
                className={`${fieldCls} font-semibold`}
                value={g.title}
                aria-label="Table title"
                disabled={!canEdit}
                onChange={(e) => dispatch(updateImplGroup({ g: gi, title: e.target.value }))}
              />
              <RemoveButton label="Remove table" onClick={() => dispatch(removeImplGroup(gi))} disabled={!canEdit} />
            </div>
            {g.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_3.5rem_6rem_2rem] gap-1.5">
                <input
                  className={fieldCls}
                  value={l.name}
                  title={l.name}
                  aria-label="Description"
                  disabled={!canEdit}
                  onChange={(e) => dispatch(updateImplLine({ g: gi, i, patch: { name: e.target.value } }))}
                />
                <NumberInput value={l.qty} ariaLabel="Quantity" disabled={!canEdit} onChange={(v) => dispatch(updateImplLine({ g: gi, i, patch: { qty: v } }))} />
                <NumberInput value={l.unitPrice} ariaLabel="Unit price (USD)" disabled={!canEdit} onChange={(v) => dispatch(updateImplLine({ g: gi, i, patch: { unitPrice: v } }))} />
                <RemoveButton label="Remove line" onClick={() => dispatch(removeImplLine({ g: gi, i }))} disabled={!canEdit} />
              </div>
            ))}
            {canEdit && (
              <NativeSelect value="" ariaLabel="Add a service" onChange={(v) => addService(gi, v)}>
                <option value="">+ Add a service from the price list…</option>
                {services.map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                        {s.price ? ` · ${formatUsd(s.price, 0)}` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="__custom">Custom line…</option>
              </NativeSelect>
            )}
            <p className="text-right text-xs text-on-surface-variant tabular-nums">
              Total after VAT: <b className="text-on-surface">{formatUsd(t.groups[gi]?.total ?? 0)}</b>
            </p>
          </Box>
        ))}
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={() => dispatch(addImplGroup())}>
            <Plus /> Implementation table
          </Button>
        )}
        <Field label="Implementation discount %" className="max-w-[12rem]">
          <NumberInput value={proposal.implementation.discountPct} max={100} step={0.5} ariaLabel="Implementation discount percent" disabled={!canEdit} onChange={(v) => dispatch(setImplDiscount(v))} />
        </Field>
      </RailSection>

      <RailSection title="Microsoft licenses" hint="Columns: users · $ per user / month. The PDF shows the yearly unit price.">
        {proposal.licenses.lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_3.5rem_5rem_2rem] items-center gap-1.5">
            <div className="min-w-0 text-sm text-on-surface">
              <span className="block truncate" title={l.name}>
                {l.name}
              </span>
              <small className="block truncate text-[11px] text-on-surface-variant">{l.skuCode || 'SKU code not set'}</small>
            </div>
            <NumberInput value={l.qty} ariaLabel="Users" disabled={!canEdit} onChange={(v) => dispatch(updateLicense({ i, patch: { qty: v } }))} />
            <NumberInput value={l.pricePerUserMonth} ariaLabel="Price per user per month (USD)" disabled={!canEdit} onChange={(v) => dispatch(updateLicense({ i, patch: { pricePerUserMonth: v } }))} />
            <RemoveButton label="Remove license" onClick={() => dispatch(removeLicense(i))} disabled={!canEdit} />
          </div>
        ))}
        {!proposal.licenses.lines.length && <p className="text-xs text-on-surface-variant">No licenses.</p>}
        {canEdit && (
          <NativeSelect value="" ariaLabel="Add a Microsoft SKU" onChange={addSku}>
            <option value="">+ Add a Microsoft SKU…</option>
            {skus.map(([fam, list]) => (
              <optgroup key={fam} label={fam}>
                {list.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} · ${s.pricePerUserMonth}/mo
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="License discount %">
            <NumberInput value={proposal.licenses.discountPct} max={100} step={0.5} ariaLabel="License discount percent" disabled={!canEdit} onChange={(v) => dispatch(setLicenseField({ key: 'discountPct', value: v }))} />
          </Field>
          <Field label="Billing term (months)">
            <NumberInput value={proposal.licenses.termMonths} min={1} max={120} step={1} ariaLabel="Billing term in months" disabled={!canEdit} onChange={(v) => dispatch(setLicenseField({ key: 'termMonths', value: Math.round(v) || 1 }))} />
          </Field>
        </div>
      </RailSection>

      <RailSection title="Notes under the budget">
        <LinesTextarea
          value={proposal.notes}
          rows={3}
          ariaLabel="Notes under the budget"
          placeholder="e.g. 100 hours customization for every project (For free)"
          disabled={!canEdit}
          onChange={(lines) => dispatch(setNotes(lines))}
        />
      </RailSection>

      <RailSection title="Discount approval">
        {waiting ? (
          <Pill tone="warn">Discount above {max}% needs a sales manager's approval</Pill>
        ) : over ? (
          <Pill tone="ok">Discount approved by {personName(proposal.approvedBy)}</Pill>
        ) : (
          <Pill tone="ok">Discount within the {max}% limit</Pill>
        )}
        <p className="text-xs text-on-surface-variant">
          {waiting
            ? 'Saving sends it to your sales manager for approval (the team managers are notified). The PDF can be downloaded once it is approved.'
            : 'Changing an approved discount above the limit asks for approval again.'}
        </p>
      </RailSection>

      <div className="space-y-1 rounded-xl bg-surface-container-low p-3 text-sm tabular-nums">
        <div className="flex justify-between gap-2">
          <span className="text-on-surface-variant">Implementation (incl. VAT)</span>
          <span>{formatUsd(t.implementation)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-on-surface-variant">Licenses (incl. VAT)</span>
          <span>{formatUsd(t.licenses)}</span>
        </div>
        <div className="flex justify-between gap-2 border-t border-outline-variant/40 pt-1 text-base font-extrabold text-on-surface">
          <span>Grand total</span>
          <span>{formatUsd(t.grand)}</span>
        </div>
      </div>
    </div>
  );
}
