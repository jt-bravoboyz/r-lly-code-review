import { useState, useEffect, useMemo, useRef, forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Users, Beer, Check, Clock, ChevronDown, UserPlus, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { EVENT_TYPES, getEventTypeLabel } from '@/lib/eventTypes';
import { useRallyFriends } from '@/hooks/useRallyFriends';
import { useRecentlyFriended } from '@/hooks/useFriendships';
import { cn } from '@/lib/utils';

const quickRallySchema = z.object({
  title: z.string().min(1, 'Give your rally a name'),
  location_name: z.string().optional(),
  is_barhop: z.boolean(),
  event_type: z.string().default('rally'),
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

export const QuickRallyDialog = forwardRef<HTMLButtonElement, QuickRallyDialogProps>(
  function QuickRallyDialog({ trigger, preselectedSquad }, ref) {
    const [open, setOpen] = useState(false);
    const [selectedSquads, setSelectedSquads] = useState<Squad[]>(preselectedSquad ? [preselectedSquad] : []);
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
    const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>('now');
    const [showEventType, setShowEventType] = useState(false);
    
    const { profile } = useAuth();
    const { data: squads } = useAllMySquads();
    const { data: rallyFriends = [] } = useRallyFriends();
    const { data: recentlyFriended = [] } = useRecentlyFriended(8);
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
        event_type: 'rally',
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

    const toggleFriendSelection = (friendId: string) => {
      setSelectedFriendIds(prev => prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]);
    };

    const handleClose = () => {
      setOpen(false);
      setSelectedSquads(preselectedSquad ? [preselectedSquad] : []);
      setSelectedFriendIds([]);
      setSelectedLocationCoords(null);
      setSelectedTime('now');
      setShowEventType(false);
      form.reset();
    };

    const isSubmittingRef = useRef(false);

    const onSubmit = async (data: QuickRallyFormData) => {
      if (!profile?.id) {
        toast.error('You must be logged in to create a rally');
        return;
      }
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      try {
        // Calculate start time based on selection
        const startTime = getStartTime(selectedTime);

        // Create rally - Chat is created automatically via database trigger
        let result;
        try {
          result = await createEvent.mutateAsync({
            creator_id: profile.id,
            title: data.title,
            description: 'Quick R@lly - Same day event',
            event_type: data.event_type,
            start_time: startTime.toISOString(),
            location_name: data.location_name || 'Current Location',
            location_lat: selectedLocationCoords?.lat || location.lat,
            location_lng: selectedLocationCoords?.lng || location.lng,
            is_barhop: data.is_barhop,
            is_quick_rally: true,
          });
        } catch (insertErr: any) {
          console.error('[QuickRally] insert failed', {
            code: insertErr?.code,
            message: insertErr?.message,
            details: insertErr?.details,
            hint: insertErr?.hint,
          });
          if (insertErr?.code === '23505') {
            toast.error("Looks like that R@lly already exists — give it a sec.");
          } else if (insertErr?.code === '42501' || /row-level security/i.test(insertErr?.message ?? '')) {
            toast.error('Permission denied. Try logging out and back in.');
          } else {
            toast.error(insertErr?.message || 'Could not start R@lly');
          }
          throw insertErr;
        }

        // Auto-join the event - This triggers chat_participants sync
        await joinEvent.mutateAsync({ eventId: result.id, profileId: profile.id });
        
        if (import.meta.env.DEV) {
          console.log('[R@lly Debug] Quick Rally completed:', { 
            event_id: result.id, 
            creator_joined: true,
            event_type: data.event_type,
          });
        }
        
        const allMemberIds = new Set<string>(selectedFriendIds.filter(id => id !== profile.id));

        // Auto-invite selected friends and all members from selected squads
        if (selectedSquads.length > 0) {
          
          if (import.meta.env.DEV) {
            console.log('[R@lly Debug] Processing squad invites:', { 
              selectedSquads: selectedSquads.map(s => ({ id: s.id, name: s.name, memberCount: s.members?.length }))
            });
          }
          
          selectedSquads.forEach(squad => {
            // Also add the squad owner if it's not the current user
            if (squad.owner_id && squad.owner_id !== profile.id) {
              allMemberIds.add(squad.owner_id);
            }
            
            squad.members?.forEach(member => {
              // Use profile_id directly from squad_members, with profile.id as fallback
              const memberId = member.profile_id || member.profile?.id;
              if (import.meta.env.DEV) {
                console.log('[R@lly Debug] Processing member:', { 
                  profile_id: member.profile_id, 
                  nested_profile_id: member.profile?.id,
                  resolved_memberId: memberId 
                });
              }
              // Exclude host's own profile ID and ensure ID exists
              if (memberId && memberId !== profile.id) {
                allMemberIds.add(memberId);
              }
            });
          });
          
        }

        const uniqueMemberIds = Array.from(allMemberIds);
          
          if (import.meta.env.DEV) console.log('[R@lly Debug] Unique member IDs to invite:', uniqueMemberIds);
          
        if (uniqueMemberIds.length > 0) {
          try {
            await createInvites.mutateAsync({
              eventId: result.id,
              profileIds: uniqueMemberIds,
              eventTitle: data.title,
            });
            toast.success(`Invited ${uniqueMemberIds.length} friend${uniqueMemberIds.length > 1 ? 's' : ''}!`);
          } catch (inviteError: any) {
            // Don't fail the whole creation if invites fail
            console.error('Failed to send invites:', inviteError);
            toast.error('R@lly created but some invites failed');
          }
        } else {
          if (import.meta.env.DEV) console.log('[R@lly Debug] No members to invite (all excluded or empty)');
        }
        
        // Fire confetti celebration!
        fireRallyConfetti();
        
        toast.success('Quick R@lly started! 🎉');
        
        // Close dialog and navigate to event
        handleClose();
        navigate(`/events/${result.id}`);
        
      } catch (error: any) {
        if (!error?.code && !/row-level security/i.test(error?.message ?? '')) {
          toast.error(error?.message || 'Failed to create R@lly');
        }
      } finally {
        isSubmittingRef.current = false;
      }
    };

    const selectedEventType = form.watch('event_type');

    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else setOpen(true);
      }}>
        <DialogTrigger asChild>
          {trigger || (
            <Button 
              ref={ref}
              className="bg-gradient-to-r from-primary/90 via-primary to-primary/90 text-white hover:opacity-90 rounded-full shadow-lg shadow-primary/30 font-montserrat font-extrabold px-6 transition-all hover:scale-105"
            >
              <Zap className="h-5 w-5 mr-2" strokeWidth={2.5} fill="currentColor" />
              Quick R@lly
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-md p-0 max-h-[85dvh] flex flex-col gap-0">
          <ErrorBoundary name="QuickRallyDialog">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle className="flex items-center gap-3 font-montserrat text-xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-primary flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" strokeWidth={2.5} fill="currentColor" />
              </div>
              <span className="font-bold">Quick R@lly</span>
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
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

              {/* Event Type - Collapsible for quick flow */}
              <Collapsible open={showEventType} onOpenChange={setShowEventType}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    <span className="flex items-center gap-2">
                      Event type: <span className="font-medium text-foreground">{getEventTypeLabel(selectedEventType)}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showEventType ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2">
                  <FormField
                    control={form.control}
                    name="event_type"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {EVENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>

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

              {recentlyFriended.length > 0 && (
                <div className="space-y-2">
                  <FormLabel>Recently Friended</FormLabel>
                  <ScrollArea className="h-24">
                    <div className="flex flex-wrap gap-2 pb-2">
                      {recentlyFriended.map((friend: any) => {
                        const isSelected = selectedFriendIds.includes(friend.profile_id);
                        return (
                          <button
                            key={friend.profile_id}
                            type="button"
                            onClick={() => toggleFriendSelection(friend.profile_id)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-full border transition-colors',
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-primary/10 hover:bg-primary/20 border-primary/30'
                            )}
                          >
                            <UserPlus className="h-3 w-3" />
                            <span className="text-sm font-medium">{friend.display_name || 'R@lly Friend'}</span>
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {rallyFriends.length > 0 && (
                <div className="space-y-2">
                  <FormLabel>R@lly Friends (optional)</FormLabel>
                  <ScrollArea className="h-24">
                    <div className="flex flex-wrap gap-2 pb-2">
                      {rallyFriends.map((friend) => {
                        const isSelected = selectedFriendIds.includes(friend.id);
                        return (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => toggleFriendSelection(friend.id)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-full border transition-colors',
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted hover:bg-muted/80'
                            )}
                          >
                            <UserPlus className="h-3 w-3" />
                            <span className="text-sm font-medium">{friend.display_name || 'R@lly Friend'}</span>
                            {isSelected && <Check className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Squad Selection - Multi-select */}
              {squads && squads.length > 0 ? (
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
                  {selectedSquads.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      You can invite people now or after the R@lly is created.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">No squads yet.</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Start the R@lly first, then invite people by contact, phone number, or share link.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground hover:opacity-90"
                aria-busy={createEvent.isPending || createInvites.isPending || isSubmittingRef.current}
                disabled={createEvent.isPending || createInvites.isPending || isSubmittingRef.current}
              >
                {createEvent.isPending || createInvites.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...</>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {selectedTime === 'now' ? 'Start Rally Now' : 'Schedule Rally'}
                  </>
                )}
              </Button>
            </form>
          </Form>
          </ErrorBoundary>
        </DialogContent>
      </Dialog>
    );
  }
);
