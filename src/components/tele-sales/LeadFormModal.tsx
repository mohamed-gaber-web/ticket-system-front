import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createLead, updateLead } from '@/redux/slices/teleSalesLeadsSlice';
import { fetchAgents } from '@/redux/slices/teleSalesAgentsSlice';
import { fetchIndustrySectors } from '@/redux/slices/industrySectorSlice';
import { fetchCountries } from '@/redux/slices/countrySlice';
import { fetchBusinessClassifications } from '@/redux/slices/businessClassificationSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Building2, MapPin, Phone, ClipboardList, StickyNote, Tags, ChevronDown, X } from 'lucide-react';
import { LEAD_STATUSES, type LeadStatus } from '@/config/leadStatusWorkflow';
import type {
  Lead, LeadPriority, LeadSource, CreateLeadData, EntityType, IndustrySector, SalesType,
} from '@/types/teleSales.types';
import { ENTITY_TYPES, INDUSTRY_SECTORS, SALES_TYPES, LEAD_SOURCE_DETAILS, isValidUrl } from '@/types/teleSales.types';
import { dialCodeForCountry, isValidPhoneForCountry } from '@/utils/countryPhone';

const LEAD_SOURCES: LeadSource[] = ['LinkedIn', 'Website', 'Referral', 'Cold Call', 'Exhibition', 'Partner', 'Other'];

/** Fields the lead form requires on both add and update (mirrors the backend). */
const REQUIRED_FIELDS: { key: keyof CreateLeadData; label: string }[] = [
  { key: 'companyName', label: 'Company name' },
  { key: 'contactPersonName', label: 'Contact person' },
  { key: 'phonePrimary', label: 'Phone (primary)' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'leadSource', label: 'Lead source' },
];

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

// Shared field styling so inputs, selects and textareas read as one system.
const selectCls =
  'h-10 w-full appearance-none cursor-pointer rounded-[0.5rem] bg-surface-container-high border-none pl-3 pr-9 text-sm text-on-surface outline-none transition-all focus-visible:ring-[2px] focus-visible:ring-primary/40';
const textareaCls =
  'w-full rounded-[0.5rem] bg-surface-container-high border-none px-3 py-2.5 text-sm text-on-surface outline-none transition-all resize-none focus-visible:ring-[2px] focus-visible:ring-primary/40';

/** A titled, iconed card that groups related fields in the lead form. */
function SectionCard({
  icon, title, subtitle, children,
}: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">{icon}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-on-surface leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** A labelled form field with optional required marker and helper hint. */
function Field({
  label, required, hint, className = '', children,
}: { label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-on-surface mb-1.5 block">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-on-surface-variant mt-1">{hint}</p>}
    </div>
  );
}

/** A native select wrapped with a chevron, styled to match the Input component. */
function SelectField({
  value, onChange, children,
}: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} className={selectCls}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
    </div>
  );
}

const emptyForm: CreateLeadData = {
  companyName: '',
  contactPersonName: '',
  email: '',
  jobTitle: '',
  industry: '',
  salesType: 'Lead',
  entityType: undefined,
  businessClassification: '',
  industrySector: undefined,
  country: 'Egypt',
  fullAddress: '',
  phonePrimary: '',
  phoneSecondary: '',
  phoneOther: '',
  website: '',
  dataSource: '',
  leadSource: undefined,
  leadSourceDetail: '',
  assignedTo: '',
  priority: 'Medium',
  potentialValue: undefined,
  status: 'New Lead',
  painPoints: '',
  customerNeeds: '',
  budget: '',
  isDecisionMaker: false,
  tags: [],
};

const buildFormFromLead = (lead: Lead): CreateLeadData => ({
  companyName: lead.companyName,
  contactPersonName: lead.contactPersonName,
  email: lead.email || '',
  jobTitle: lead.jobTitle || '',
  industry: lead.industry || '',
  salesType: lead.salesType || 'Lead',
  entityType: lead.entityType,
  businessClassification: lead.businessClassification || '',
  industrySector: lead.industrySector,
  country: lead.country || 'Egypt',
  fullAddress: lead.fullAddress || '',
  phonePrimary: lead.phonePrimary || '',
  phoneSecondary: lead.phoneSecondary || '',
  phoneOther: lead.phoneOther || '',
  website: lead.website || '',
  dataSource: lead.dataSource || '',
  leadSource: lead.leadSource,
  leadSourceDetail: lead.leadSourceDetail || '',
  assignedTo: (lead.assignedTo as any)?._id || '',
  priority: lead.priority,
  potentialValue: lead.potentialValue,
  status: lead.status,
  painPoints: lead.painPoints || '',
  customerNeeds: lead.customerNeeds || '',
  budget: lead.budget || '',
  isDecisionMaker: lead.isDecisionMaker,
  tags: lead.tags,
});

