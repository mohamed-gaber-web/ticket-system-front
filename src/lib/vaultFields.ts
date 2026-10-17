import type { VaultFieldKey, VaultLookupType, VaultOwnerType } from '@/types/vault.types';

// The Credentials Vault account form, defined once (spec §4). The create/edit
// form and the details modal both render from this list: grouped by `section`,
// filtered by `only`. The backend mirrors the required/owner rules.

export type VaultFieldType = 'text' | 'select' | 'password' | 'date' | 'textarea';
export type VaultFieldSource = 'clients' | 'users' | VaultLookupType;
export type VaultSection = 'basics' | 'credentials' | 'governance';

export interface VaultFieldDef {
  key: VaultFieldKey;
  label: string;
  type: VaultFieldType;
  source?: VaultFieldSource;
  /** Required on save (`password` only on create). */
  required?: boolean;
  /** Shown only for this owner type; undefined = both. */
  only?: VaultOwnerType;
  section: VaultSection;
  help: string;
  placeholder?: string;
  /** Technical value: rendered LTR in a monospace font. */
  mono?: boolean;
}

export const VAULT_SECTIONS: { key: VaultSection; label: string }[] = [
  { key: 'basics', label: 'Basics' },
  { key: 'credentials', label: 'Sign-in details' },
  { key: 'governance', label: 'Governance & follow-up' },
];

export const VAULT_FIELDS: VaultFieldDef[] = [
  // ── Basics
  {
    key: 'client',
    label: 'Client',
    type: 'select',
    source: 'clients',
    required: true,
    only: 'client',
    section: 'basics',
    help: "The client who owns the system. If it isn't listed, add it under Settings > Clients.",
  },
  {
    key: 'project',
    label: 'Project / contract',
    type: 'text',
    only: 'client',
    section: 'basics',
    help: 'The project this account belongs to, so you can tell apart accounts of the same client.',
    placeholder: 'e.g. D365 implementation — phase 1',
  },
  {
    key: 'department',
    label: 'Department',
    type: 'select',
    source: 'department',
    only: 'company',
    section: 'basics',
    help: 'The department inside the company that is responsible for this account.',
  },
  {
    key: 'accountOwner',
    label: 'Account owner',
    type: 'select',
    source: 'users',
    only: 'company',
    section: 'basics',
    help: 'The employee who manages the account and is responsible for password changes and renewal.',
  },
  {
    key: 'platform',
    label: 'Platform name',
    type: 'text',
    required: true,
    section: 'basics',
    help: 'A clear name that identifies the account. It is what appears on the cards and in the email.',
    placeholder: 'e.g. D365 F&O — UAT',
  },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    source: 'category',
    section: 'basics',
    help: 'The kind of platform. Used for filtering and reports.',
  },
  {
    key: 'environment',
    label: 'Environment',
    type: 'select',
    source: 'environment',
    section: 'basics',
    help: 'Production is the live environment; UAT and Test are for testing. Pick "Not applicable" for ordinary platforms such as email.',
  },
  {
    key: 'url',
    label: 'Sign-in URL',
    type: 'text',
    mono: true,
    section: 'basics',
    help: 'The link that opens the sign-in page. For an RDP connection, enter the server address.',
    placeholder: 'https://',
  },
  // ── Sign-in details
  {
    key: 'username',
    label: 'Username / email',
    type: 'text',
    mono: true,
    required: true,
    section: 'credentials',
    help: 'Exactly as typed on the sign-in screen. For a domain account use DOMAIN\\user.',
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    mono: true,
    required: true,
    section: 'credentials',
    help: 'Use Generate for a strong password. Changing it updates the "last changed" date automatically.',
  },
  {
    key: 'mfaMethod',
    label: 'Two-factor (MFA)',
    type: 'select',
    source: 'mfaMethod',
    section: 'credentials',
    help: 'The method the platform asks for after the password.',
  },
  {
    key: 'mfaHolder',
    label: 'Code goes to',
    type: 'text',
    section: 'credentials',
    help: 'The person, phone or mailbox that receives the verification code, so the recipient knows whom to ask.',
  },
  {
    key: 'accessLevel',
    label: 'Access level',
    type: 'select',
    source: 'accessLevel',
    section: 'credentials',
    help: 'The permissions this account has inside the platform.',
  },
  {
    key: 'recoveryContact',
    label: 'Recovery email or phone',
    type: 'text',
    mono: true,
    only: 'company',
    section: 'credentials',
    help: "Used if the password is lost. It must belong to the company, not an employee's personal account.",
  },
  // ── Governance & follow-up
  {
    key: 'sensitivity',
    label: 'Sensitivity',
    type: 'select',
    source: 'sensitivity',
    section: 'governance',
    help: 'Sets the sending rules. Levels that require approval cannot be sent without confirmation.',
  },
  {
    key: 'grantedBy',
    label: 'Granted by',
    type: 'text',
    only: 'client',
    section: 'governance',
    help: "The person at the client who created or handed over the account. Contact them if it gets locked.",
  },
  {
    key: 'validUntil',
    label: 'Access valid until',
    type: 'date',
    only: 'client',
    section: 'governance',
    help: 'The last day we may use the account, usually the end of the contract or support. The dashboard warns 30 days before.',
  },
  {
    key: 'renewalDate',
    label: 'Renewal date',
    type: 'date',
    only: 'company',
    section: 'governance',
    help: 'When the subscription or domain renews. The dashboard warns 30 days before.',
  },
  {
    key: 'cost',
    label: 'Cost',
    type: 'text',
    only: 'company',
    section: 'governance',
    help: 'Optional. Subscription amount, currency and billing period.',
    placeholder: 'e.g. 12 USD / month',
  },
  {
    key: 'notes',
    label: 'Notes',
    type: 'textarea',
    section: 'governance',
    help: 'Any extra instructions, e.g. VPN is required before signing in.',
  },
];

export const OWNER_HELP: Record<VaultOwnerType, string> = {
  client: "An account on a client's system. Shows the client, project and access-validity fields.",
  company: 'An internal Grow Path account. Shows the department, owner and renewal-date fields.',
};

export const OWNER_LABELS: Record<VaultOwnerType, string> = {
  client: 'Client',
  company: 'Company',
};

/** The fields that apply to one owner type, in form order. */
export const fieldsFor = (ownerType: VaultOwnerType): VaultFieldDef[] =>
  VAULT_FIELDS.filter((f) => !f.only || f.only === ownerType);
