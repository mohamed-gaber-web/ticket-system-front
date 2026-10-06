import { useEffect, useState } from 'react';
import { Building2, User } from 'lucide-react';
import * as teleSalesApi from '@/api/teleSalesApi';
import { SearchSelect } from '@/components/ui/search-select';
import type { AccountRef, AccountContact } from '@/types/teleSales.types';

interface ExistingCustomerFieldsProps {
  isExisting: boolean;
  account: string;
  accountContact: string;
  onToggle: (existing: boolean) => void;
  /** A company was picked (or cleared); the form copies its name. */
  onAccount: (account: AccountRef | null) => void;
  /** A contact was picked (or cleared); the form copies their details. */
  onContact: (contact: AccountContact | null) => void;
}

/**
 * "Is Existing Customer?" — Yes shows the Company (account) lookup and, filtered
 * by it, the Contact who asked for the lead. No hides both and the lead is typed
 * in by hand. Picking either hands the record up so the form auto-populates.
 */
export function ExistingCustomerFields({
  isExisting, account, accountContact, onToggle, onAccount, onContact,
}: ExistingCustomerFieldsProps) {
  const [accounts, setAccounts] = useState<AccountRef[]>([]);
  const [contacts, setContacts] = useState<AccountContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Companies load the first time "Yes" is chosen.
  useEffect(() => {
    if (!isExisting || accounts.length) return;
    teleSalesApi.getLeadAccounts().then((r) => setAccounts(r.data)).catch(() => setAccounts([]));
  }, [isExisting]); // eslint-disable-line react-hooks/exhaustive-deps

  // The contact list depends on the company.
  useEffect(() => {
    if (!isExisting || !account) { setContacts([]); return; }
    let alive = true;
    setLoadingContacts(true);
    teleSalesApi.getLeadAccountContacts(account)
      .then((r) => { if (alive) setContacts(r.data); })
      .catch(() => { if (alive) setContacts([]); })
      .finally(() => { if (alive) setLoadingContacts(false); });
    return () => { alive = false; };
  }, [isExisting, account]);

  const choice = (value: boolean, label: string) => (
    <label className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm cursor-pointer transition-colors ${
      isExisting === value ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-outline-variant text-on-surface hover:bg-surface-container'
    }`}>
      <input type="radio" name="isExistingCustomer" className="accent-primary" checked={isExisting === value} onChange={() => onToggle(value)} />
      {label}
    </label>
  );

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-on-surface mb-1.5">Is Existing Customer?</legend>
        <div className="flex gap-2">
          {choice(true, 'Yes')}
          {choice(false, 'No')}
        </div>
      </fieldset>

      {isExisting && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SearchSelect
            label="Company / Account *"
            icon={<Building2 className="w-4 h-4" />}
            placeholder={accounts.length ? 'Select the company' : 'Loading companies…'}
            value={account}
            options={accounts.map((a) => ({ value: a._id, label: a.name }))}
            onChange={(id) => onAccount(accounts.find((a) => a._id === id) ?? null)}
          />
          <SearchSelect
            label="Contact / Requested by"
            icon={<User className="w-4 h-4" />}
            disabled={!account}
            placeholder={!account ? 'Select the company first' : loadingContacts ? 'Loading…' : contacts.length ? 'Select the contact' : 'No contacts for this company'}
            value={accountContact}
            allLabel={account && contacts.length ? '— No contact —' : undefined}
            options={contacts.map((c) => ({ value: c._id, label: c.contactPerson, sub: [c.email, c.phone].filter(Boolean).join(' · ') || undefined }))}
            onChange={(id) => onContact(contacts.find((c) => c._id === id) ?? null)}
          />
          <p className="sm:col-span-2 text-xs text-on-surface-variant">
            Picking the company and contact fills in the company name, contact person, email, phone, address and country below — check and adjust them if needed.
          </p>
        </div>
      )}
    </div>
  );
}
