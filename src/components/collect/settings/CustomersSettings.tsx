import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged } from '@/redux/slices/collectSlice';
import { createCollectCustomer, getCollectCustomers, removeCollectCustomer, updateCollectCustomer } from '@/api/collectApi';
import { CURRENCIES, CURRENCY_LABELS, apiError } from '@/lib/collect';
import { ConfirmButton, EmptyState, ErrorState, Field, INPUT, Loading, Modal, Panel, Select, TableBox, TD, TDN, TH } from '@/components/collect/CollectUi';
import type { Currency, Customer, CustomerInput } from '@/types/collect.types';

const blank = (): CustomerInput => ({
  name: '',
  contactName: '',
  email: '',
  country: 'Egypt',
  currency: 'EGP',
  accountManager: '',
  legalForm: '',
  cr: '',
  crOffice: '',
  taxNo: '',
  address: '',
  signer: '',
  signerTitle: '',
});

const inputOf = (c: Customer): CustomerInput => ({
  name: c.name,
  contactName: c.contactName ?? '',
  email: c.email ?? '',
  country: c.country ?? '',
  currency: c.currency ?? 'EGP',
  accountManager: c.accountManager ?? '',
  legalForm: c.legalForm ?? '',
  cr: c.cr ?? '',
  crOffice: c.crOffice ?? '',
  taxNo: c.taxNo ?? '',
  address: c.address ?? '',
  signer: c.signer ?? '',
  signerTitle: c.signerTitle ?? '',
});

const FIELDS: { key: keyof CustomerInput; label: string; wide?: boolean }[] = [
  { key: 'contactName', label: 'Contact person' },
  { key: 'email', label: 'E-mail' },
  { key: 'country', label: 'Country' },
  { key: 'accountManager', label: 'Account manager' },
  { key: 'legalForm', label: 'Legal form' },
  { key: 'cr', label: 'Commercial registration no.' },
  { key: 'crOffice', label: 'Commercial registry office' },
  { key: 'taxNo', label: 'Tax ID' },
  { key: 'signer', label: 'Signatory name' },
  { key: 'signerTitle', label: 'Signatory title' },
  { key: 'address', label: 'Address', wide: true },
];

function CustomerDialog({ open, customer, onClose, onSaved }: { open: boolean; customer: Customer | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<CustomerInput>(blank);
  const [saving, setSaving] = useState(false);
  // The name is the ticketing company's own; only admins rename it (the API enforces it).
  const canAdmin = useAppSelector((s) => s.collect.meta?.canAdmin ?? false);
  const nameLocked = !!customer && !canAdmin;

  useEffect(() => {
    if (open) setF(customer ? inputOf(customer) : blank());
  }, [open, customer]);

  const set = <K extends keyof CustomerInput>(k: K, v: CustomerInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!f.name.trim()) {
      toast.error('Enter the customer name');
      return;
    }
    setSaving(true);
    try {
      if (customer) await updateCollectCustomer(customer.id, f);
      else await createCollectCustomer(f);
      toast.success('Customer saved');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Could not save the customer'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={customer ? `Edit customer — ${customer.name}` : 'New customer'}
      description="The legal details are printed in the contract’s parties section."
      footer={
        <>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Save
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Customer name"
          htmlFor="cu-name"
          required
          hint={nameLocked ? 'Only administrators can rename a company' : 'If a ticketing company has this name, it is added to the Collect list'}
        >
          <input id="cu-name" className={INPUT} value={f.name} disabled={nameLocked} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Currency" htmlFor="cu-cur">
          <Select id="cu-cur" value={f.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c} — {CURRENCY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        {FIELDS.map((x) => (
          <Field key={x.key} label={x.label} htmlFor={`cu-${x.key}`} className={x.wide ? 'sm:col-span-2' : undefined}>
            <input id={`cu-${x.key}`} className={INPUT} value={f[x.key]} onChange={(e) => set(x.key, e.target.value as never)} />
          </Field>
        ))}
      </div>
    </Modal>
  );
}

/** Settings › Customers — open to every module user. */
export function CustomersSettings() {
  const dispatch = useAppDispatch();
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | null | 'new'>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await getCollectCustomers());
    } catch (e) {
      setError(apiError(e, 'Could not load the customers'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = () => {
    void load();
    void dispatch(collectChanged());
  };

  const remove = async (c: Customer) => {
    try {
      await removeCollectCustomer(c.id);
      toast.success('Customer removed from the Collect list');
      changed();
    } catch (e) {
      toast.error(apiError(e, 'Could not remove the customer'));
    }
  };

  return (
    <Panel
      title="Customers"
      hint="Customers are the ticketing system’s companies; removing one here only takes it off the Collect list and never deletes the company."
      action={
        <Button onClick={() => setEditing('new')}>
          <Plus /> New customer
        </Button>
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title="No customers yet" hint="Add a customer, or pick a company when creating a new contract." />
      ) : (
        <TableBox>
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-outline-variant/40">
              <tr>
                <th className={TH}>Customer</th>
                <th className={TH}>Country</th>
                <th className={TH}>Currency</th>
                <th className={TH}>Contact</th>
                <th className={TH}>E-mail</th>
                <th className={TH}>Account manager</th>
                <th className={TH}>Contracts</th>
                <th className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className={`${TD} font-semibold text-on-surface`}>{c.name}</td>
                  <td className={TD}>{c.country || '—'}</td>
                  <td className={TD}>{c.currency}</td>
                  <td className={TD}>{c.contactName || '—'}</td>
                  <td className={TD}>
                    {c.email ? <span>{c.email}</span> : <span className="text-amber-700 dark:text-amber-300">(no e-mail)</span>}
                  </td>
                  <td className={TD}>{c.accountManager || '—'}</td>
                  <td className={TDN}>{c.contractCount ?? 0}</td>
                  <td className={TD}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                        <Pencil /> Edit
                      </Button>
                      <span title={c.contractCount ? 'A customer with contracts can’t be removed' : undefined}>
                        <ConfirmButton onConfirm={() => remove(c)} disabled={!!c.contractCount} />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableBox>
      )}
      <CustomerDialog open={editing !== null} customer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={changed} />
    </Panel>
  );
}
