import type { SelectHTMLAttributes } from 'react';
import { useAppSelector } from '@/redux/hooks/hooks';
import type { VaultFieldSource } from '@/lib/vaultFields';
import { VaultSelect } from './VaultUi';

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  source: VaultFieldSource;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Overrides the blank option's text (e.g. "All categories" in a filter). */
  emptyLabel?: string;
}

/**
 * A select fed from the vault setup lists: a lookup type, the clients or the
 * employees. Inactive lookups are hidden unless they are the current value.
 */
export function LookupSelect({ source, value, onChange, required, emptyLabel, ...rest }: Props) {
  const { byType, clients, users } = useAppSelector((s) => s.vaultLookups);

  const options: { value: string; label: string }[] =
    source === 'clients'
      ? clients.filter((c) => c.isActive !== false || c._id === value).map((c) => ({ value: c._id, label: c.name }))
      : source === 'users'
        ? users.map((u) => ({ value: u._id, label: u.jobTitle ? `${u.name} — ${u.jobTitle}` : u.name }))
        : (byType[source] ?? [])
            .filter((l) => l.isActive !== false || l._id === value)
            .map((l) => ({ value: l._id, label: l.name }));

  return (
    <VaultSelect value={value} onChange={(e) => onChange(e.target.value)} required={required} {...rest}>
      <option value="">{emptyLabel ?? (required ? '— Select —' : '— Not set —')}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </VaultSelect>
  );
}
