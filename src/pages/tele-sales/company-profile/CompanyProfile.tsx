import { useEffect, useState } from 'react';
import { Building2, Globe, Mail, Phone, MapPin, MessageCircle, Save, Info } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCompanySettings, updateCompanySettings } from '@/redux/slices/salesAssistantSlice';
import { isSystemAdmin } from '@/lib/teleSalesRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CompanySettingsInput, CompanySocial } from '@/types/salesAssistant.types';

const SOCIAL_FIELDS: Array<{ key: keyof CompanySocial; label: string; placeholder: string }> = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/…' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@…' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@…' },
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/…' },
];

const emptyForm = (): CompanySettingsInput => ({
  name: '', tagline: '', phone: '', whatsapp: '', email: '', website: '', address: '',
  social: { facebook: '', instagram: '', linkedin: '', tiktok: '', youtube: '', x: '' },
});

/**
 * Our own company's contact card — the {{company.*}} values in every template.
 * Editable by super admins; read-only reference for everyone else.
 */
export default function CompanyProfile() {
  const dispatch = useAppDispatch();
  const { companySettings, companySettingsLoading } = useAppSelector((s) => s.salesAssistant);
  const user = useAppSelector((s) => s.auth.user);
  // Catalog writes are admin-only on the API
  const isAdmin = isSystemAdmin(user);
  const [form, setForm] = useState<CompanySettingsInput>(emptyForm());
  const [dirty, setDirty] = useState(false);

  useEffect(() => { dispatch(fetchCompanySettings()); }, [dispatch]);

  useEffect(() => {
    if (!companySettings) return;
    setForm({
      name: companySettings.name ?? '',
      tagline: companySettings.tagline ?? '',
      phone: companySettings.phone ?? '',
      whatsapp: companySettings.whatsapp ?? '',
      email: companySettings.email ?? '',
      website: companySettings.website ?? '',
      address: companySettings.address ?? '',
      social: { ...emptyForm().social, ...(companySettings.social ?? {}) },
    });
    setDirty(false);
  }, [companySettings]);

  const set = <K extends keyof CompanySettingsInput>(key: K, value: CompanySettingsInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const setSocial = (key: keyof CompanySocial, value: string) => {
    setForm((f) => ({ ...f, social: { ...f.social, [key]: value } }));
    setDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(updateCompanySettings(form)).unwrap();
      setDirty(false);
    } catch {
      // toast shown by the slice
    }
  };

  const field = (
    id: string, label: string, key: Exclude<keyof CompanySettingsInput, 'social' | 'logo'>, icon: React.ReactNode, placeholder: string, type = 'text',
  ) => (
    <div>
      <label htmlFor={id} className="form-label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">{icon}</span>
        <Input id={id} type={type} value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} disabled={!isAdmin} className="pl-9" />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="display-sm text-on-surface">Company Profile</h1>
        <p className="text-on-surface-variant mt-1">Contact details and social links used in every email and WhatsApp template.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Company</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('c-name', 'Company name', 'name', <Building2 className="w-4 h-4" />, 'GrowPath')}
            {field('c-tagline', 'Tagline', 'tagline', <Info className="w-4 h-4" />, 'Your Digital Partner')}
          </div>
          <div>
            <label htmlFor="c-address" className="form-label">Address</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-on-surface-variant"><MapPin className="w-4 h-4" /></span>
              <Textarea id="c-address" rows={2} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} disabled={!isAdmin} className="pl-9" placeholder="Street, city, country" />
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('c-phone', 'Phone', 'phone', <Phone className="w-4 h-4" />, '+20 2 0000 0000', 'tel')}
            {field('c-whatsapp', 'WhatsApp', 'whatsapp', <MessageCircle className="w-4 h-4" />, '+20 100 000 0000', 'tel')}
            {field('c-email', 'Email', 'email', <Mail className="w-4 h-4" />, 'sales@company.com', 'email')}
            {field('c-website', 'Website', 'website', <Globe className="w-4 h-4" />, 'https://company.com', 'url')}
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Social media</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SOCIAL_FIELDS.map((s) => (
              <div key={s.key}>
                <label htmlFor={`c-${s.key}`} className="form-label">{s.label}</label>
                <Input id={`c-${s.key}`} type="url" value={form.social[s.key] ?? ''} onChange={(e) => setSocial(s.key, e.target.value)} placeholder={s.placeholder} disabled={!isAdmin} />
              </div>
            ))}
          </div>
        </section>

        {isAdmin ? (
          <div className="flex items-center justify-end gap-3">
            {dirty && <span className="text-xs text-on-surface-variant">Unsaved changes</span>}
            <Button type="submit" disabled={companySettingsLoading || !dirty} className="gap-2">
              <Save className="w-4 h-4" /> {companySettingsLoading ? 'Saving…' : 'Save'}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant">Only a super admin can edit the company profile.</p>
        )}
      </form>
    </div>
  );
}
