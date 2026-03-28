import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Car, Navigation, Footprints, CircleDot, Train } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  onComplete?: () => void;
  onSkip?: () => void;
}

export function TransportModeSelector({ open, onOpenChange, eventId, profileId, onComplete, onSkip }: TransportModeSelectorProps) {
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = async (mode: string) => {
    setSelected(mode);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({ arrival_transport_mode: mode } as any)
        .eq('event_id', eventId)
        .eq('profile_id', profileId);

      if (error) throw error;
      toast.success('Got it! Have fun 🎉');
      onOpenChange(false);
      onComplete?.();
    } catch {
      toast.error('Failed to save — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-montserrat">How are you getting here?</DialogTitle>
          <DialogDescription className="text-sm">
            Helps your host plan a safe night.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {TRANSPORT_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <Button
                key={mode.value}
                variant="outline"
                className={cn(
                  'h-20 flex-col gap-1.5 transition-all',
                  selected === mode.value && 'ring-2 ring-primary bg-primary/5'
                )}
                disabled={saving}
                onClick={() => handleSelect(mode.value)}
              >
                <Icon className={cn('h-6 w-6', mode.color)} />
                <span className="text-xs font-medium">{mode.label}</span>
              </Button>
            );
          })}
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onOpenChange(false)}>
          Skip for now
        </Button>
      </DialogContent>
    </Dialog>
  );
}
