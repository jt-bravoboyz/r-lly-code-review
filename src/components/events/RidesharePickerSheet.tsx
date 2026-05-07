import { useRef } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { RideshareDeepLinkButtons } from '@/components/rides/RideshareDeepLinkButtons';
import { supabase } from '@/integrations/supabase/client';
import { useHaptics } from '@/hooks/useHaptics';
import { toast } from 'sonner';

interface RidesharePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  profileId: string;
  eventLat?: number | null;
  eventLng?: number | null;
  eventName?: string | null;
  eventAddress?: string | null;
  onSaved?: () => void;
}

export function RidesharePickerSheet({
  open,
  onOpenChange,
  eventId,
  profileId,
  eventLat,
  eventLng,
  eventName,
  eventAddress,
  onSaved,
}: RidesharePickerSheetProps) {
  const savedRef = useRef(false);
  const { triggerButtonFeedback } = useHaptics();

  const savePlan = async () => {
    if (savedRef.current) return;
    savedRef.current = true;
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({ arrival_transport_mode: 'rideshare' } as any)
        .eq('event_id', eventId)
        .eq('profile_id', profileId);
      if (error) throw error;
      onSaved?.();
    } catch {
      toast.error('Failed to save — try again');
      savedRef.current = false;
    }
  };

  const handleSelfRide = async () => {
    triggerButtonFeedback();
    await savePlan();
    onOpenChange(false);
  };

  // Reset saved guard when re-opening
  if (!open && savedRef.current) {
    savedRef.current = false;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="border-t border-white/40 dark:border-white/10 bg-white/55 dark:bg-black/45 backdrop-blur-2xl rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.35)] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{ WebkitBackdropFilter: 'blur(24px) saturate(1.4)' }}
      >
        <div className="mx-auto max-w-md w-full flex flex-col gap-5">
          <div className="flex flex-col gap-1.5 pr-8">
            <SheetTitle className="font-montserrat text-2xl font-bold text-foreground tracking-tight">
              Pick your ride.
            </SheetTitle>
          </div>

          <div onPointerDownCapture={savePlan}>
            <RideshareDeepLinkButtons
              eventLat={eventLat}
              eventLng={eventLng}
              eventName={eventName}
              eventAddress={eventAddress}
            />
          </div>

          <button
            type="button"
            onClick={handleSelfRide}
            className={[
              'w-full h-[44px] rounded-xl mt-1',
              'flex items-center justify-center',
              'bg-white/5 dark:bg-white/[0.015]',
              'backdrop-blur-md',
              'border border-white/8 dark:border-white/[0.04]',
              'text-foreground/60 hover:text-foreground/80 font-normal text-[13px]',
              'active:scale-[0.98] transition-all duration-200 ease-out',
            ].join(' ')}
            style={{ WebkitBackdropFilter: 'blur(10px) saturate(1.1)' }}
          >
            I'll figure out my own ride
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
