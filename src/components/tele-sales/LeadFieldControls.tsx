import { ChevronDown } from 'lucide-react';

// Field building blocks shared by the lead form (LeadFormModal) and the Proposal
// Builder's "complete the opportunity" form, so both offer the same pickers with
// the same options (lookup lists: hooks/useLeadPickerOptions.ts, sources:
// LEAD_SOURCES in types/teleSales.types.ts).

// Shared field styling so inputs, selects and textareas read as one system.
export const selectCls =
  'h-10 w-full appearance-none cursor-pointer rounded-[0.5rem] bg-surface-container-high border-none pl-3 pr-9 text-sm text-on-surface outline-none transition-all focus-visible:ring-[2px] focus-visible:ring-primary/40';

/** A labelled form field with optional required marker and helper hint. */
export function Field({
  label, required, hint, className = '', htmlFor, children,
}: { label: string; required?: boolean; hint?: string; className?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-on-surface mb-1.5 block">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-on-surface-variant mt-1">{hint}</p>}
    </div>
  );
}

/** A native select wrapped with a chevron, styled to match the Input component. */
export function SelectField({
  value, onChange, children, id, 'aria-label': ariaLabel,
}: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; id?: string; 'aria-label'?: string }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={onChange} className={selectCls} aria-label={ariaLabel}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
    </div>
  );
}
