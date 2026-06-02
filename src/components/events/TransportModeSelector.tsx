import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Car, Navigation, Footprints, CircleDot, Train } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RidesharePickerSheet } from './RidesharePickerSheet';

const TRANSPORT_MODES = [
  { value: 'dd', label: 'Designated Driver', icon: Car, color: 'text-primary' },
  { value: 'rideshare', label: 'Rideshare', icon: Navigation, color: 'text-blue-500' },
  { value: 'driving', label: 'Driving', icon: CircleDot, color: 'text-orange-500' },
  { value: 'walking', label: 'Walking', icon: Footprints, color: 'text-green-500' },
  { value: 'public_transit', label: 'Public Transit', icon: Train, color: 'text-purple-500' },
] as const;

interface TransportModeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  profileId: string;
  eventLat?: number | null;
  eventLng?: number | null;
  eventName?: string | null;
  eventAddress?: string | null;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function TransportModeSelector({ open, onOpenChange, eventId, profileId, eventLat, eventLng, eventName, eventAddress, onComplete, onSkip }: TransportModeSelectorProps) {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [showRideshareSheet, setShowRideshareSheet] = useState(false);

  const finishSelection = () => {
    toast.success('Got it! Have fun 🎉');
    onOpenChange(false);
    onComplete?.();
  };

  const handleSelect = async (mode: string) => {
    if (mode === 'rideshare') {
      setSelected(mode);
      setShowRideshareSheet(true);
      return;
    }
    setSelected(mode);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({ arrival_transport_mode: mode } as any)
        .eq('event_id', eventId)
        .eq('profile_id', profileId);

      if (error) throw error;
      finishSelection();
    } catch {
      toast.error('Failed to save — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm"
        hideCloseButton
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold font-montserrat">
            How are you getting here?
          </DialogTitle>
          <DialogDescription className="text-base">
            Helps your host plan a safe night.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-4">
          {TRANSPORT_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.value}
                type="button"
                disabled={saving}
                onClick={() => handleSelect(mode.value)}
                className={cn(
                  'h-24 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm',
                  'flex flex-col items-center justify-center gap-2 transition-all',
                  'hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed',
                  selected === mode.value && 'ring-2 ring-primary bg-primary/5'
                )}
              >
                <Icon className={cn('h-7 w-7', mode.color)} />
                <span className="text-sm font-semibold font-montserrat">{mode.label}</span>
              </button>
            );
          })}
        </div>
        <p
          className="text-sm text-muted-foreground text-center pt-2 cursor-pointer hover:text-foreground transition-colors"
          onClick={() => {
            onSkip?.();
            onOpenChange(false);
          }}
        >
          Skip for now
        </p>
      </DialogContent>
    </Dialog>
    <RidesharePickerSheet
      open={showRideshareSheet}
      onOpenChange={(o) => {
        setShowRideshareSheet(o);
        if (!o) setSelected(null);
      }}
      eventId={eventId}
      profileId={profileId}
      eventLat={eventLat}
      eventLng={eventLng}
      eventName={eventName}
      eventAddress={eventAddress}
      onSaved={() => {
        setShowRideshareSheet(false);
        finishSelection();
      }}
    />
    </>
  );
}