interface LeadFormModalProps {
  open: boolean;
  /** The lead being edited, or null/undefined for "create a new lead". */
  lead?: Lead | null;
  /** Sales type new leads default to (mirrors the locked "Opportunities" tab). */
  defaultSalesType?: SalesType;
  onClose: () => void;
  /** Called with the saved lead once create/update succeeds. */
  onSaved?: (lead: Lead) => void;
}

/** Create/edit lead form, shared by the Leads table and the lead detail page. */
export function LeadFormModal({ open, lead, defaultSalesType, onClose, onSaved }: LeadFormModalProps) {
  const dispatch = useAppDispatch();
  const { agents } = useAppSelector((s) => s.teleSalesAgents);
  const { industrySectors } = useAppSelector((s) => s.industrySectors);
  const { countries } = useAppSelector((s) => s.countries);
  const { businessClassifications } = useAppSelector((s) => s.businessClassifications);
  const { user } = useAppSelector((s) => s.auth);
  const isAdmin = (user as any)?.role === 'admin';

  const sectorOptions = industrySectors.length
    ? industrySectors.filter((s) => s.isActive).map((s) => s.name)
    : [...INDUSTRY_SECTORS];
  const countryOptions = countries.length
    ? countries.filter((c) => c.isActive).map((c) => c.name)
    : ['Egypt'];
  const classificationOptions = businessClassifications
    .filter((c) => c.isActive)
    .map((c) => c.name);

  const [form, setForm] = useState<CreateLeadData>(emptyForm);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Re-seed the form every time the modal opens, for the lead it was opened with.
  useEffect(() => {
    if (!open) return;
    setForm(lead ? buildFormFromLead(lead) : { ...emptyForm, salesType: defaultSalesType ?? emptyForm.salesType });
    setTagInput('');
  }, [open, lead, defaultSalesType]);

  // Load the lookup lists the dropdowns need. Cheap enough to refetch per open.
  useEffect(() => {
    if (!open) return;
    if (isAdmin) dispatch(fetchAgents(undefined));
    dispatch(fetchIndustrySectors({ limit: 1000 }));
    dispatch(fetchCountries({ limit: 1000 }));
    dispatch(fetchBusinessClassifications({ limit: 1000 }));
  }, [open, isAdmin, dispatch]);

  // Which follow-up field (if any) the currently selected lead source asks for.
  const sourceDetailSpec = form.leadSource ? LEAD_SOURCE_DETAILS[form.leadSource] : undefined;

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags?.includes(t)) {
      setForm((p) => ({ ...p, tags: [...(p.tags || []), t] }));
      setTagInput('');
    }
  };
  const removeTag = (t: string) => setForm((p) => ({ ...p, tags: p.tags?.filter((x) => x !== t) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mandatory on both add and update — mirrors the backend's required-field check.
    const missing = REQUIRED_FIELDS.filter(({ key }) => !String(form[key] ?? '').trim());
    if (missing.length > 0) {
      toast.error(`${missing.map((m) => m.label).join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`);
      return;
    }
    if (!EMAIL_REGEX.test(form.email!.trim())) {
      toast.error('Enter a valid email address');
      return;
    }
    // Each lead source asks for one follow-up detail (referrer name, LinkedIn URL,
    // cold-call data source, exhibition name, partner name). Website / Other ask
    // for none, so `sourceDetailSpec` is undefined and the field isn't rendered.
    const detailSpec = form.leadSource ? LEAD_SOURCE_DETAILS[form.leadSource] : undefined;
    const detail = form.leadSourceDetail?.trim() || '';
    if (detailSpec) {
      if (!detail) {
        toast.error(`${detailSpec.label} is required for the "${form.leadSource}" lead source`);
        return;
      }
      if (detailSpec.type === 'url' && !isValidUrl(detail)) {
        toast.error('Enter a valid LinkedIn URL (e.g. https://linkedin.com/in/jane-doe)');
        return;
      }
    }
    // Phone_Primary is stored as entered and validated leniently so numbers from
    // any country are accepted (KSA, Bahrain, USA, …). Include the country code
    // for non-Egypt numbers.
    const primary = form.phonePrimary?.trim() || '';
    // Validate against the selected country's rules (falls back to a lenient
    // international check for countries not in the built-in table).
    if (!isValidPhoneForCountry(primary, form.country)) {
      const dc = dialCodeForCountry(form.country);
      toast.error(
        form.country && dc
          ? `Enter a valid ${form.country} phone number (dialing code ${dc})`
          : 'Enter a valid phone number (include the country code, e.g. +966 5X XXX XXXX)'
      );
      return;
    }
    const payload = { ...form, phonePrimary: primary, leadSourceDetail: detailSpec ? detail : '' };
    if (!payload.assignedTo) delete payload.assignedTo;
    if (!payload.potentialValue) delete payload.potentialValue;

    setSubmitting(true);
    try {
      if (lead) {
        // Status changes go exclusively through the "Change Status" workflow now
        // (see LeadDetail's StatusChangeModal) — the edit form no longer sends it.
        delete (payload as any).status;
        const action = await dispatch(updateLead({ id: lead._id, data: payload }));
        if (updateLead.fulfilled.match(action)) onSaved?.(action.payload);
      } else {
        const action = await dispatch(createLead(payload));
        if (createLead.fulfilled.match(action)) onSaved?.(action.payload);
      }
    } finally {
      setSubmitting(false);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-outline-variant/30">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-outline-variant/20 bg-surface-container-lowest">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-on-surface truncate">{lead ? 'Edit Lead' : 'New Lead'}</h2>
              {lead?.customerId && (
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant">{lead.customerId}</span>
              )}
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {lead ? 'Update this lead’s details' : 'A customer ID is assigned automatically on save'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="lead-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
          <SectionCard icon={<Building2 className="w-5 h-5" />} title="Business Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company Name" required>
                <Input value={form.companyName} onChange={(e) => setForm(p => ({ ...p, companyName: e.target.value }))} placeholder="Acme Corp" />
              </Field>
              <Field label="Contact Person" required>
                <Input value={form.contactPersonName} onChange={(e) => setForm(p => ({ ...p, contactPersonName: e.target.value }))} placeholder="John Doe" />
              </Field>
              <Field label="Job Title">
                <Input value={form.jobTitle} onChange={(e) => setForm(p => ({ ...p, jobTitle: e.target.value }))} placeholder="CEO" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={<MapPin className="w-5 h-5" />} title="Classification & Location">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Entity Type">
                <SelectField value={form.entityType || ''} onChange={(e) => setForm(p => ({ ...p, entityType: (e.target.value as EntityType) || undefined }))}>
                  <option value="">Select type</option>
                  {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </SelectField>
              </Field>
              <Field label="Industry Sector">
                <SelectField value={form.industrySector || ''} onChange={(e) => setForm(p => ({ ...p, industrySector: (e.target.value as IndustrySector) || undefined }))}>
                  <option value="">Select sector</option>
                  {(form.industrySector && !sectorOptions.includes(form.industrySector)
                    ? [form.industrySector, ...sectorOptions]
                    : sectorOptions
                  ).map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectField>
              </Field>
              <Field label="Business Classification" className="sm:col-span-2" hint="Specific activity — managed from Modules ▸ Business Classifications.">
                <SelectField value={form.businessClassification || ''} onChange={(e) => setForm(p => ({ ...p, businessClassification: e.target.value }))}>
                  <option value="">Select classification</option>
                  {(form.businessClassification && !classificationOptions.includes(form.businessClassification)
                    ? [form.businessClassification, ...classificationOptions]
                    : classificationOptions
                  ).map((c) => <option key={c} value={c}>{c}</option>)}
                </SelectField>
              </Field>
              <Field label="Country">
                <SelectField value={form.country || ''} onChange={(e) => setForm(p => ({ ...p, country: e.target.value }))}>
                  <option value="">Select country</option>
                  {(form.country && !countryOptions.includes(form.country)
                    ? [form.country, ...countryOptions]
                    : countryOptions
                  ).map((c) => <option key={c} value={c}>{c}</option>)}
                </SelectField>
              </Field>
              <Field label="Full Address">
                <Input value={form.fullAddress} onChange={(e) => setForm(p => ({ ...p, fullAddress: e.target.value }))} placeholder="Cleaned street address" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={<Phone className="w-5 h-5" />} title="Contact">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Phone — Primary"
                required
                hint={dialCodeForCountry(form.country)
                  ? `${form.country} dialing code ${dialCodeForCountry(form.country)} — enter the local number or the full ${dialCodeForCountry(form.country)} form`
                  : undefined}
              >
                <Input value={form.phonePrimary} onChange={(e) => setForm(p => ({ ...p, phonePrimary: e.target.value }))} />
              </Field>
              <Field label="Phone — Secondary">
                <Input value={form.phoneSecondary} onChange={(e) => setForm(p => ({ ...p, phoneSecondary: e.target.value }))} placeholder="Secondary number" />
              </Field>
              <Field label="Phone — Other" hint="Hotlines, 0800 toll-free numbers.">
                <Input value={form.phoneOther} onChange={(e) => setForm(p => ({ ...p, phoneOther: e.target.value }))} placeholder="19XXX, 0800 XXX XXXX" />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
              </Field>
              <Field label="Website" required className="sm:col-span-2">
                <Input value={form.website} onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://example.com" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={<ClipboardList className="w-5 h-5" />} title="Lead Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Sales Type" hint="Lead = unqualified, Opportunity = qualified.">
                <SelectField value={form.salesType || 'Lead'} onChange={(e) => setForm(p => ({ ...p, salesType: e.target.value as SalesType }))}>
                  {SALES_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </SelectField>
              </Field>
              <Field label="Lead Source" required>
                <SelectField
                  value={form.leadSource || ''}
                  onChange={(e) => setForm(p => ({
                    ...p,
                    leadSource: e.target.value as LeadSource || undefined,
                    // A detail belongs to the source it was entered under, so
                    // switching source always starts the follow-up field empty.
                    leadSourceDetail: '',
                  }))}
                >
                  <option value="">Select source</option>
                  {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectField>
              </Field>
              {sourceDetailSpec && (
                <Field label={sourceDetailSpec.label} required className="sm:col-span-2">
                  <Input
                    type={sourceDetailSpec.type === 'url' ? 'url' : 'text'}
                    value={form.leadSourceDetail}
                    onChange={(e) => setForm(p => ({ ...p, leadSourceDetail: e.target.value }))}
                    placeholder={sourceDetailSpec.placeholder}
                  />
                </Field>
              )}
              <Field label="Priority">
                <SelectField value={form.priority || 'Medium'} onChange={(e) => setForm(p => ({ ...p, priority: e.target.value as LeadPriority }))}>
                  {(['High', 'Medium', 'Low'] as LeadPriority[]).map((pv) => <option key={pv} value={pv}>{pv}</option>)}
                </SelectField>
              </Field>
              {!lead && (
                <Field label="Status">
                  <SelectField value={form.status || 'New Lead'} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as LeadStatus }))}>
                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </SelectField>
                </Field>
              )}
              <Field label="Potential Value">
                <Input type="number" value={form.potentialValue || ''} onChange={(e) => setForm(p => ({ ...p, potentialValue: e.target.value ? Number(e.target.value) : undefined }))} placeholder="0" />
              </Field>
              {isAdmin && (
                <Field label="Assign To">
                  <SelectField value={form.assignedTo || ''} onChange={(e) => setForm(p => ({ ...p, assignedTo: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {agents.filter((a) => a.status === 'active').map((a) => (
                      <option key={a._id} value={a._id}>{a.firstName} {a.lastName}</option>
                    ))}
                  </SelectField>
                </Field>
              )}
              <Field label="Data Source" hint="Originating file, for auditing.">
                <Input value={form.dataSource} onChange={(e) => setForm(p => ({ ...p, dataSource: e.target.value }))} placeholder="e.g. hotels_alex_2024.xlsx" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={<StickyNote className="w-5 h-5" />} title="Notes & Insights">
            <div className="space-y-4">
              <Field label="Pain Points">
                <textarea value={form.painPoints} onChange={(e) => setForm(p => ({ ...p, painPoints: e.target.value }))}
                  rows={2} className={textareaCls} placeholder="What challenges does the customer face?" />
              </Field>
              <Field label="Customer Needs">
                <textarea value={form.customerNeeds} onChange={(e) => setForm(p => ({ ...p, customerNeeds: e.target.value }))}
                  rows={2} className={textareaCls} placeholder="What does the customer need?" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Budget">
                  <Input value={form.budget} onChange={(e) => setForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. $10,000" />
                </Field>
                <label className="flex items-center gap-3 sm:pt-8 cursor-pointer select-none">
                  <input type="checkbox" checked={!!form.isDecisionMaker} onChange={(e) => setForm(p => ({ ...p, isDecisionMaker: e.target.checked }))} className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-on-surface">Decision Maker</span>
                </label>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<Tags className="w-5 h-5" />} title="Tags">
            <div className="flex gap-2 flex-wrap mb-3">
              {form.tags?.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-error">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(!form.tags || form.tags.length === 0) && <span className="text-xs text-on-surface-variant">No tags yet.</span>}
            </div>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag and press Enter…" className="flex-1" />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>
          </SectionCard>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-outline-variant/20 bg-surface-container-lowest">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="lead-form" disabled={submitting}>
            {submitting ? 'Saving…' : lead ? 'Update Lead' : 'Create Lead'}
          </Button>
        </div>
      </div>
    </div>
  );
}
