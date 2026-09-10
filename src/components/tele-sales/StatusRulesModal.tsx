import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LEAD_STATUS_WORKFLOW, NEXT, LEAD_STATUSES } from '@/config/leadStatusWorkflow';

/** Read-only reference matrix: mandatory fields, automation and allowed transitions per status. */
export function StatusRulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Status Rules &amp; Mandatory Fields</DialogTitle>
          <DialogDescription>Reference matrix — trigger requirements, automation and allowed transitions for each status.</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-on-surface-variant border-b border-outline-variant/30">
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Mandatory fields</th>
                <th className="py-2 pr-3 font-semibold">Automation</th>
                <th className="py-2 pr-3 font-semibold">Allowed transitions</th>
              </tr>
            </thead>
            <tbody>
              {LEAD_STATUSES.map((status) => {
                const config = LEAD_STATUS_WORKFLOW[status];
                const required = config.fields.filter((f) => f.req);
                const conditional = config.fields.filter((f) => f.reqIf && !f.req);
                const transitions = NEXT[status] || [];
                return (
                  <tr key={status} className="border-b border-outline-variant/15 align-top">
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: config.bg, color: config.color }}>{status}</span>
                      <div dir="rtl" className="text-xs text-on-surface-variant mt-1">{config.ar}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <ul className="list-disc list-inside space-y-0.5">
                        {required.map((f) => <li key={f.k}>{f.label}</li>)}
                        {conditional.map((f) => <li key={f.k} className="text-amber-600">{f.label} (conditional)</li>)}
                        {required.length === 0 && conditional.length === 0 && <li className="list-none text-on-surface-variant">—</li>}
                      </ul>
                    </td>
                    <td className="py-2.5 pr-3">{config.task ? 'Auto task / reminder' : '—'}</td>
                    <td className="py-2.5 pr-3 text-on-surface-variant">{transitions.length ? transitions.join(' · ') : 'Final state'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
