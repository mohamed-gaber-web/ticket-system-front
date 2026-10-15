import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks/hooks';
import { addEntity, removeEntity, setModule, updateEntity } from '@/redux/slices/proposalBuilderSlice';
import type { ModuleMode, Proposal, ProposalCatalog } from '@/types/proposal.types';
import { cn } from '@/lib/utils';
import { NativeSelect, RailSection, RemoveButton, fieldCls } from './builderUi';

export default function ScopeTab({ proposal, catalog, canEdit }: { proposal: Proposal; catalog: ProposalCatalog; canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const modules = catalog.config.modules;
  const modeOf = (g: string, m: string) => proposal.modules.find((x) => x.group === g && x.module === m)?.mode ?? '';
  const count = (g: string) => proposal.modules.filter((x) => x.group === g && (modules[g] ?? []).includes(x.module)).length;
  return (
    <div className="space-y-6">
      <RailSection
        title="Legal entities in scope"
        hint="Taken from the opportunity. Changes here apply to this proposal only."
        action={
          canEdit && (
            <Button type="button" variant="outline" size="sm" onClick={() => dispatch(addEntity())}>
              <Plus /> Legal entity
            </Button>
          )
        }
      >
        <div className="space-y-2">
          {proposal.legalEntities.map((e, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-1.5">
              {(['name', 'location', 'industry'] as const).map((k) => (
                <input
                  key={k}
                  className={fieldCls}
                  value={e[k] ?? ''}
                  placeholder={k === 'name' ? 'Legal entity' : k === 'location' ? 'Location' : 'Industry'}
                  aria-label={`${k} of entity ${i + 1}`}
                  disabled={!canEdit}
                  onChange={(ev) => dispatch(updateEntity({ i, patch: { [k]: ev.target.value } }))}
                />
              ))}
              <RemoveButton label={`Remove entity ${i + 1}`} onClick={() => dispatch(removeEntity(i))} disabled={!canEdit} />
            </div>
          ))}
          {!proposal.legalEntities.length && (
            <p className="rounded-xl border border-dashed border-outline-variant/60 p-3 text-center text-xs text-on-surface-variant">
              No entity — the PDF lists the client itself.
            </p>
          )}
        </div>
      </RailSection>

      <RailSection title="Modules in scope" hint="Only the selected modules appear in the PDF, one table per group.">
        <div className="space-y-2">
          {Object.keys(modules).map((g) => {
            const n = count(g);
            return (
              <details key={g} className="group rounded-xl border border-outline-variant/40 bg-surface-container-lowest" open={n > 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-on-surface">
                  <span className="min-w-0">{g}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                    {n} selected
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="space-y-1 px-3 pb-3">
                  {modules[g].map((m) => {
                    const v = modeOf(g, m);
                    return (
                      <div key={m} className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-2">
                        <span className={cn('text-sm', v ? 'font-semibold text-on-surface' : 'text-on-surface-variant')}>{m}</span>
                        <NativeSelect
                          value={v}
                          ariaLabel={`${m} scope`}
                          disabled={!canEdit}
                          onChange={(mode) => dispatch(setModule({ group: g, module: m, mode: mode as ModuleMode | '' }))}
                        >
                          <option value="">—</option>
                          <option value="I">Implementation</option>
                          <option value="R">Rollout</option>
                          <option value="B">Both</option>
                        </NativeSelect>
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </RailSection>
      <p className="text-xs text-on-surface-variant">Which pages print, their order and your own sections are set in the <b>Sections</b> step.</p>
    </div>
  );
}
