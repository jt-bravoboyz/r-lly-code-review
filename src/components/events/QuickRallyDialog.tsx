import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, MapPin, Users, Beer, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateEvent, useJoinEvent } from '@/hooks/useEvents';
import { useCreateEventInvites } from '@/hooks/useEventInvites';
import { useAuth } from '@/hooks/useAuth';
import { useAllMySquads, Squad } from '@/hooks/useSquads';
import { useLocation } from '@/hooks/useLocation';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConfetti } from '@/hooks/useConfetti';
import { LocationSearch } from '@/components/location/LocationSearch';
import { format, addHours, setHours, setMinutes, isAfter, isSameDay } from 'date-fns';

const quickRallySchema = z.object({
  title: z.string().min(1, 'Give your rally a name'),
  location_name: z.string().optional(),
  is_barhop: z.boolean(),
});

type QuickRallyFormData = z.infer<typeof quickRallySchema>;

interface QuickRallyDialogProps {
  trigger?: React.ReactNode;
  preselectedSquad?: Squad;
}

// Generate time options for "later today"
function generateTimeOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [
    { value: 'now', label: 'Start Now' },
  ];
  
  // Add +1hr, +2hr, +3hr options
  for (let i = 1; i <= 3; i++) {
    const futureTime = addHours(now, i);
    if (isSameDay(futureTime, now)) {
      options.push({
        value: `+${i}`,
        label: `In ${i} hour${i > 1 ? 's' : ''} (${format(futureTime, 'h:mm a')})`,
      });
    }
  }
  
  // Add specific evening times (6pm, 7pm, 8pm, 9pm, 10pm)
  const eveningHours = [18, 19, 20, 21, 22];
  eveningHours.forEach(hour => {
    const timeOption = setMinutes(setHours(new Date(), hour), 0);
    // Only show if it's in the future and same day
    if (isAfter(timeOption, now) && isSameDay(timeOption, now)) {
      options.push({
        value: `h${hour}`,
        label: format(timeOption, 'h:mm a'),
      });
    }
  });
  
  return options;
}

// Convert time selection to Date
function getStartTime(selection: string): Date {
  const now = new Date();
  
  if (selection === 'now') {
    return now;
  }
  
  // Handle +1, +2, +3 hour options
  if (selection.startsWith('+')) {
    const hours = parseInt(selection.slice(1), 10);
    return addHours(now, hours);
  }
  
  // Handle specific hour options (h18, h19, etc.)
  if (selection.startsWith('h')) {
    const hour = parseInt(selection.slice(1), 10);
    return setMinutes(setHours(now, hour), 0);
  }
  
  return now;
}

