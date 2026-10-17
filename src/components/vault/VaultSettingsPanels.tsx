import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink, Loader2, Pencil, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createClient, createLookup, deleteClient, deleteLookup, updateClient, updateLookup } from '@/redux/slices/vaultLookupsSlice';
import { isEmail } from '@/lib/vault';
import { DUPLICATE_NAME, type LookupPanelDef } from '@/lib/vaultSettings';
import type { VaultClient, VaultClientInput, VaultLookup } from '@/types/vault.types';
import { Chip, ConfirmButton, EmptyState, FieldWithHelp, MissingBox, MonoText } from './VaultUi';

// ── Panel frame + row ───────────────────────────────────────────────────────

function SettingsPanel({
  title,
  count,
  description,
  onAdd,
  children,
}: {
  title: string;
  count: number;
  description: ReactNode;
  onAdd?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-[1rem] bg-surface-container-lowest p-4" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-on-surface">
          {title} <span className="font-semibold text-on-surface-variant">({count})</span>
        </h2>
        {onAdd && (
          <Button size="sm" variant="outline" onClick={onAdd} aria-label={`Add to ${title}`}>
            <Plus /> Add
          </Button>
        )}
      </div>
      <p className="text-xs text-on-surface-variant">{description}</p>
      <div className="max-h-80 overflow-y-auto">{children}</div>
    </section>
  );
}

