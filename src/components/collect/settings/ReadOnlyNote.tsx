import { Lock } from 'lucide-react';

/** Shown on admin-only settings sections for everyone else. */
export function ReadOnlyNote() {
  return (
    <p className="flex items-center gap-2 rounded-[0.75rem] bg-surface-container-high px-3 py-2 text-[13px] text-on-surface-variant">
      <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
      Only administrators can make changes here.
    </p>
  );
}
