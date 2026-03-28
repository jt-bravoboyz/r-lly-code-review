import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getEventTypeLabel, getEventTypeEmoji, getEventTypeVibe } from '@/lib/eventTypes';
import { trackEvent } from '@/lib/analytics';
import { ArrowLeft, Calendar, MapPin, Users, Beer, Check, X, MessageCircle, Navigation, Home, Plus, Zap, Crown, UserPlus, Car, Play, Moon, PartyPopper, Link2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEvent, useJoinEvent, useLeaveEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useRides } from '@/hooks/useRides';
import { useAuth } from '@/hooks/useAuth';
import { useMyAttendeeStatus, useIsEventSafetyComplete } from '@/hooks/useSafetyStatus';
import { useCohosts } from '@/hooks/useCohosts';
import { useMyDDRequest, useEventDDs } from '@/hooks/useDDManagement';
import { useStartRally, useEndRally, useCompleteRally } from '@/hooks/useAfterRally';
import { useAutoArrival } from '@/hooks/useAutoArrival';
import { useAfterRallyTransition } from '@/hooks/useAfterRallyTransition';
import { RideCard } from '@/components/rides/RideCard';
import { RiderLine } from '@/components/rides/RiderLine';
import { CreateRideDialog } from '@/components/rides/CreateRideDialog';
import { RequestRideDialog } from '@/components/rides/RequestRideDialog';
import { DDRequestBanner } from '@/components/rides/DDRequestBanner';
import { DDVolunteerButton } from '@/components/rides/DDVolunteerButton';
import { EventChat } from '@/components/chat/EventChat';
import { LiveTracking } from '@/components/tracking/LiveTracking';
import { AttendeeMap } from '@/components/tracking/AttendeeMap';
import { LiveUpdates } from '@/components/events/LiveUpdates';
import { RallyHomeButton } from '@/components/home/RallyHomeButton';
import { SafetyTracker } from '@/components/home/SafetyTracker';
import { HostSafetyDashboard } from '@/components/home/HostSafetyDashboard';
import { DDArrivedButton } from '@/components/home/DDArrivedButton';
import { DDDropoffButton } from '@/components/rides/DDDropoffButton';
import { useIsDD } from '@/hooks/useDDManagement';
import { AddCohostDialog } from '@/components/events/AddCohostDialog';
import { BarHopStopsMap } from '@/components/tracking/BarHopStopsMap';
import { BarHopControls } from '@/components/events/BarHopControls';
import { BarHopStopManager } from '@/components/events/BarHopStopManager';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import { useBarHopStopsRealtime } from '@/hooks/useBarHopStopsRealtime';
import { LocationMapPreview } from '@/components/location/LocationMapPreview';
import { FirstTimeWelcomeDialog } from '@/components/events/FirstTimeWelcomeDialog';
import { InviteToEventDialog } from '@/components/events/InviteToEventDialog';
import { AfterRallyOptInDialog } from '@/components/events/AfterRallyOptInDialog';
import { SafetyCloseoutDialog } from '@/components/events/SafetyCloseoutDialog';
import { EndRallyDialog } from '@/components/events/EndRallyDialog';
import { EditEventLocationDialog } from '@/components/events/EditEventLocationDialog';
import { LocationSharingModal } from '@/components/events/LocationSharingModal';
import { SafetyChoiceModal } from '@/components/events/SafetyChoiceModal';
import { RidesSelectionModal } from '@/components/events/RidesSelectionModal';
import { AfterRallyCard } from '@/components/events/AfterRallyCard';
import { RallyHeroMediaCarousel } from '@/components/events/RallyHeroMediaCarousel';
import { RallyCompleteOverlay } from '@/components/events/RallyCompleteOverlay';
import { EventPhotoFeed } from '@/components/events/EventPhotoFeed';
import { useMyRallyHomePrompt } from '@/hooks/useRallyHomePrompt';
import { PendingJoinRequests } from '@/components/events/PendingJoinRequests';
import { TransportModeSelector } from '@/components/events/TransportModeSelector';
import { PaymentGateDialog } from '@/components/events/PaymentGateDialog';
import { RideshareDrawer } from '@/components/rides/RideshareDrawer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VIBE_STYLES: Record<string, string> = {
  orange: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  purple: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  green: "bg-green-500/10 text-green-600 border-green-500/30",
  blue: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  red: "bg-red-500/10 text-red-600 border-red-500/30",
  default: "bg-muted text-foreground border-border",
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const { data: rides } = useRides(id);
  const { updates } = useEventRealtime(id);
  const { data: myDDRequest } = useMyDDRequest(id);
  const { data: eventDDs } = useEventDDs(id);
  const { data: cohosts } = useCohosts(id);
  useBarHopStopsRealtime(id); // Real-time updates for bar hop stops
  const joinEvent = useJoinEvent();
  const leaveEvent = useLeaveEvent();
  const updateEvent = useUpdateEvent();
  const startRally = useStartRally();
  const endRally = useEndRally();
  const completeRally = useCompleteRally();
  const { data: isDD } = useIsDD(id);
  const { triggerAfterRallyTransition } = useAfterRallyTransition();
  const [showFirstTimeWelcome, setShowFirstTimeWelcome] = useState(false);
  const [showAfterRallyOptIn, setShowAfterRallyOptIn] = useState(false);
  const [showSafetyCloseout, setShowSafetyCloseout] = useState(false);
  const [isBarHopTransitionPoint, setIsBarHopTransitionPoint] = useState(false);
  const [showEndRallyDialog, setShowEndRallyDialog] = useState(false);
  const [showRallyHomeDialog, setShowRallyHomeDialog] = useState(false);
  // Safety choice modal states for join-time gating
  const [showSafetyChoice, setShowSafetyChoice] = useState(false);
  const [showRidesSelection, setShowRidesSelection] = useState(false);
  const [savingSafetyChoice, setSavingSafetyChoice] = useState(false);
  const [showLocationSharingModal, setShowLocationSharingModal] = useState(false);
  const afterRallyTriggeredRef = useRef(false);
  const hasTrackedViewRef = useRef(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showRallyComplete, setShowRallyComplete] = useState(false);
  const [showTransportSelector, setShowTransportSelector] = useState(false);
  const [showPaymentGate, setShowPaymentGate] = useState(false);
  const [showRideshareDrawer, setShowRideshareDrawer] = useState(false);

  const handleRallyCompleteDone = useCallback(() => {
    setShowRallyComplete(false);
    navigate('/', { replace: true });
  }, [navigate]);
  
  // ARCH-4: Use consolidated hook instead of inline query
  // ARCH-2: DB flags for gating instead of sessionStorage
  const { data: myAttendee, refetch: refetchMyAttendee } = useMyAttendeeStatus(id);
  const { data: safetyComplete } = useIsEventSafetyComplete(id);
  
  // Auto-arrival detection for R@lly Home - only active after event ends
  useAutoArrival({ 
    eventId: id || '', 
    eventStatus: event?.status 
  });

  // Check for first-time welcome flag (set when user auto-joins via invite code)
  useEffect(() => {
    const welcomeEventId = sessionStorage.getItem('showFirstTimeWelcome');
    if (welcomeEventId && welcomeEventId === id) {
      sessionStorage.removeItem('showFirstTimeWelcome');
      // Small delay to let page load
      const timer = setTimeout(() => {
        setShowFirstTimeWelcome(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [id]);

  // POL-2: Debug logging wrapped in dev check + production analytics
  useEffect(() => {
    if (!event?.id) return;
    if (import.meta.env.DEV) {
      console.log('[R@lly Debug] EventDetail loaded:', { 
        event_id: event.id,
        event_status: event.status,
        attendee_count: event.attendees?.length || 0,
        is_barhop: event.is_barhop,
      });
    }
    if (!hasTrackedViewRef.current) {
      hasTrackedViewRef.current = true;
      trackEvent('event_viewed', {
        event_id: event.id,
        event_type: event.event_type,
        status: event.status,
        is_barhop: event.is_barhop,
        attendee_count: event.attendees?.length || 0,
        simple_mode: event.is_quick_rally,
      });
    }
  }, [event?.id]);

  // Calculate derived values after all hooks (to avoid conditional hook calls)
  const activeProfile = profile;
  const isAttending = event?.attendees?.some(a => a.profile?.id === activeProfile?.id) ?? false;
  const isCreator = event?.creator?.id === activeProfile?.id;
  const isCohost = cohosts?.some(c => c.profile_id === activeProfile?.id) ?? false;
  const canManage = isCreator || isCohost;
  const attendeeCount = event?.attendees?.length || 0;
  const isLiveEvent = event ? new Date(event.start_time) <= new Date() : false;
  const isScheduled = event?.status === 'scheduled' || !event?.status;
  const isLive = event?.status === 'live';
  const isAfterRally = event?.status === 'after_rally';
  
  // ARCH-2: Use DB flags instead of sessionStorage for safety choice gating
  const needsSafetyChoice = isAttending && 
    myAttendee?.going_home_at === null && 
    myAttendee?.not_participating_rally_home_confirmed === null &&
    !myAttendee?.is_dd &&
    !myAttendee?.needs_ride &&
    !myAttendee?.location_prompt_shown &&
    event?.status !== 'completed';

  const isSimpleMode = !event?.is_barhop &&
    (eventDDs?.length ?? 0) === 0 &&
    !isLive &&
    !isAfterRally;
  
  // Show safety choice modal on page load for existing attendees who haven't chosen yet
  useEffect(() => {
    if (needsSafetyChoice && !showSafetyChoice && !showRidesSelection && !showLocationSharingModal) {
      // ARCH-2: No sessionStorage gating - DB flags handle deduplication
      const timer = setTimeout(() => {
        setShowSafetyChoice(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [needsSafetyChoice, showSafetyChoice, showRidesSelection, showLocationSharingModal]);
  
  // R@lly Home prompt status for current user
  const myPromptStatus = useMyRallyHomePrompt(id);
  

  // Show After R@lly opt-in dialog when event is in after_rally status
  // Dialog shows on NORMAL screen - user must opt-in to see purple theme
  // Always show if user hasn't opted in yet (no sessionStorage blocking)
  useEffect(() => {
    if (isAfterRally && (isAttending || isCreator) && myAttendee?.after_rally_opted_in !== true) {
      // Only set once per page load to avoid infinite re-triggers
      setShowAfterRallyOptIn(true);
    }
  }, [isAfterRally, isAttending, isCreator, myAttendee?.after_rally_opted_in]);

  // Trigger the rainbow transition ONLY when user opts in (not on event status change)
  // This creates the dramatic visual effect after they click "I'm In!"
  const showAfterRallyTheme = isAfterRally && myAttendee?.after_rally_opted_in === true;
  
  useEffect(() => {
    if (showAfterRallyTheme) {
      const transitionKey = `after_rally_transition_${id}`;
      if (!sessionStorage.getItem(transitionKey) && !afterRallyTriggeredRef.current) {
        sessionStorage.setItem(transitionKey, 'true');
        afterRallyTriggeredRef.current = true;
        // Small delay to sync with CSS animation start
        setTimeout(() => {
          triggerAfterRallyTransition();
        }, 200);
      }
    }
  }, [showAfterRallyTheme, id, triggerAfterRallyTransition]);

  // Handler for when user declines After R@lly and wants to head home
  const handleHeadHomeFromAfterRally = () => {
    setShowAfterRallyOptIn(false);
    // Open the R@lly Home dialog to help them get home safely
    setShowRallyHomeDialog(true);
    // Refetch attendee status
    refetchMyAttendee();
  };

  if (authLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] pb-20">
        <Header afterRallyMode={false} />
        <main className="container py-6 space-y-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!event) {
    return <Navigate to="/events" replace />;
  }

  const handleJoin = async () => {
    if (!profile) return;
    // If event has a cover charge, show payment gate first
    if ((event as any)?.cover_charge > 0 && !showPaymentGate) {
      setShowPaymentGate(true);
      return;
    }
    try {
      const result = await joinEvent.mutateAsync({ eventId: event.id, profileId: profile.id });
      
      // For paid events, default to signal-only mode (privacy)
      if ((event as any)?.cover_charge > 0) {
        await supabase
          .from('event_attendees')
          .update({ share_location: false } as any)
          .eq('event_id', event.id)
          .eq('profile_id', profile.id);
      }
      
      // Check if successfully joined (attending status) - show transport selector then safety choice
      if (result?.status === 'attending') {
        toast.success("You're in! 🎉");
        setShowTransportSelector(true);
      } else if (result?.status === 'pending') {
        toast.success('Request sent! Waiting for host approval...');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to join event');
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentGate(false);
    // After payment, proceed with join
    handleJoin();
  };

  // Handler extraction: startRally (variable assignment only)
  const handleStartRally = async () => {
    try {
      await startRally.mutateAsync(event.id);
      toast.success('R@lly is live! 🎉');
      sessionStorage.removeItem(`rally_home_prompt_${event.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start rally');
    }
  };

  // Handler for safety choice: "I'm good" (self-transport)
  const handleDoingItMyself = async () => {
    if (!profile) return;
    setSavingSafetyChoice(true);
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({ not_participating_rally_home_confirmed: true })
        .eq('event_id', event.id)
        .eq('profile_id', profile.id);
      
      if (error) throw error;
      
      toast.success('Got it! Have a great time 🎉');
      trackEvent('safety_confirmed', { event_id: event.id, choice: 'self_transport' });
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      setShowSafetyChoice(false);
      // Show location sharing prompt after safety choice
      setShowLocationSharingModal(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save preference');
    } finally {
      setSavingSafetyChoice(false);
    }
  };

  const handleLeave = async () => {
    if (!profile) return;
    try {
      await leaveEvent.mutateAsync({ eventId: event.id, profileId: profile.id });
      toast.success('Left the event');
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave event');
    }
  };

  return (
    <div className={`min-h-[100dvh] pb-20 ${showAfterRallyTheme ? 'after-rally-mode' : ''}`}>
      <Header afterRallyMode={showAfterRallyTheme} />
      
      <main className="container py-6 space-y-6 relative z-10">
        {/* Back Button */}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/events">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
          </Link>
        </Button>

        {/* Hero Media Carousel - above title */}
        <RallyHeroMediaCarousel eventId={event.id} canManage={canManage} />

        {/* Live Updates Banner */}
        {updates.length > 0 && <LiveUpdates updates={updates} />}

        {/* Event Header */}
        <div className="rounded-2xl bg-card/50 border border-border/50 p-4 space-y-3">

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`border ${VIBE_STYLES[getEventTypeVibe(event.event_type)] ?? VIBE_STYLES.default}`}>
                  {getEventTypeLabel(event.event_type)}
                </Badge>
                {event.is_quick_rally && (
                  <Badge className="bg-secondary/20 text-secondary border-0">
                    <Zap className="h-3 w-3 mr-1" />
                    Quick
                  </Badge>
                )}
                {isLive && (
                  <Badge className="bg-green-500/20 text-green-600 border-0">
                    <Play className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                )}
                {isAfterRally && (
                  <Badge className="bg-purple-500/20 text-purple-600 border-0">
                    <Moon className="h-3 w-3 mr-1" />
                    After R@lly
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                {getEventTypeEmoji(event.event_type) && (
                  <span className="mr-1.5">{getEventTypeEmoji(event.event_type)}</span>
                )}
                {event.title}
              </h1>
              {/* Safety completion badge */}
              {isAfterRally && safetyComplete && (
                <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Everyone made it home safe
                </p>
              )}
              {/* Social momentum indicators with avatar stack */}
              {attendeeCount > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center -space-x-2">
                    {(event.attendees ?? []).slice(0, 5).map((a) => (
                      <Avatar key={a.id} className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={a.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px]">
                          {a.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {attendeeCount} confirmed
                    {(eventDDs?.length ?? 0) > 0 && ` · ${eventDDs?.length ?? 0} DDs`}
                  </p>
                  {attendeeCount >= 3 && (
                    <p className="text-[10px] text-muted-foreground italic mt-0.5">
                      {isCreator ? "Your crew is locked in." : "The crew's growing."}
                    </p>
                  )}
                </div>
              )}
              {/* Header context line */}
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(event.start_time), 'EEEE')} · {format(new Date(event.start_time), 'h:mm a')}{event.location_name ? ` · ${event.location_name}` : ''}
              </p>
              {/* Copy invite link */}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground gap-1 px-0 h-auto py-0.5 mt-1"
                onClick={() => {
                   navigator.clipboard.writeText(`${window.location.origin}/join/${event.invite_code}?r=${profile?.id || ''}`);
                   trackEvent('invite_link_copied', { event_id: event.id });
                   toast.success('Link copied!');
                }}
              >
                <Link2 className="h-3 w-3" /> Copy invite link
              </Button>
            </div>
            <InviteToEventDialog
              eventId={event.id}
              eventTitle={event.title}
              inviteCode={event.invite_code}
              existingAttendeeIds={event.attendees?.map(a => a.profile?.id).filter(Boolean) as string[] || []}
              trigger={
                <Button variant="ghost" size="icon">
                  <UserPlus className="h-5 w-5" />
                </Button>
              }
            />
          </div>

          {event.description && (
            <p className="text-muted-foreground">{event.description}</p>
          )}

          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{format(new Date(event.start_time), 'EEEE, MMMM d · h:mm a')}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{event.location_name || 'No location set'}</span>
              {canManage && (
                <EditEventLocationDialog
                  eventId={event.id}
                  currentLocationName={event.location_name}
                  currentLat={event.location_lat}
                  currentLng={event.location_lng}
                />
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>
                {attendeeCount} attending
                {event.max_attendees && ` · ${event.max_attendees} max`}
              </span>
            </div>
          </div>

          {/* Location Map Preview - Show if event has coordinates */}
          {event.location_lat && event.location_lng && !(isAfterRally && event.is_barhop) && (
            <LocationMapPreview
              lat={event.location_lat}
              lng={event.location_lng}
              name={event.location_name || undefined}
              address={event.location_name || undefined}
              height="h-40"
              interactive={true}
              showDirections={true}
            />
          )}

          {/* Host and Co-hosts */}
          {event.creator && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={event.creator.avatar_url || undefined} />
                  <AvatarFallback>
                    {event.creator.display_name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Hosted by</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{event.creator.display_name}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      <Crown className="h-2.5 w-2.5 mr-1" />
                      Host
                    </Badge>
                  </div>
                </div>
              </div>
              {isCreator && event.attendees && (
                <AddCohostDialog 
                  eventId={event.id} 
                  creatorId={event.creator.id} 
                  attendees={event.attendees} 
                />
              )}
            </div>
          )}

          {/* Co-hosts */}
          {cohosts && cohosts.length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-1.5">Co-hosts</p>
              <div className="flex flex-wrap gap-2">
                {cohosts.map((cohost) => (
                  <div key={cohost.id} className="flex items-center gap-1.5 bg-muted/50 rounded-full pl-1 pr-2.5 py-0.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={cohost.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[9px]">
                        {cohost.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{cohost.profile?.display_name || 'Unknown'}</span>
                    <Crown className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Join Requests - Only for hosts, right below host info */}
          {canManage && <PendingJoinRequests eventId={event.id} />}


          {/* Primary Action Bar */}
          {!isCreator && !isAttending && (
            <div className="pt-2">
              <Button 
                className="w-full btn-gradient-primary h-14 flex-col gap-0.5 transition-transform active:scale-[0.98]"
                onClick={handleJoin}
                disabled={joinEvent.isPending}
              >
                <span className="font-bold text-base font-montserrat">
                  {(event as any)?.cover_charge > 0 ? `PAY $${Number((event as any).cover_charge).toFixed(2)} & JOIN` : 'JOIN R@LLY'}
                </span>
                <span className="text-xs opacity-80 font-normal">
                  {(event as any)?.cover_charge > 0 ? 'Cover charge required to enter' : "Jump in — your crew is waiting."}
                </span>
              </Button>
            </div>
          )}
          {isAttending && !isCreator && (
            <p className="text-xs text-green-600 font-medium text-center mt-1 animate-text-fade-in">
              You're in. Let's go.
            </p>
          )}
          {canManage && isScheduled && isLiveEvent && (
            <div className="pt-2">
              <Button 
                className="w-full btn-gradient-primary h-14 flex-col gap-0.5 transition-transform active:scale-[0.98]"
                onClick={handleStartRally}
                disabled={startRally.isPending}
              >
                <span className="font-bold text-base font-montserrat">START R@LLY</span>
                <span className="text-xs opacity-80 font-normal">Go live and rally up.</span>
              </Button>
            </div>
          )}
          {canManage && isLive && (
            <div className="pt-2">
              <Button 
                className="w-full btn-gradient-primary h-14 flex-col gap-0.5 transition-transform active:scale-[0.98]"
                onClick={() => setShowEndRallyDialog(true)}
                disabled={endRally.isPending}
              >
                <span className="font-bold text-base font-montserrat">END R@LLY</span>
                <span className="text-xs opacity-80 font-normal">Move to After R@lly mode.</span>
              </Button>
            </div>
          )}

        {/* After R@lly Banner - Show when in after_rally status */}
        {isAfterRally && (
          <Card className="gradient-after-rally border-0 after-rally-pulse overflow-hidden relative">
            {/* Animated glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
            <CardContent className="p-5 flex items-center gap-4 relative">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Moon className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white text-xl font-montserrat">After R@lly Mode</h3>
                  <PartyPopper className="h-5 w-5 text-white/80" />
                </div>
                <p className="text-white/90 text-sm font-montserrat">
                  {(event as any)?.after_rally_location_name 
                    ? `📍 Next stop: ${(event as any).after_rally_location_name}` 
                    : '✨ The night continues!'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* R@lly Home Button - Only show during live events for attendees */}
        {(isLiveEvent || isAfterRally) && isAttending && (
          <section className="space-y-4">
            <RallyHomeButton 
              eventId={event.id}
              eventStatus={event.status}
              eventTitle={event.title}
              eventLocationName={event.location_name || undefined}
              eventLocationLat={event.location_lat || undefined}
              eventLocationLng={event.location_lng || undefined}
              trigger={
                <Card className="bg-gradient-to-r from-primary to-primary/85 border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center ${showAfterRallyTheme ? 'shadow-[0_0_14px_rgba(255,255,255,0.5)] animate-[home-glow_3s_ease-in-out_infinite]' : ''}`}>
                        <Home className={`h-6 w-6 ${showAfterRallyTheme ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'text-primary-foreground'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-primary-foreground text-lg font-montserrat">R@lly Home</h3>
                        <p className="text-primary-foreground/80 text-sm font-montserrat">Let your crew know you're heading out</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              }
            />
          </section>
        )}

        {/* After R@lly Card - Only show when event is in after_rally status */}
        {isAfterRally && isAttending && (
          <AfterRallyCard
            eventId={event.id}
            afterRallyLocation={(event as any)?.after_rally_location_name}
            afterRallyLat={(event as any)?.after_rally_location_lat}
            afterRallyLng={(event as any)?.after_rally_location_lng}
            isOptedIn={myAttendee?.after_rally_opted_in === true}
            onJoinClick={() => setShowAfterRallyOptIn(true)}
          />
          )}
        </div>


        {/* Safety Tracker + Host Safety Dashboard - only show when R@lly Home is active */}
        {isAfterRally ? (
          <div className="space-y-3">
            <SafetyTracker eventId={event.id} />
            {canManage && (
              <HostSafetyDashboard 
                eventId={event.id}
                isAfterRally={isAfterRally}
                onRequestRide={() => setShowRideshareDrawer(true)}
                onCompleteRally={async () => {
                  try {
                    await completeRally.mutateAsync(event.id);
                    setShowRallyComplete(true);
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to complete rally');
                  }
                }}
              />
            )}
          </div>
        ) : !isSimpleMode && (isLiveEvent || isScheduled) && isAttending ? (
          <div className="rounded-xl bg-muted/40 px-4 py-3">
            <p className="text-sm font-medium text-muted-foreground">R@lly Home activates when the night wraps up.</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">It activates when you hit R@lly Home or when the host ends the R@lly.</p>
          </div>
        ) : null}

        {/* DD Arrived Button - For designated drivers to confirm their own arrival */}
        {isDD && (isLiveEvent || isAfterRally) && (
          <DDArrivedButton eventId={event.id} />
        )}

        {/* DD Dropoff Button - For DDs to confirm passenger dropoffs */}
        {isDD && (isLiveEvent || isAfterRally) && (
          <DDDropoffButton eventId={event.id} />
        )}

        {/* Tabs for Details, Chat, Tracking, Rides */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-1">
              <Camera className="h-3.5 w-3.5" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5" />
              Track
            </TabsTrigger>
            <TabsTrigger value="rides" className={isSimpleMode ? 'opacity-50' : ''}>Rides</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Bar Hop Mode Toggle - Only for event managers, only in After R@lly */}
            {canManage && isAfterRally && (
              <Card className="border-secondary/50 bg-secondary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                        <Beer className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <Label htmlFor="barhop-mode" className="font-semibold">Bar Hop Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Add stops and track your crew's bar crawl
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="barhop-mode"
                      checked={event.is_barhop || false}
                      onCheckedChange={async (checked) => {
                        try {
                          await updateEvent.mutateAsync({
                            eventId: event.id,
                            updates: { is_barhop: checked }
                          });
                          toast.success(checked ? 'Bar Hop Mode enabled! 🍺' : 'Bar Hop Mode disabled');
                        } catch (error) {
                          toast.error('Failed to update');
                        }
                      }}
                      disabled={updateEvent.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Who's Going</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {event.attendees.map((attendee) => {
                      const isDD = attendee.is_dd || eventDDs?.some(dd => dd.profile_id === attendee.profile?.id);
                      return (
                        <div key={attendee.id} className="flex flex-col items-center gap-1 relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {attendee.profile?.display_name?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isDD && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <Car className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground truncate max-w-16">
                            {attendee.profile?.display_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bar Hop Stops - Show only in After R@lly when bar hop mode is enabled */}
            {isAfterRally && event.is_barhop && (
              <>
                {/* Bar Hop Controls - Host can move between stops */}
                <BarHopControls
                  eventId={event.id}
                  stops={event.stops || []}
                  canManage={canManage}
                  hostName={activeProfile?.display_name || 'Host'}
                  onTransitionPoint={() => {
                    setIsBarHopTransitionPoint(true);
                    setTimeout(() => setIsBarHopTransitionPoint(false), 1000);
                  }}
                />

                {/* Full Stop Manager with reorder, remove, ETA */}
                <BarHopStopManager
                  eventId={event.id}
                  stops={event.stops || []}
                  canManage={canManage}
                />
              </>
            )}

            {/* Bar Hop Map - Show only in After R@lly when stops have coordinates */}
            {isAfterRally && event.is_barhop && event.stops && event.stops.length > 0 && (
              <BarHopStopsMap 
                stops={event.stops}
                eventLocation={{
                  lat: event.location_lat,
                  lng: event.location_lng,
                  name: event.location_name,
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <Card className="h-[400px] overflow-hidden">
              <EventChat eventId={event.id} eventTitle={event.title} eventStatus={event.status || undefined} />
            </Card>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4 mt-4">
            {/* Live Tracking Component */}
            <LiveTracking
              eventId={event.id}
              destination={{
                name: event.location_name || event.title,
                address: event.location_name,
                lat: event.location_lat ?? undefined,
                lng: event.location_lng ?? undefined,
              }}
              isLive={isLiveEvent}
            />

            {/* Attendee Location Map */}
            <AttendeeMap 
              eventId={event.id} 
              attendees={event.attendees || []} 
              eventLocation={event.location_lat && event.location_lng ? {
                lat: event.location_lat,
                lng: event.location_lng,
                name: event.location_name || undefined
              } : null}
            />
          </TabsContent>

          <TabsContent value="rides" className="mt-4 space-y-4">
            {/* DD Request Banner - Show if user has a pending request */}
            {myDDRequest && profile && (
              <DDRequestBanner
                request={myDDRequest}
                eventId={event.id}
                userName={profile.display_name || 'You'}
              />
            )}

            {/* Request a Ride Card - For attendees who need a ride */}
            {isAttending && (
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Navigation className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-bold font-montserrat text-sm">Need a Ride?</h3>
                    <p className="text-muted-foreground text-xs">Request a safe ride to the event</p>
                  </div>
                </div>
                <RequestRideDialog eventId={event.id} eventName={event.title} />
              </div>
            )}

            {/* Rider Line - unassigned riders waiting for pickup */}
            <RiderLine eventId={event.id} />

            {/* DD Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Designated Drivers
                </CardTitle>
                {isAttending && (
                  <DDVolunteerButton 
                    eventId={event.id} 
                    eventLocationName={event.location_name}
                    eventLocationLat={event.location_lat}
                    eventLocationLng={event.location_lng}
                  />
                )}
              </CardHeader>
              <CardContent>
                {eventDDs && eventDDs.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {eventDDs.map((dd) => (
                      <div key={dd.id} className="flex items-center gap-2 bg-primary/10 rounded-full pl-1 pr-3 py-1">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={dd.profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {dd.profile?.display_name?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{dd.profile?.display_name}</span>
                        <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary">
                          <Car className="h-2.5 w-2.5 mr-0.5" />
                          DD
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No DDs yet. Volunteer to keep your crew safe!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Rides */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Rides Offered</CardTitle>
                <CreateRideDialog eventId={event.id} />
              </CardHeader>
              <CardContent>
                {rides && rides.length > 0 ? (
                  <div className="space-y-4">
                    {rides.map((ride) => (
                      <RideCard key={ride.id} ride={ride} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No rides offered yet. Be the first!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Leave Event Button - At bottom for attendees */}
        {!isCreator && isAttending && (
          <div className="px-4 pb-24 pt-6">
            <Button 
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              onClick={handleLeave}
              disabled={leaveEvent.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Leave R@lly
            </Button>
          </div>
        )}
      </main>

      <BottomNav />

      {/* First Time Welcome Dialog */}
      <FirstTimeWelcomeDialog
        eventTitle={event.title}
        isOpen={showFirstTimeWelcome}
        onClose={() => setShowFirstTimeWelcome(false)}
      />

      {/* After R@lly Opt-In Dialog */}
      <AfterRallyOptInDialog
        eventId={event.id}
        eventTitle={event.title}
        open={showAfterRallyOptIn}
        onOpenChange={setShowAfterRallyOptIn}
        onHeadHome={handleHeadHomeFromAfterRally}
      />


      {/* Safety Closeout Dialog */}
      <SafetyCloseoutDialog
        eventId={event.id}
        open={showSafetyCloseout}
        onOpenChange={setShowSafetyCloseout}
        onConfirm={async () => {
          try {
            await completeRally.mutateAsync(event.id);
            setShowSafetyCloseout(false);
            setShowRallyComplete(true);
          } catch (error: any) {
            toast.error(error.message || 'Failed to complete rally');
          }
        }}
      />

      {/* R@lly Home Dialog - For users declining After R@lly */}
      {showRallyHomeDialog && (
        <RallyHomeButton 
          eventId={event.id}
          eventStatus={event.status}
          eventTitle={event.title}
          eventLocationName={event.location_name || undefined}
          eventLocationLat={event.location_lat || undefined}
          eventLocationLng={event.location_lng || undefined}
          autoOpen={true}
          onAutoOpenComplete={() => setShowRallyHomeDialog(false)}
          trigger={<></>}
        />
      )}

      {/* End R@lly Dialog */}
      <EndRallyDialog
        eventId={event.id}
        open={showEndRallyDialog}
        onOpenChange={setShowEndRallyDialog}
        onCompleted={() => setShowRallyComplete(true)}
      />

      {/* Entry Safety Choice Modal - Blocking flow on join */}
      <SafetyChoiceModal
        open={showSafetyChoice}
        onOpenChange={setShowSafetyChoice}
        isLoading={savingSafetyChoice}
        onRallyGotMe={() => {
          setShowSafetyChoice(false);
          setShowRidesSelection(true);
        }}
        onDoingItMyself={handleDoingItMyself}
      />

      {/* Rides Selection Modal - Request ride or become DD */}
      <RidesSelectionModal
        open={showRidesSelection}
        onOpenChange={setShowRidesSelection}
        onBack={() => {
          setShowRidesSelection(false);
          setShowSafetyChoice(true);
        }}
        onComplete={() => {
          setShowRidesSelection(false);
          queryClient.invalidateQueries({ queryKey: ['event', event.id] });
          queryClient.invalidateQueries({ queryKey: ['unassigned-riders', event.id] });
          queryClient.invalidateQueries({ queryKey: ['rides', event.id] });
          refetchMyAttendee();
        }}
        eventId={event.id}
        eventTitle={event.title}
        eventLocationName={event.location_name || undefined}
        eventLocationLat={event.location_lat ?? undefined}
        eventLocationLng={event.location_lng ?? undefined}
        eventStatus={event.status || undefined}
      />

      {/* Location Sharing Modal - shows after "I'm good" safety choice */}
      <LocationSharingModal
        open={showLocationSharingModal}
        onOpenChange={setShowLocationSharingModal}
        eventId={event.id}
        onComplete={() => setShowLocationSharingModal(false)}
      />

      {/* Transport Mode Selector - shown after joining */}
      {profile && (
        <TransportModeSelector
          open={showTransportSelector}
          onOpenChange={setShowTransportSelector}
          eventId={event.id}
          profileId={profile.id}
          onComplete={() => {
            setShowTransportSelector(false);
            setShowSafetyChoice(true);
          }}
        />
      )}

      {/* Payment Gate Dialog - shown for paid events before join */}
      <PaymentGateDialog
        open={showPaymentGate}
        onOpenChange={setShowPaymentGate}
        amount={Number((event as any)?.cover_charge) || 0}
        eventTitle={event.title}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Rideshare Drawer - departure flow */}
      {profile && (
        <RideshareDrawer
          open={showRideshareDrawer}
          onOpenChange={setShowRideshareDrawer}
          eventId={event.id}
          profileId={profile.id}
          destinationLat={profile.home_lat ?? undefined}
          destinationLng={profile.home_lng ?? undefined}
          destinationName={profile.home_address ?? undefined}
        />
      )}

      {/* Rally Complete Celebration Overlay */}
      <RallyCompleteOverlay
        show={showRallyComplete}
        onDone={handleRallyCompleteDone}
        attendeeCount={attendeeCount}
        ddCount={eventDDs?.length ?? 0}
        eventId={event.id}
        eventTitle={event.title}
        inviteCode={event.invite_code}
      />
    </div>
  );
}