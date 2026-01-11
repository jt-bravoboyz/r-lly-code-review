import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, MapPin, Users, Beer, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useCreateEvent, useJoinEvent } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { useSquads, Squad } from '@/hooks/useSquads';
import { useLocation } from '@/hooks/useLocation';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConfetti } from '@/hooks/useConfetti';
import { LocationSearch } from '@/components/location/LocationSearch';

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

export function QuickRallyDialog({ trigger, preselectedSquad }: QuickRallyDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSquads, setSelectedSquads] = useState<Squad[]>(preselectedSquad ? [preselectedSquad] : []);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  const { profile } = useAuth();
  const { data: squads } = useSquads();
  const { location, getCurrentLocation } = useLocation();
  const createEvent = useCreateEvent();
  const joinEvent = useJoinEvent();
  const navigate = useNavigate();
  const { fireRallyConfetti } = useConfetti();

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
    form.reset();
  };

  const onSubmit = async (data: QuickRallyFormData) => {
    if (!profile) {
      toast.error('You must be logged in to create a rally');
      return;
    }

    try {
      // Create rally starting now
      const result = await createEvent.mutateAsync({
        creator_id: profile.id,
        title: data.title,
        description: 'Quick Rally - Same day event',
        event_type: 'rally',
        start_time: new Date().toISOString(),
        location_name: data.location_name || 'Current Location',
        location_lat: selectedLocationCoords?.lat || location.lat,
        location_lng: selectedLocationCoords?.lng || location.lng,
        is_barhop: data.is_barhop,
        is_quick_rally: true,
      });

      // Auto-join the event
      await joinEvent.mutateAsync({ eventId: result.id, profileId: profile.id });
      
      // Fire confetti celebration!
      fireRallyConfetti();
      
      toast.success('Quick Rally started! 🎉');
      
      // TODO: In the future, auto-invite selected squads here
      // For now, just navigate to the event
      
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
              disabled={createEvent.isPending}
            >
              {createEvent.isPending ? 'Starting...' : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Start Rally Now
                </>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
