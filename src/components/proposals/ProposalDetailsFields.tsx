import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { getProposalCatalog } from '@/api/proposalApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROPOSAL_INTERESTS } from '@/lib/proposalInterests';
import type { LegalEntity } from '@/types/proposal.types';
import { Chip, RemoveButton } from './builderUi';

// The interests list is admin-editable on the server (proposal config), so it is
// read from the price-list endpoint once per page load; the built-in list is the
// fallback (e.g. no proposals module).
let interestsLoad: Promise<string[]> | null = null;
const loadInterests = () =>
  (interestsLoad ??= getProposalCatalog()
    .then((r) => Object.keys(r.data.config.interests ?? {}))
    .catch(() => [...PROPOSAL_INTERESTS]));

export interface ProposalDetails {
  legalEntities?: LegalEntity[];
  proposalInterests?: string[];
  expectedUsers?: number | null;
}

/**
 * The Opportunity's "Proposal details" (lead form): legal entities, interests and
 * expected users. "Create proposal" turns them into implementation tables,
 * pre-selected modules and license lines.
 */
export default function ProposalDetailsFields({
  value,
  onChange,
  country,
  industry,
}: {
  value: ProposalDetails;
  onChange: (patch: ProposalDetails) => void;
  country?: string;
  industry?: string;
}) {
  const entities = value.legalEntities ?? [];
  const interests = value.proposalInterests ?? [];
  const [options, setOptions] = useState<string[]>([...PROPOSAL_INTERESTS]);
  useEffect(() => {
    let alive = true;
    loadInterests().then((list) => alive && list.length && setOptions(list));
    return () => {
      alive = false;
    };
  }, []);
  const setEntity = (i: number, patch: Partial<LegalEntity>) =>
    onChange({ legalEntities: entities.map((e, j) => (j === i ? { ...e, ...patch } : e)) });

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-on-surface">Interested in</p>
        <div className="flex flex-wrap gap-1.5">
          {[...new Set([...options, ...interests])].map((k) => (
            <Chip
              key={k}
              on={interests.includes(k)}
              onClick={() => onChange({ proposalInterests: interests.includes(k) ? interests.filter((x) => x !== k) : [...interests, k] })}
            >
              {k}
            </Chip>
          ))}
        </div>
      </div>

      <div className="max-w-[14rem]">
        <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="expected-users">
          Expected users
        </label>
        <Input
          id="expected-users"
          type="number"
          min={0}
          value={value.expectedUsers ?? ''}
          onChange={(e) => onChange({ expectedUsers: e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value))) })}
          placeholder="e.g. 20"
        />
        <p className="mt-1 text-xs text-on-surface-variant">Quantity of each Microsoft license.</p>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-on-surface">Legal entities</p>
        <div className="space-y-2">
          {entities.map((e, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_2rem]">
              <Input value={e.name} placeholder="Legal entity" aria-label={`Legal entity ${i + 1}`} onChange={(ev) => setEntity(i, { name: ev.target.value })} />
              <Input value={e.location} placeholder="Location" aria-label={`Location ${i + 1}`} onChange={(ev) => setEntity(i, { location: ev.target.value })} />
              <Input value={e.industry} placeholder="Industry" aria-label={`Industry ${i + 1}`} onChange={(ev) => setEntity(i, { industry: ev.target.value })} />
              <RemoveButton label={`Remove legal entity ${i + 1}`} onClick={() => onChange({ legalEntities: entities.filter((_, j) => j !== i) })} />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => onChange({ legalEntities: [...entities, { name: '', location: country ?? '', industry: industry ?? '' }] })}
        >
          <Plus /> Legal entity
        </Button>
        <p className="mt-1 text-xs text-on-surface-variant">More than one entity gives one implementation table per entity. None: the company itself.</p>
      </div>
    </div>
  );
}