function ItemRow({
  name,
  sub,
  badges,
  usage,
  onEdit,
  onDelete,
}: {
  name: string;
  sub?: ReactNode;
  badges?: ReactNode;
  usage: number;
  onEdit: () => void;
  onDelete: () => Promise<unknown>;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-outline-variant/20 py-2 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-on-surface">
          <span className="break-words">{name}</span>
          {badges}
        </p>
        {sub && <div className="text-xs text-on-surface-variant">{sub}</div>}
      </div>
      <Chip tone={usage ? 'accent' : 'neutral'}>{usage ? `Used ${usage}` : 'Not used'}</Chip>
      <div className="flex items-center">
        <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${name}`}>
          <Pencil /> Edit
        </Button>
        <ConfirmButton onConfirm={onDelete} ariaLabel={`Delete ${name}`} />
      </div>
    </li>
  );
}

// ── Lookups ─────────────────────────────────────────────────────────────────

export function LookupPanel({ def }: { def: LookupPanelDef }) {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.vaultLookups.byType[def.type]) ?? [];
  const [editing, setEditing] = useState<VaultLookup | 'new' | null>(null);

  const remove = async (item: VaultLookup) => {
    const res = await dispatch(deleteLookup(item._id));
    if (deleteLookup.fulfilled.match(res)) toast.success(`${item.name} deleted`);
    else toast.error((res.payload as string) ?? 'Could not delete the item');
  };

  return (
    <SettingsPanel title={def.title} count={items.length} description={def.description} onAdd={() => setEditing('new')}>
      {items.length ? (
        <ul>
          {items.map((it) => (
            <ItemRow
              key={it._id}
              name={it.name}
              usage={it.usageCount ?? 0}
              badges={
                <>
                  {def.flag && it[def.flag.key] && <Chip tone={def.flag.key === 'requiresApproval' ? 'bad' : 'neutral'}>{def.flag.badge}</Chip>}
                  {it.isActive === false && <Chip>Inactive</Chip>}
                </>
              }
              onEdit={() => setEditing(it)}
              onDelete={() => remove(it)}
            />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-on-surface-variant">Nothing here yet — add the first item.</p>
      )}
      <LookupDialog def={def} item={editing} existing={items} onClose={() => setEditing(null)} />
    </SettingsPanel>
  );
}

function LookupDialog({
  def,
  item,
  existing,
  onClose,
}: {
  def: LookupPanelDef;
  item: VaultLookup | 'new' | null;
  existing: VaultLookup[];
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const editing = item && item !== 'new' ? item : null;
  const [name, setName] = useState('');
  const [flag, setFlag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName(editing?.name ?? '');
    setFlag(def.flag && editing ? !!editing[def.flag.key] : false);
    setError(null);
  }, [item, editing, def.flag]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError('Name is required.');
    if (existing.some((x) => x._id !== editing?._id && x.name.trim().toLowerCase() === n.toLowerCase())) return setError(DUPLICATE_NAME);
    setSaving(true);
    const flags = def.flag ? { [def.flag.key]: flag } : {};
    const res = editing
      ? await dispatch(updateLookup({ id: editing._id, body: { name: n, ...flags } }))
      : await dispatch(createLookup({ type: def.type, name: n, ...flags }));
    setSaving(false);
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Saved');
      onClose();
    } else {
      setError((res.payload as string) ?? 'Could not save the item');
    }
  };

  const idBase = `vault-lk-${def.type}`;
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>{editing ? `Edit ${editing.name}` : `Add to ${def.title}`}</DialogTitle>
          <DialogDescription>{def.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-3">
          <FieldWithHelp id={`${idBase}-name`} label="Name" required help={def.nameHelp ?? 'Shown in every list that uses it.'}>
            <Input
              id={`${idBase}-name`}
              aria-describedby={`${idBase}-name-help`}
              aria-required
              aria-invalid={!!error || undefined}
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          </FieldWithHelp>
          {def.flag && (
            <div className="flex items-start gap-3">
              <Checkbox
                id={`${idBase}-flag`}
                className="mt-0.5"
                checked={flag}
                onCheckedChange={(c) => setFlag(c === true)}
                aria-describedby={`${idBase}-flag-help`}
              />
              <div>
                <label htmlFor={`${idBase}-flag`} className="cursor-pointer text-sm font-semibold text-on-surface">
                  {def.flag.label}
                </label>
                <p id={`${idBase}-flag-help`} className="text-[11px] text-on-surface-variant">
                  {def.flag.help}
                </p>
              </div>
            </div>
          )}
          <MissingBox labels={[]} message={error} />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Clients ─────────────────────────────────────────────────────────────────

const CLIENT_FIELDS: { key: keyof VaultClientInput; label: string; help: string; required?: boolean; mono?: boolean; type?: string }[] = [
  { key: 'name', label: 'Client name', help: "The company's official name.", required: true },
  { key: 'industry', label: 'Industry', help: 'e.g. Manufacturing, Trading, Services.' },
  { key: 'contactName', label: 'Contact person', help: 'The person responsible for the project on their side.' },
  { key: 'contactEmail', label: 'Contact email', help: 'Used by the quick recipient picker on the Send screen.', mono: true, type: 'email' },
  { key: 'contactPhone', label: 'Phone', help: 'Optional.', mono: true, type: 'tel' },
];

const blankClient = (): Required<VaultClientInput> => ({ name: '', industry: '', contactName: '', contactEmail: '', contactPhone: '' });

export function ClientsPanel() {
  const dispatch = useAppDispatch();
  const clients = useAppSelector((s) => s.vaultLookups.clients);
  const [editing, setEditing] = useState<VaultClient | 'new' | null>(null);

  const remove = async (c: VaultClient) => {
    const res = await dispatch(deleteClient(c._id));
    if (deleteClient.fulfilled.match(res)) toast.success(`${c.name} deleted`);
    else toast.error((res.payload as string) ?? 'Could not delete the client');
  };

  return (
    <SettingsPanel
      title="Clients"
      count={clients.length}
      description="The companies we work with (shared with Ticketing's Companies). They fill the Client field of client accounts, and their contact appears in the Send screen's quick recipient picker."
      onAdd={() => setEditing('new')}
    >
      {clients.length ? (
        <ul>
          {clients.map((c) => (
            <ItemRow
              key={c._id}
              name={c.name}
              usage={c.usageCount ?? 0}
              sub={
                c.contactName || c.contactEmail || c.industry ? (
                  <span className="flex flex-wrap gap-x-2">
                    {c.industry && <span>{c.industry}</span>}
                    {c.contactName && <span>{c.contactName}</span>}
                    {c.contactEmail && <MonoText className="text-xs text-on-surface-variant">{c.contactEmail}</MonoText>}
                  </span>
                ) : undefined
              }
              onEdit={() => setEditing(c)}
              onDelete={() => remove(c)}
            />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-center text-sm text-on-surface-variant">No clients yet — add the first one.</p>
      )}
      <ClientDialog client={editing} existing={clients} onClose={() => setEditing(null)} />
    </SettingsPanel>
  );
}

function ClientDialog({ client, existing, onClose }: { client: VaultClient | 'new' | null; existing: VaultClient[]; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const editing = client && client !== 'new' ? client : null;
  const [values, setValues] = useState(blankClient);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!client) return;
    setValues({
      name: editing?.name ?? '',
      industry: editing?.industry ?? '',
      contactName: editing?.contactName ?? '',
      contactEmail: editing?.contactEmail ?? '',
      contactPhone: editing?.contactPhone ?? '',
    });
    setMissing([]);
    setError(null);
  }, [client, editing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const body: VaultClientInput = {
      name: values.name.trim(),
      industry: values.industry.trim(),
      contactName: values.contactName.trim(),
      contactEmail: values.contactEmail.trim(),
      contactPhone: values.contactPhone.trim(),
    };
    if (!body.name) return setMissing(['Client name']);
    setMissing([]);
    if (existing.some((x) => x._id !== editing?._id && x.name.trim().toLowerCase() === body.name.toLowerCase()))
      return setError('A client with this name already exists.');
    if (body.contactEmail && !isEmail(body.contactEmail)) return setError('Enter a valid contact email.');
    setSaving(true);
    const res = editing ? await dispatch(updateClient({ id: editing._id, body })) : await dispatch(createClient(body));
    setSaving(false);
    if (res.meta.requestStatus === 'fulfilled') {
      toast.success('Saved');
      onClose();
    } else {
      setError((res.payload as string) ?? 'Could not save the client');
    }
  };

  return (
    <Dialog open={!!client} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add a client'}</DialogTitle>
          <DialogDescription>Clients are the same companies used in Ticketing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CLIENT_FIELDS.map((f) => {
              const id = `vault-client-${f.key}`;
              return (
                <FieldWithHelp key={f.key} id={id} label={f.label} required={f.required} help={f.help} className={cn(f.key === 'name' && 'sm:col-span-2')}>
                  <Input
                    id={id}
                    type={f.type ?? 'text'}
                    dir={f.mono ? 'ltr' : undefined}
                    className={cn(f.mono && 'font-mono')}
                    aria-describedby={`${id}-help`}
                    aria-required={f.required || undefined}
                    aria-invalid={(f.required && missing.length > 0) || undefined}
                    value={values[f.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                </FieldWithHelp>
              );
            })}
          </div>
          <MissingBox labels={missing} message={error} />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Departments (read-only) ─────────────────────────────────────────────────

export function DepartmentsPanel() {
  const departments = useAppSelector((s) => s.vaultLookups.departments);
  return (
    <SettingsPanel
      title="Company departments"
      count={departments.length}
      description={
        <>
          Read-only. The department of a company account comes from the company&apos;s departments, managed in{' '}
          <Link to="/departments" className="inline-flex items-center gap-0.5 text-primary hover:underline">
            Ticketing &gt; Modules &gt; Departments <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
          .
        </>
      }
    >
      {departments.length ? (
        <ul>
          {departments.map((d) => (
            <li key={d._id} className="border-t border-outline-variant/20 py-2 text-sm font-semibold text-on-surface first:border-t-0">
              {d.name}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No active departments" hint="Add them on the Departments page." />
      )}
    </SettingsPanel>
  );
}

// ── Employees (read-only) ───────────────────────────────────────────────────

export function EmployeesPanel() {
  const users = useAppSelector((s) => s.vaultLookups.users);
  return (
    <SettingsPanel
      title="Company employees"
      count={users.length}
      description={
        <>
          Read-only. Employees are managed in{' '}
          <Link to="/hr/employees" className="inline-flex items-center gap-0.5 text-primary hover:underline">
            HR &gt; Employees <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
          .
        </>
      }
    >
      {users.length ? (
        <ul>
          {users.map((u) => (
            <li key={u._id} className="border-t border-outline-variant/20 py-2 first:border-t-0">
              <p className="text-sm font-semibold text-on-surface">{u.name}</p>
              <p className="flex flex-wrap gap-x-2 text-xs text-on-surface-variant">
                {u.jobTitle && <span>{u.jobTitle}</span>}
                <MonoText className="text-xs text-on-surface-variant">{u.email}</MonoText>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No active employees" />
      )}
    </SettingsPanel>
  );
}
