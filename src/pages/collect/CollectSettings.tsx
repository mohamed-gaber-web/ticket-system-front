import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { COLLECT_BASE, CollectLayout } from '@/components/collect/CollectLayout';
import { GeneralSettings } from '@/components/collect/settings/GeneralSettings';
import { DocumentSettings } from '@/components/collect/settings/DocumentSettings';
import { TypesSettings } from '@/components/collect/settings/TypesSettings';
import { CustomersSettings } from '@/components/collect/settings/CustomersSettings';
import { RulesSettings } from '@/components/collect/settings/RulesSettings';
import { TemplatesSettings } from '@/components/collect/settings/TemplatesSettings';
import { DataSettings } from '@/components/collect/settings/DataSettings';
import { useAppSelector } from '@/redux/hooks/hooks';

const SECTIONS = [
  { key: 'general', label: 'General' },
  { key: 'document', label: 'Contract PDF template' },
  { key: 'types', label: 'Contract types' },
  { key: 'customers', label: 'Customers' },
  { key: 'rules', label: 'Reminder rules' },
  { key: 'templates', label: 'Email templates' },
  { key: 'data', label: 'Data', adminOnly: true },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

/** Settings (§9.9): `/finance/collect/settings/:section`. */
export default function CollectSettings() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const canAdmin = useAppSelector((s) => !!s.collect.meta?.canAdmin);
  const visible = SECTIONS.filter((s) => !('adminOnly' in s) || canAdmin);
  const current: SectionKey = (visible.find((s) => s.key === section)?.key ?? 'general') as SectionKey;

  return (
    <CollectLayout>
      <nav aria-label="Settings sections" className="-mx-1 overflow-x-auto">
        <div className="flex min-w-max gap-1.5 px-1">
          {visible.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-current={current === s.key ? 'page' : undefined}
              onClick={() => navigate(`${COLLECT_BASE}/settings/${s.key}`)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-[2px] focus-visible:ring-primary/40',
                current === s.key ? 'bg-primary text-primary-foreground' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>
      {current === 'general' && <GeneralSettings />}
      {current === 'document' && <DocumentSettings />}
      {current === 'types' && <TypesSettings />}
      {current === 'customers' && <CustomersSettings />}
      {current === 'rules' && <RulesSettings />}
      {current === 'templates' && <TemplatesSettings />}
      {current === 'data' && <DataSettings />}
    </CollectLayout>
  );
}
