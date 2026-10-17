import type { VaultLookupType } from '@/types/vault.types';

// The Settings screen's lookup panels (spec §9.7), in English.

export interface LookupPanelDef {
  type: VaultLookupType;
  title: string;
  description: string;
  nameHelp?: string;
  /** Extra checkbox on the add/edit form. */
  flag?: { key: 'isNone' | 'requiresApproval'; label: string; help: string; badge: string };
}

export const LOOKUP_PANELS: LookupPanelDef[] = [
  {
    type: 'category',
    title: 'Account categories',
    description: 'The kind of platform. Used for filtering and in the dashboard reports.',
  },
  {
    type: 'environment',
    title: 'Environments',
    description: 'The environment the account works on. Important in D365 to tell Production, UAT and Test apart.',
  },
  {
    type: 'accessLevel',
    title: 'Access levels',
    description: 'The permissions the account has inside the platform.',
  },
  {
    type: 'mfaMethod',
    title: 'Two-factor methods',
    description: 'The method the platform asks for after the password.',
    flag: {
      key: 'isNone',
      label: 'This option means "no two-factor"',
      help: 'When ticked, emails leave out the two-factor line.',
      badge: 'No MFA',
    },
  },
  {
    type: 'sensitivity',
    title: 'Sensitivity levels',
    description: 'Levels marked "requires approval" can only be sent after confirming approval and entering the approver\'s name.',
    nameHelp: 'e.g. Standard, Sensitive, Top Secret.',
    flag: {
      key: 'requiresApproval',
      label: 'Requires approval before sending',
      help: 'When ticked, the Send screen asks for approval confirmation and the approver\'s name.',
      badge: 'Requires approval',
    },
  },
  {
    type: 'department',
    title: 'Company departments',
    description: 'The department responsible for one of the company\'s internal accounts.',
  },
  {
    type: 'sendPurpose',
    title: 'Send reasons',
    description: 'Offered on the Send screen and recorded with every send.',
  },
];

export const DUPLICATE_NAME = 'This name already exists in the list.';
