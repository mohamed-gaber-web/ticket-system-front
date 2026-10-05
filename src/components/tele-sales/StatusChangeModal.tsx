import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StatusUpdateForm } from '@/components/tele-sales/StatusUpdateForm';
import type { Lead } from '@/types/teleSales.types';

interface StatusChangeModalProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
  onChanged?: (lead: Lead) => void;
}

export function StatusChangeModal({ lead, open, onClose, onChanged }: StatusChangeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>
            {lead.companyName} · {lead.customerId || lead._id} · current status: <span className="font-semibold">{lead.status}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so every opening starts from a clean form. */}
        {open && (
          <StatusUpdateForm
            lead={lead}
            variant="dialog"
            onCancel={onClose}
            onChanged={(updated) => { onChanged?.(updated); onClose(); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