export function QuickRallyDialog({ trigger, preselectedSquad }: QuickRallyDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSquads, setSelectedSquads] = useState<Squad[]>(preselectedSquad ? [preselectedSquad] : []);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('now');
  
  const { profile } = useAuth();
  const { data: squads } = useAllMySquads();
  const { location, getCurrentLocation } = useLocation();
  const createEvent = useCreateEvent();
  const joinEvent = useJoinEvent();
  const createInvites = useCreateEventInvites();
  const navigate = useNavigate();
  const { fireRallyConfetti } = useConfetti();

  // Memoize time options so they update when dialog opens
  const timeOptions = useMemo(() => {
    if (open) {
      return generateTimeOptions();
    }
    return [];
  }, [open]);

  const form = useForm<QuickRallyFormData>({
    resolver: zodResolver(quickRallySchema),
    defaultValues: {
      title: '',
      location_name: '',
      is_barhop: false,
    }
  });

  // Get current location on dialog open
  useEffect(() => {
    if (open) {
      getCurrentLocation();
    }
  }, [open, getCurrentLocation]);

  const toggleSquadSelection = (squad: Squad) => {
    setSelectedSquads(prev => {
      const isSelected = prev.some(s => s.id === squad.id);
      if (isSelected) {
        return prev.filter(s => s.id !== squad.id);
      } else {
        return [...prev, squad];
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedSquads(preselectedSquad ? [preselectedSquad] : []);
    setSelectedLocationCoords(null);
    setSelectedTime('now');
    form.reset();
  };

  const onSubmit = async (data: QuickRallyFormData) => {
    if (!profile) {
      toast.error('You must be logged in to create a rally');
      return;
    }

    try {
      // Calculate start time based on selection
      const startTime = getStartTime(selectedTime);
      
      // Create rally
      const result = await createEvent.mutateAsync({
        creator_id: profile.id,
        title: data.title,
        description: 'Quick Rally - Same day event',
        event_type: 'rally',
        start_time: startTime.toISOString(),
        location_name: data.location_name || 'Current Location',
        location_lat: selectedLocationCoords?.lat || location.lat,
        location_lng: selectedLocationCoords?.lng || location.lng,
        is_barhop: data.is_barhop,
        is_quick_rally: true,
      });

      // Auto-join the event
      await joinEvent.mutateAsync({ eventId: result.id, profileId: profile.id });
      
      // Auto-invite all members from selected squads
      if (selectedSquads.length > 0) {
        // Collect all member profile IDs from selected squads, excluding the host
        const allMemberIds = new Set<string>();
        
        selectedSquads.forEach(squad => {
          squad.members?.forEach(member => {
            const memberId = member.profile?.id;
            // Exclude host's own profile ID and ensure ID exists
            if (memberId && memberId !== profile.id) {
              allMemberIds.add(memberId);
            }
          });
        });
        
        const uniqueMemberIds = Array.from(allMemberIds);
        
        if (uniqueMemberIds.length > 0) {
          try {
            await createInvites.mutateAsync({
              eventId: result.id,
              profileIds: uniqueMemberIds,
              eventTitle: data.title,
            });
            toast.success(`Invited ${uniqueMemberIds.length} squad member${uniqueMemberIds.length > 1 ? 's' : ''}!`);
          } catch (inviteError: any) {
            // Don't fail the whole creation if invites fail
            console.error('Failed to send squad invites:', inviteError);
            toast.error('Rally created but some invites failed');
          }
        }
      }
      
      // Fire confetti celebration!
      fireRallyConfetti();
      
      toast.success('Quick Rally started! 🎉');
      
      // Close dialog and navigate to event
      handleClose();
      navigate(`/events/${result.id}`);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to create rally');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-yellow-400 via-orange-400 to-primary text-white hover:opacity-90 rounded-full shadow-lg shadow-orange-500/30 font-montserrat font-extrabold px-6 transition-all hover:scale-105">
            <Zap className="h-5 w-5 mr-2" strokeWidth={2.5} fill="currentColor" />
            Quick R@lly
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-montserrat text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" strokeWidth={2.5} fill="currentColor" />
            </div>
            <span className="font-bold">Quick R@lly</span>
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What's the move?</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Drinks at Main St, Game Night..." 
                      {...field} 
                      className="text-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Selection */}
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                When?
              </FormLabel>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FormField
              control={form.control}
              name="location_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Where at?</FormLabel>
                  <FormControl>
                    <LocationSearch
                      value={field.value || ''}
                      onChange={field.onChange}
                      onLocationSelect={(loc) => {
                        field.onChange(loc.name);
                        setSelectedLocationCoords({ lat: loc.lat, lng: loc.lng });
                      }}
                      placeholder="Search restaurant, bar, or address..."
                      allowCustomName={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_barhop"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Beer className="h-5 w-5 text-secondary" />
                    <div>
                      <FormLabel className="text-base">Bar Hop Mode</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Multiple stops tonight
                      </p>
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Squad Selection - Multi-select */}
            {squads && squads.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Invite Squads (optional)</FormLabel>
                <ScrollArea className="h-24">
                  <div className="flex flex-wrap gap-2 pb-2">
                    {squads.map((squad) => {
                      const isSelected = selectedSquads.some(s => s.id === squad.id);
                      return (
                        <button
                          key={squad.id}
                          type="button"
                          onClick={() => toggleSquadSelection(squad)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-colors ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          <Users className="h-3 w-3" />
                          <span className="text-sm font-medium">{squad.name}</span>
                          {isSelected && <Check className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
                {selectedSquads.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedSquads.length} squad{selectedSquads.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
              disabled={createEvent.isPending || createInvites.isPending}
            >
              {createEvent.isPending || createInvites.isPending ? 'Starting...' : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {selectedTime === 'now' ? 'Start Rally Now' : 'Schedule Rally'}
                </>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
