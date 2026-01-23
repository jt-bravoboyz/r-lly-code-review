import { useState, useEffect, useCallback } from 'react';
import { Car, Shield, AlertTriangle, Users, Info, Loader2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LocationSearch } from '@/components/location/LocationSearch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { sendDDVolunteeredMessage } from '@/hooks/useSystemMessages';
import { StructuredLocation, isValidLocation } from '@/types/location';

interface EventAttendee {
  profile_id: string;
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  has_ride?: boolean;
}

interface ExistingRide {
  id: string;
  available_seats: number;
  notes?: string | null;
  pickup_location: string | null;
}

interface DDSetupDialogProps {
  eventId: string;
  eventLocationName?: string;
  eventLocationLat?: number;
  eventLocationLng?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  mode?: 'full' | 'setup' | 'edit';
  existingRide?: ExistingRide | null;
}

export function DDSetupDialog({
  eventId,
  eventLocationName,
  eventLocationLat,
  eventLocationLng,
  open,
  onOpenChange,
  onComplete,
  mode = 'full',
  existingRide,
}: DDSetupDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Step management
  const [step, setStep] = useState<'disclaimer' | 'setup'>(mode === 'full' ? 'disclaimer' : 'setup');
  
  // Disclaimer state
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acknowledgedLiability, setAcknowledgedLiability] = useState(false);
  
  // Ride setup state
  const [availableSeats, setAvailableSeats] = useState(existingRide?.available_seats || 4);
  const [notes, setNotes] = useState(existingRide?.notes || '');
  const [priorityPeople, setPriorityPeople] = useState<string[]>([]);
  const [pickupLocation, setPickupLocation] = useState<StructuredLocation | null>(null);
  const [pickupInputText, setPickupInputText] = useState(existingRide?.pickup_location || eventLocationName || '');
  
  // Attendees state
  const [eventAttendees, setEventAttendees] = useState<EventAttendee[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [attendeesError, setAttendeesError] = useState<string | null>(null);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draft storage key
  const draftKey = `dd_setup_draft_${eventId}`;

  // Restore draft on open
  useEffect(() => {
    if (open && mode !== 'edit') {
      const draft = sessionStorage.getItem(draftKey);
      if (draft) {
        try {
          const { availableSeats: s, priorityPeople: p, notes: n } = JSON.parse(draft);
          setAvailableSeats(s);
          setPriorityPeople(p || []);
          setNotes(n || '');
        } catch (e) {
          console.error('Failed to restore draft:', e);
        }
      }
    }
  }, [open, draftKey, mode]);

  // Save draft on changes
  useEffect(() => {
    if (open && step === 'setup' && mode !== 'edit') {
      const draft = { availableSeats, priorityPeople, notes };
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [open, step, availableSeats, priorityPeople, notes, draftKey, mode]);

  // Fetch eligible attendees (excluding self and those with rides)
  useEffect(() => {
    const fetchAttendees = async () => {
      if (!profile?.id || step !== 'setup' || !open) return;
      
      setIsLoadingAttendees(true);
      setAttendeesError(null);
      
      try {
        // Get all attendees for this event
        const { data: attendees, error: attendeesError } = await supabase
          .from('event_attendees')
          .select(`
            profile_id,
            profile:profiles!event_attendees_profile_id_fkey(id, display_name, avatar_url)
          `)
          .eq('event_id', eventId)
          .neq('profile_id', profile.id);

        if (attendeesError) throw attendeesError;

        // Get passengers who already have accepted rides for this event
        const { data: passengers } = await supabase
          .from('ride_passengers')
          .select('passenger_id, rides!inner(event_id)')
          .eq('rides.event_id', eventId)
          .eq('status', 'accepted');

        const passengersWithRides = new Set(passengers?.map(p => p.passenger_id) || []);

        // Filter and mark attendees
        const eligibleAttendees = (attendees || [])
          .map(a => ({
            profile_id: a.profile_id,
            profile: a.profile as any,
            has_ride: passengersWithRides.has(a.profile_id),
          }))
          .filter(a => !a.has_ride);

        setEventAttendees(eligibleAttendees as EventAttendee[]);
      } catch (error: any) {
        console.error('Failed to fetch attendees:', error);
        setAttendeesError(error.message || 'Failed to load attendees');
      } finally {
        setIsLoadingAttendees(false);
      }
    };

    fetchAttendees();
  }, [eventId, profile?.id, step, open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      if (mode === 'full') {
        setStep('disclaimer');
        setAcceptedTerms(false);
        setAcknowledgedLiability(false);
      }
      // Don't reset ride config - keep draft
    }
  }, [open, mode]);

  // Handle disclaimer acceptance
  const handleDisclaimerAccept = () => {
    if (acceptedTerms && acknowledgedLiability) {
      setStep('setup');
    }
  };

  // Toggle priority person selection
  const togglePriorityPerson = useCallback((profileId: string) => {
    setPriorityPeople(prev => 
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  }, []);

  // Validate priority count vs seats
  const priorityExceedsSeats = priorityPeople.length > availableSeats;

  // Get event chat ID helper
  const getEventChatId = async (eventId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('chats')
      .select('id')
      .or(`event_id.eq.${eventId},linked_event_id.eq.${eventId}`)
      .maybeSingle();
    return data?.id || null;
  };

  // Handle complete submission
  const handleComplete = async () => {
    if (!profile?.id) {
      toast.error('You must be logged in');
      return;
    }

    // Validate pickup if event location is missing
    const needsPickup = !eventLocationLat || !eventLocationLng;
    if (needsPickup && !pickupLocation && !isValidLocation(pickupLocation)) {
      toast.error('Please select a pickup location');
      return;
    }

    if (priorityExceedsSeats) {
      toast.error('Priority people cannot exceed available seats');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Record disclaimer acceptance (only in full mode)
      if (mode === 'full') {
        await supabase.from('dd_disclaimer_acceptances').upsert({
          profile_id: profile.id,
          event_id: eventId,
          disclaimer_version: '1.0',
          app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
        }, { onConflict: 'profile_id,event_id' });
      }

      // 2. Set is_dd = true (skip in edit mode)
      if (mode !== 'edit') {
        const { error: ddError } = await supabase
          .from('event_attendees')
          .update({ is_dd: true })
          .eq('event_id', eventId)
          .eq('profile_id', profile.id);

        if (ddError) throw ddError;
      }

      // 3. Create or update ride
      const pickupLocationStr = pickupLocation?.formatted_address || eventLocationName || 'Event Location';
      const pickupLat = pickupLocation?.lat || eventLocationLat || null;
      const pickupLng = pickupLocation?.lng || eventLocationLng || null;

      let rideId: string;

      if (existingRide) {
        // Update existing ride
        const { error: updateError } = await supabase
          .from('rides')
          .update({
            available_seats: availableSeats,
            notes: notes || null,
            pickup_location: pickupLocationStr,
          })
          .eq('id', existingRide.id);

        if (updateError) throw updateError;
        rideId = existingRide.id;
      } else {
        // Check for existing active ride first (idempotency)
        const { data: existingActiveRide } = await supabase
          .from('rides')
          .select('id')
          .eq('event_id', eventId)
          .eq('driver_id', profile.id)
          .in('status', ['active', 'full', 'paused'])
          .maybeSingle();

        if (existingActiveRide) {
          // Update existing ride instead
          const { error: updateError } = await supabase
            .from('rides')
            .update({
              available_seats: availableSeats,
              notes: notes || null,
              pickup_location: pickupLocationStr,
            })
            .eq('id', existingActiveRide.id);

          if (updateError) throw updateError;
          rideId = existingActiveRide.id;
        } else {
          // Create new ride
          const { data: newRide, error: createError } = await supabase
            .from('rides')
            .insert({
              driver_id: profile.id,
              event_id: eventId,
              available_seats: availableSeats,
              destination: 'Safe rides home',
              pickup_location: pickupLocationStr,
              status: 'active',
              notes: notes || null,
            })
            .select('id')
            .single();

          if (createError) {
            // Handle unique constraint violation gracefully
            if (createError.code === '23505') {
              toast.info('Your ride is already set up');
              queryClient.invalidateQueries({ queryKey: ['rides'] });
              queryClient.invalidateQueries({ queryKey: ['event-dds', eventId] });
              onComplete();
              return;
            }
            throw createError;
          }
          rideId = newRide.id;
        }
      }

      // 4. Create priority offers (15-minute exclusive window)
      if (priorityPeople.length > 0 && rideId) {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        
        const offers = priorityPeople.map(profileId => ({
          ride_id: rideId,
          to_profile_id: profileId,
          status: 'offered',
          expires_at: expiresAt,
        }));

        const { error: offersError } = await supabase
          .from('ride_offers')
          .upsert(offers, { onConflict: 'ride_id,to_profile_id' });

        if (offersError) {
          console.error('Failed to create priority offers:', offersError);
          // Don't fail the whole flow
        }

        // Send priority notifications
        for (const profileId of priorityPeople) {
          try {
            await supabase.from('notifications').insert({
              profile_id: profileId,
              type: 'priority_ride_offer',
              title: 'Priority Ride Offer! 🚗',
              body: `${profile.display_name || 'A DD'} is offering you a ride first! Accept within 15 minutes.`,
              data: { ride_id: rideId, event_id: eventId, expires_at: expiresAt },
            });
          } catch (notifError) {
            console.error('Failed to send priority notification:', notifError);
          }
        }
      }

      // 5. Send system message (only for new DD)
      if (mode !== 'edit') {
        const chatId = await getEventChatId(eventId);
        if (chatId) {
          await sendDDVolunteeredMessage(chatId, profile.display_name || 'Someone');
        }
      }

      // Clear draft
      sessionStorage.removeItem(draftKey);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['rides'] });
      queryClient.invalidateQueries({ queryKey: ['event-dds', eventId] });
      queryClient.invalidateQueries({ queryKey: ['is-dd', eventId] });
      queryClient.invalidateQueries({ queryKey: ['dd-ride', eventId] });

      toast.success(mode === 'edit' ? 'Ride updated!' : 'You\'re now the DD! 🚗', {
        description: mode === 'edit' ? undefined : 'Thank you for keeping everyone safe!',
      });

      onComplete();
    } catch (error: any) {
      console.error('DD setup failed:', error);
      toast.error(error.message || 'Failed to complete DD setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const needsPickupSelection = !eventLocationLat || !eventLocationLng;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {step === 'disclaimer' ? (
          // Disclaimer Step
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-montserrat text-xl">
                <Shield className="h-6 w-6 text-primary" />
                DD Safety Agreement
              </DialogTitle>
              <DialogDescription>
                Please read and accept before becoming a Designated Driver
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Safety Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">Important Safety Notice</p>
                    <p className="text-amber-700 text-xs mt-1">
                      As a Designated Driver, you agree to remain sober and drive safely.
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-4 text-sm">
                <p className="font-medium">By accepting this agreement, you confirm:</p>
                <ul className="space-y-2 text-muted-foreground list-disc pl-5">
                  <li>You will not consume alcohol or any impairing substances</li>
                  <li>You have a valid driver's license and car insurance</li>
                  <li>Your vehicle is safe and legally registered</li>
                  <li>You will drive responsibly and follow all traffic laws</li>
                  <li>You are voluntarily offering this service</li>
                </ul>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  />
                  <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                    I have read and agree to the R@lly DD terms and will remain sober
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="liability"
                    checked={acknowledgedLiability}
                    onCheckedChange={(checked) => setAcknowledgedLiability(checked === true)}
                  />
                  <Label htmlFor="liability" className="text-sm leading-relaxed cursor-pointer">
                    I understand that R@lly is not liable for my actions as a driver
                  </Label>
                </div>
              </div>

              <Button
                className="w-full mt-4"
                onClick={handleDisclaimerAccept}
                disabled={!acceptedTerms || !acknowledgedLiability}
              >
                <Shield className="h-4 w-4 mr-2" />
                Accept & Continue
              </Button>
            </div>
          </>
        ) : (
          // Setup Step
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-montserrat text-xl">
                <Car className="h-6 w-6 text-primary" />
                {mode === 'edit' ? 'Edit Your Ride' : 'DD Ride Setup'}
              </DialogTitle>
              <DialogDescription>
                Configure your ride availability for this event
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Auto-populated info */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">📍 Pickup:</span>
                  <span className="font-medium">{eventLocationName || 'Event Location'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">🏠 Destination:</span>
                  <span className="font-medium">Safe rides home</span>
                </div>
              </div>

              {/* Pickup Location (only if event location missing) */}
              {needsPickupSelection && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Pickup Location <span className="text-destructive">*</span>
                  </Label>
                  <LocationSearch
                    value={pickupInputText}
                    onChange={(v) => {
                      setPickupInputText(v);
                      if (pickupLocation && v !== pickupLocation.location_name) {
                        setPickupLocation(null);
                      }
                    }}
                    onLocationSelect={(loc) => {
                      setPickupLocation({
                        location_name: loc.name,
                        place_id: loc.place_id || null,
                        formatted_address: loc.address,
                        lat: loc.lat,
                        lng: loc.lng,
                      });
                      setPickupInputText(loc.name);
                    }}
                    placeholder="Search for pickup location..."
                    showMapPreview={false}
                  />
                  {pickupInputText && !pickupLocation && (
                    <p className="text-xs text-amber-600">Please select a location from the dropdown</p>
                  )}
                </div>
              )}

              {/* Available Seats */}
              <div className="space-y-2">
                <Label htmlFor="seats">Available Seats</Label>
                <Input
                  id="seats"
                  type="number"
                  min="1"
                  max="8"
                  value={availableSeats}
                  onChange={(e) => setAvailableSeats(Math.max(1, Math.min(8, Number(e.target.value))))}
                />
              </div>

              {/* Priority People Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Priority Offers (Optional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Select people to offer rides to first (15-min exclusive window)
                </p>
                
                {isLoadingAttendees ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : attendeesError ? (
                  <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                    {attendeesError}
                  </div>
                ) : eventAttendees.length > 0 ? (
                  <ScrollArea className="h-40 rounded-lg border p-2">
                    <div className="space-y-1">
                      {eventAttendees.map((attendee) => (
                        <div
                          key={attendee.profile_id}
                          onClick={() => togglePriorityPerson(attendee.profile_id)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={priorityPeople.includes(attendee.profile_id)}
                            onCheckedChange={() => togglePriorityPerson(attendee.profile_id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                              {attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{attendee.profile?.display_name || 'Unknown'}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No other attendees to select
                  </p>
                )}

                {priorityExceedsSeats && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Selected people ({priorityPeople.length}) exceeds available seats ({availableSeats})
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g., Blue Honda Civic, can fit 4 comfortably..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Info Banner */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex gap-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {priorityPeople.length > 0
                    ? `${priorityPeople.length} people will get priority access to your ride for 15 minutes before it opens to everyone.`
                    : 'Your ride will be visible to all event attendees.'}
                </p>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full"
                onClick={handleComplete}
                disabled={isSubmitting || priorityExceedsSeats || (needsPickupSelection && !pickupLocation)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {mode === 'edit' ? 'Updating...' : 'Setting up...'}
                  </>
                ) : (
                  <>
                    <Car className="h-4 w-4 mr-2" />
                    {mode === 'edit' ? 'Update Ride' : 'Start Offering Rides'}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
