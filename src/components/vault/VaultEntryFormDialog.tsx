import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Save, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAppDispatch } from '@/redux/hooks/hooks';
import { saveVaultEntry } from '@/redux/slices/vaultEntriesSlice';
import { generatePassword, toDateInput } from '@/lib/vault';
import { OWNER_HELP, OWNER_LABELS, VAULT_FIELDS, VAULT_SECTIONS, fieldsFor, type VaultFieldDef } from '@/lib/vaultFields';
import type { VaultEntry, VaultEntryInput, VaultFieldKey, VaultOwnerType } from '@/types/vault.types';
import { FieldWithHelp, MissingBox } from './VaultUi';
import { LookupSelect } from './LookupSelect';

type Values = Record<VaultFieldKey, string>;

const blankValues = (): Values =>
  Object.fromEntries(VAULT_FIELDS.map((f) => [f.key, ''])) as Values;

/** The stored entry as form values: refs → ids, dates → yyyy-mm-dd, never a password. */
const valuesFrom = (e: VaultEntry | null): Values => {
  const v = blankValues();
  if (!e) return v;
  for (const f of VAULT_FIELDS) {
    if (f.key === 'password') continue;
    const raw = e[f.key as keyof VaultEntry];
    if (raw === null || raw === undefined) continue;
    if (typeof raw === 'object' && '_id' in raw) v[f.key] = String((raw as { _id: string })._id);
    else if (f.type === 'date') v[f.key] = toDateInput(String(raw));
    else v[f.key] = String(raw);
  }
  return v;
};

const labelOf = (key: string) => VAULT_FIELDS.find((f) => f.key === key)?.label ?? key;

interface Props {
  open: boolean;
  /** null = create. */
  entry: VaultEntry | null;
  onClose: () => void;
  onSaved: (entry: VaultEntry) => void;
}

export function VaultEntryFormDialog({ open, entry, onClose, onSaved }: Props) {
  const dispatch = useAppDispatch();
  const isEdit = !!entry;
  const [ownerType, setOwnerType] = useState<VaultOwnerType>('client');
  const [values, setValues] = useState<Values>(blankValues);
  const [showPassword, setShowPassword] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fresh state every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setOwnerType(entry?.ownerType ?? 'client');
    setValues(valuesFrom(entry));
    setShowPassword(false);
    setMissing([]);
    setServerError(null);
  }, [open, entry]);

  // The generated / typed password leaves memory with the dialog.
  useEffect(() => {
    if (!open) setValues((v) => (v.password ? { ...v, password: '' } : v));
  }, [open]);

  const visible = fieldsFor(ownerType);
  const set = (key: VaultFieldKey, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (missing.length) setMissing((m) => m.filter((l) => l !== labelOf(key)));
  };

  const isRequired = (f: VaultFieldDef) => !!f.required && (f.key !== 'password' || !isEdit);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    const miss = visible.filter((f) => isRequired(f) && !values[f.key].trim()).map((f) => f.label);
    setMissing(miss);
    if (miss.length) return;

    // Only the fields of this owner type are sent; the other side's are dropped.
    const body: VaultEntryInput = { ownerType };
    for (const f of visible) {
      if (f.key === 'password') continue;
      const key = f.key as Exclude<VaultFieldKey, 'password'>;
      const v = values[key].trim();
      if (v) body[key] = v;
      else if (isEdit) body[key] = f.type === 'select' || f.type === 'date' ? null : '';
    }
    if (values.password) body.password = values.password;

    setSaving(true);
    const res = await dispatch(saveVaultEntry({ id: entry?._id, body }));
    setSaving(false);
    if (saveVaultEntry.fulfilled.match(res)) {
      toast.success('Saved');
      setValues((v) => ({ ...v, password: '' }));
      onSaved(res.payload);
      return;
    }
    const err = res.payload;
    setMissing(err?.missing.map(labelOf) ?? []);
    setServerError(err?.message ?? 'Could not save the account');
  };

  const renderControl = (f: VaultFieldDef) => {
    const id = `vault-f-${f.key}`;
    const common = {
      id,
      'aria-describedby': `${id}-help`,
      'aria-required': isRequired(f) || undefined,
      'aria-invalid': missing.includes(f.label) || undefined,
    };
    if (f.type === 'select' && f.source) {
      return <LookupSelect {...common} source={f.source} value={values[f.key]} required={isRequired(f)} onChange={(v) => set(f.key, v)} />;
    }
    if (f.type === 'textarea') {
      return <Textarea {...common} rows={3} value={values[f.key]} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />;
    }
    if (f.type === 'password') {
      return (
        <div className="flex gap-1.5">
          <Input
            {...common}
            dir="ltr"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            spellCheck={false}
            className="font-mono"
            value={values.password}
            placeholder={isEdit ? 'Leave blank to keep the current password' : undefined}
            onChange={(e) => set('password', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              set('password', generatePassword());
              setShowPassword(true);
            }}
          >
            <Wand2 /> Generate
          </Button>
        </div>
      );
    }
    return (
      <Input
        {...common}
        type={f.type === 'date' ? 'date' : 'text'}
        dir={f.mono ? 'ltr' : undefined}
        spellCheck={f.mono ? false : undefined}
        autoComplete="off"
        className={cn(f.mono && 'font-mono')}
        value={values[f.key]}
        placeholder={f.placeholder}
        onChange={(e) => set(f.key, e.target.value)}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="text-left">
          <DialogTitle>{isEdit ? `Edit ${entry.platform}` : 'New account'}</DialogTitle>
          <DialogDescription>Fields marked * are required. Each field explains what to enter.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <div role="group" aria-label="Account belongs to" className="inline-flex rounded-[0.75rem] bg-surface-container-high p-1">
              {(['client', 'company'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={ownerType === o}
                  aria-describedby="vault-owner-help"
                  onClick={() => {
                    setOwnerType(o);
                    setMissing([]);
                  }}
                  className={cn(
                    'rounded-[0.5rem] px-4 py-1.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-[2px] focus-visible:ring-primary/40',
                    ownerType === o ? 'bg-primary text-primary-foreground' : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {OWNER_LABELS[o]}
                </button>
              ))}
            </div>
            <p id="vault-owner-help" className="text-[11px] text-on-surface-variant">
              {OWNER_HELP[ownerType]}
            </p>
          </div>

          {VAULT_SECTIONS.map((s) => (
            <fieldset key={s.key} className="space-y-3 rounded-xl border border-outline-variant/30 p-3 sm:p-4">
              <legend className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">{s.label}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visible
                  .filter((f) => f.section === s.key)
                  .map((f) => (
                    <FieldWithHelp
                      key={f.key}
                      id={`vault-f-${f.key}`}
                      label={f.label}
                      required={isRequired(f)}
                      help={f.help}
                      className={cn((f.type === 'textarea' || f.type === 'password') && 'sm:col-span-2')}
                    >
                      {renderControl(f)}
                    </FieldWithHelp>
                  ))}
              </div>
            </fieldset>
          ))}

          <MissingBox labels={missing} message={serverError} />

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
