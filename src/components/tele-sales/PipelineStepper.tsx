import { STEPS, LEAD_STATUS_WORKFLOW, type LeadStatus } from '@/config/leadStatusWorkflow';

/** The 7-stage pipeline progress bar shown on the lead detail header. */
export function PipelineStepper({ status }: { status: LeadStatus }) {
  const currentStep = LEAD_STATUS_WORKFLOW[status]?.step ?? 0;
  const isWon = status === 'Closed Won';
  const isLost = status === 'Closed Lost';

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4">
      <div className="flex gap-1.5">
        {STEPS.map((label, i) => {
          const done = isWon ? i <= currentStep : i < currentStep;
          const isNow = i === currentStep && !done;
          let barClass = 'bg-outline-variant/30';
          let textClass = 'text-on-surface-variant';
          if (done) {
            barClass = 'bg-primary';
            textClass = 'text-on-surface font-medium';
          } else if (isNow) {
            barClass = isLost ? 'bg-error' : 'bg-amber-500';
            textClass = isLost ? 'text-error font-medium' : 'text-on-surface font-medium';
          }
          return (
            <div key={label} className="flex-1 min-w-0">
              <div className={`h-1 rounded-full mb-2 ${barClass}`} />
              <span className={`text-[11px] truncate block ${textClass}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
