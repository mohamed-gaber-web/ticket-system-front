import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/redux/hooks/hooks';
import MeetingDialog from '@/pages/calendar/components/MeetingDialog';
import { defaultSlot } from '@/pages/calendar/calendarUtils';

/**
 * Header icon that opens the "Book a Meeting" dialog from any page.
 * Staff only (consultants + tele-sales); customers cannot book.
 */
export function QuickBookButton() {
  const navigate = useNavigate();
  const { userType } = useAppSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState(defaultSlot);

  // Staff book meetings; customers only see theirs
  if (userType !== 'employee') return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="rounded-[1rem] gap-2 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-semibold"
        onClick={() => { setSlot(defaultSlot()); setOpen(true); }}
        aria-label="Book a meeting"
        title="Book a meeting with a customer, lead or colleague"
      >
        <CalendarPlus className="h-4 w-4" />
        <span className="hidden md:inline">Book meeting</span>
      </Button>
      <MeetingDialog
        open={open}
        onOpenChange={setOpen}
        meeting={null}
        slot={slot}
        onSaved={(m) => navigate(`/calendar?meeting=${m._id}`)}
      />
    </>
  );
}
