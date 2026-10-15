import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProposalCatalog, saveProposalCatalog } from '@/api/proposalApi';
import type { CatalogService, CatalogSku, ProposalCatalog } from '@/types/proposal.types';
import { NumberInput, RailSection, RemoveButton, fieldCls } from '@/components/proposals/builderUi';
import { personName } from '@/types/proposal.types';
import { useAccess } from '@/redux/hooks/useAccess';

const apiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

type Draft = Pick<ProposalCatalog, 'settings' | 'services' | 'skus'>;

/**
 * The shared Proposal Builder price list (sales managers and admins). Every rep
 * prices from it as soon as it is saved. Microsoft prices are public list prices
 * typed in by hand — never fetched.
 */
export default function ProposalCatalogPage() {
  const { canManageProposals } = useAccess();
  if (!canManageProposals) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-lg space-y-3 rounded-2xl bg-surface-container-lowest p-8 text-center">
          <p className="font-semibold text-on-surface">Only sales managers and admins can edit the proposal price list.</p>
          <Button asChild variant="outline">
            <Link to="/proposals">Back to proposals</Link>
          </Button>
        </div>
      </div>
    );
  }
  return <CatalogEditor />;
}

function CatalogEditor() {
  const [catalog, setCatalog] = useState<ProposalCatalog | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    getProposalCatalog()
      .then((r) => {
        setCatalog(r.data);
        setDraft({ settings: r.data.settings, services: r.data.services, skus: r.data.skus });
      })
      .catch((e) => toast.error(apiError(e, 'Could not load the price list')));
  }, []);

  const edit = (fn: (d: Draft) => Draft) => {
    setDraft((d) => (d ? fn(d) : d));
    setDirty(true);
  };
  const setService = (i: number, patch: Partial<CatalogService>) =>
    edit((d) => ({ ...d, services: d.services.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const setSku = (i: number, patch: Partial<CatalogSku>) =>
    edit((d) => ({ ...d, skus: d.skus.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const r = await saveProposalCatalog(draft);
      setCatalog(r.data);
      setDraft({ settings: r.data.settings, services: r.data.services, skus: r.data.skus });
      setDirty(false);
      toast.success(r.message || 'Price list saved');
    } catch (e) {
      toast.error(apiError(e, 'Could not save the price list'));
    } finally {
      setSaving(false);
    }
  };

  if (!draft) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-on-surface-variant">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading price list…
      </div>
    );
  }

  const th = 'px-2 py-2 text-left text-xs font-semibold text-on-surface-variant';
  const td = 'px-1.5 py-1';

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Back to proposals">
            <Link to="/proposals">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="display-sm text-on-surface">Proposal price list</h1>
            <p className="mt-1 text-on-surface-variant">
              Services and Microsoft SKUs every rep prices from (USD). Last saved {catalog?.updatedAt ? new Date(catalog.updatedAt).toLocaleString('en-GB') : '—'}
              {catalog?.updatedBy ? ` by ${personName(catalog.updatedBy)}` : ''}.
            </p>
          </div>
        </div>
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />} Save price list
        </Button>
      </div>

      <section className="space-y-4 rounded-[1rem] bg-surface-container-lowest p-5">
        <RailSection title="Settings">
          <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-medium text-on-surface-variant">Max discount without approval %</span>
              <NumberInput value={draft.settings.maxDiscount} max={100} onChange={(v) => edit((d) => ({ ...d, settings: { ...d.settings, maxDiscount: v } }))} />
            </label>
            {(['Egypt', 'KSA', 'Other'] as const).map((c) => (
              <label key={c} className="space-y-1">
                <span className="text-xs font-medium text-on-surface-variant">VAT {c} %</span>
                <NumberInput
                  value={draft.settings.vat[c]}
                  max={100}
                  onChange={(v) => edit((d) => ({ ...d, settings: { ...d.settings, vat: { ...d.settings.vat, [c]: v } } }))}
                />
              </label>
            ))}
          </div>
        </RailSection>
      </section>

      <section className="space-y-3 rounded-[1rem] bg-surface-container-lowest p-5">
        <RailSection title="Services" hint="Price 0 means “priced per deal”. Unticked services are hidden from the builder.">
          <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className={th}>Active</th>
                  <th className={th}>Category</th>
                  <th className={th}>Service</th>
                  <th className={th}>Price (USD)</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {draft.services.map((s, i) => (
                  <tr key={s._id ?? `${s.code}-${i}`} className="border-t border-outline-variant/20">
                    <td className={`${td} text-center`}>
                      <input type="checkbox" aria-label="Active" checked={s.active} onChange={(e) => setService(i, { active: e.target.checked })} />
                    </td>
                    <td className={`${td} w-40`}>
                      <input className={fieldCls} value={s.category} aria-label="Category" onChange={(e) => setService(i, { category: e.target.value })} />
                    </td>
                    <td className={td}>
                      <input className={fieldCls} value={s.name} aria-label="Service" onChange={(e) => setService(i, { name: e.target.value })} />
                    </td>
                    <td className={`${td} w-32`}>
                      <NumberInput value={s.price} ariaLabel="Price" onChange={(v) => setService(i, { price: v })} />
                    </td>
                    <td className={`${td} w-10`}>
                      <RemoveButton label="Remove service" onClick={() => edit((d) => ({ ...d, services: d.services.filter((_, j) => j !== i) }))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => edit((d) => ({ ...d, services: [...d.services, { code: '', category: 'Services', name: 'New service', price: 0, active: true }] }))}
          >
            <Plus /> Service
          </Button>
        </RailSection>
      </section>

      <section className="space-y-3 rounded-[1rem] bg-surface-container-lowest p-5">
        <RailSection
          title="Microsoft SKUs (USD per user / month)"
          hint="Public list prices, annual commitment. Check them against the current Partner Center price list and paste the SKU codes from it."
        >
          <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className={th}>Active</th>
                  <th className={th}>Family</th>
                  <th className={th}>Product</th>
                  <th className={th}>SKU code</th>
                  <th className={th}>$ / user / mo</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {draft.skus.map((s, i) => (
                  <tr key={s._id ?? `${s.code}-${i}`} className="border-t border-outline-variant/20">
                    <td className={`${td} text-center`}>
                      <input type="checkbox" aria-label="Active" checked={s.active} onChange={(e) => setSku(i, { active: e.target.checked })} />
                    </td>
                    <td className={`${td} w-40`}>
                      <input className={fieldCls} value={s.family} aria-label="Family" onChange={(e) => setSku(i, { family: e.target.value })} />
                    </td>
                    <td className={td}>
                      <input className={fieldCls} value={s.name} aria-label="Product" onChange={(e) => setSku(i, { name: e.target.value })} />
                    </td>
                    <td className={`${td} w-48`}>
                      <input className={fieldCls} value={s.skuCode} aria-label="SKU code" placeholder="from the price list" onChange={(e) => setSku(i, { skuCode: e.target.value })} />
                    </td>
                    <td className={`${td} w-28`}>
                      <NumberInput value={s.pricePerUserMonth} ariaLabel="Price per user per month" onChange={(v) => setSku(i, { pricePerUserMonth: v })} />
                    </td>
                    <td className={`${td} w-10`}>
                      <RemoveButton label="Remove SKU" onClick={() => edit((d) => ({ ...d, skus: d.skus.filter((_, j) => j !== i) }))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => edit((d) => ({ ...d, skus: [...d.skus, { code: '', family: 'Dynamics 365 F&O', name: 'New SKU', skuCode: '', pricePerUserMonth: 0, active: true }] }))}
          >
            <Plus /> SKU
          </Button>
        </RailSection>
      </section>
    </div>
  );
}
