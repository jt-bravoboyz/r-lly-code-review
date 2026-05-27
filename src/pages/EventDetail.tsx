import { useState, useEffect, useRef, useCallback } from 'react';
import { copyToClipboard, shareContent } from '@/lib/nativeShare';
import { Capacitor } from '@capacitor/core';
import { Share2 } from 'lucide-react';
import { getPublicName } from '@/lib/identity';

import { buildRallyShareUrl } from '@/lib/shareUrls';
import { useParams, Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getEventTypeLabel, getEventTypeEmoji, getEventTypeVibe } from '@/lib/eventTypes';
import { trackEvent } from '@/lib/analytics';
import { ArrowLeft, Calendar, MapPin, Users, Beer, Check, X, MessageCircle, Navigation, Home, Plus, Zap, Crown, UserPlus, Car, Play, Moon, PartyPopper, Link2, CheckCircle2, Camera, Settings2, Shirt } from 'lucide-react';
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

import { useAuth } from '@/hooks/useAuth';
import { useMyAttendeeStatus, useIsEventSafetyComplete } from '@/hooks/useSafetyStatus';
import { useCohosts } from '@/hooks/useCohosts';
import { useMyDDRequest, useEventDDs } from '@/hooks/useDDManagement';
import { useStartRally, useEndRally, useCompleteRally } from '@/hooks/useAfterRally';
import { useAutoArrival } from '@/hooks/useAutoArrival';
import { useAfterRallyTransition } from '@/hooks/useAfterRallyTransition';
import { RiderLine } from '@/components/rides/RiderLine';
import { AddPassengerDialog } from '@/components/rides/AddPassengerDialog';
import { MyPassengersList } from '@/components/rides/MyPassengersList';
import { usePublicProfile } from '@/contexts/PublicProfileContext';

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
import { SongRecsCard } from '@/components/events/SongRecsCard';
import { BarHopStopManager } from '@/components/events/BarHopStopManager';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import { useBarHopStopsRealtime } from '@/hooks/useBarHopStopsRealtime';
import { LocationMapPreview } from '@/components/location/LocationMapPreview';
import { FirstTimeWelcomeDialog } from '@/components/events/FirstTimeWelcomeDialog';
import { InviteToEventDialog } from '@/components/events/InviteToEventDialog';
import { InviteFriendsSheet } from '@/components/events/InviteFriendsSheet';
import { AfterRallyOptInDialog } from '@/components/events/AfterRallyOptInDialog';
import { SafetyCloseoutDialog } from '@/components/events/SafetyCloseoutDialog';
import { EndRallyDialog } from '@/components/events/EndRallyDialog';
import { EditEventLocationDialog } from '@/components/events/EditEventLocationDialog';
import { EditEventTimeDialog } from '@/components/events/EditEventTimeDialog';
import { LocationSharingModal } from '@/components/events/LocationSharingModal';
import { SafetyChoiceModal } from '@/components/events/SafetyChoiceModal';
import { RidesSelectionModal } from '@/components/events/RidesSelectionModal';
import { AfterRallyCard } from '@/components/events/AfterRallyCard';
import { RallyHeroMediaCarousel } from '@/components/events/RallyHeroMediaCarousel';
import { RallyCompleteOverlay } from '@/components/events/RallyCompleteOverlay';
import { EventPhotoFeed } from '@/components/events/EventPhotoFeed';
import { GoingRogueButton } from '@/components/events/GoingRogueButton';
import { RogueAlertOverlay } from '@/components/events/RogueAlertOverlay';
import { RogueAutoPoll } from '@/components/events/RogueAutoPoll';
import { useRogueAlerts } from '@/hooks/useRogueAlerts';
import { RallyRecapScreen } from '@/components/events/RallyRecapScreen';
import { useMyRallyHomePrompt } from '@/hooks/useRallyHomePrompt';
import { PendingJoinRequests } from '@/components/events/PendingJoinRequests';
import { TransportModeSelector } from '@/components/events/TransportModeSelector';
import { useCoverChargeGate } from '@/hooks/useCoverChargeGate';
import { RequestPaymentDialog } from '@/components/events/RequestPaymentDialog';
import { SplitCheckSection } from '@/components/events/SplitCheckSection';
import { PaySplitShareDialog } from '@/components/payments/PaySplitShareDialog';
import { RideshareDrawer } from '@/components/rides/RideshareDrawer';
import { RideshareDeepLinkButtons } from '@/components/rides/RideshareDeepLinkButtons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRenderLoopDetector } from '@/hooks/useRenderLoopDetector';
import { ProfileTapWrapper } from '@/components/profile/ProfileTapWrapper';
import { EventThemeProvider } from '@/components/events/EventThemeProvider';

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
  useRenderLoopDetector('EventDetail');
  const { user, profile, loading: authLoading } = useAuth();
  const { openProfile } = usePublicProfile();
  const { data: event, isLoading } = useEvent(id);
  
  const { updates } = useEventRealtime(id);
  const { data: myDDRequest } = useMyDDRequest(id);
  const { data: eventDDs } = useEventDDs(id);
  const { data: cohosts } = useCohosts(id);
  useBarHopStopsRealtime(id); // Real-time updates for bar hop stops
  const { latestAlert, dismissAlert, goRogue, submitReaction, reactions, hasGoneRogue, alerts: rogueAlerts, pendingCount, showAlertById } = useRogueAlerts(id);
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
  const afterRallyAskedRef = useRef(false);
  const rallyHomeAskedRef = useRef(false);
  const autoOptInFiredRef = useRef(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link rogue alert from a notification: ?rogue=<id>
  useEffect(() => {
    const rogueId = searchParams.get('rogue');
    if (!rogueId || !id) return;
    showAlertById(rogueId);
    // Clear the param so refresh doesn't re-pop
    const next = new URLSearchParams(searchParams);
    next.delete('rogue');
    setSearchParams(next, { replace: true });
  }, [searchParams, id, showAlertById, setSearchParams]);

  // Deep-link split-check pay dialog from a notification: ?pay=<request_id>
  useEffect(() => {
    const payId = searchParams.get('pay');
    if (!payId) return;
    setPayRequestId(payId);
    const next = new URLSearchParams(searchParams);
    next.delete('pay');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const [showRallyComplete, setShowRallyComplete] = useState(false);
  const [showTransportSelector, setShowTransportSelector] = useState(false);
  const { ensurePaid, dialog: coverDialog } = useCoverChargeGate(event as any, profile as any);
  const [showRequestPayment, setShowRequestPayment] = useState(false);
  const [payRequestId, setPayRequestId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteFriendsOpen, setInviteFriendsOpen] = useState(false);

  const [showRideshareDrawer, setShowRideshareDrawer] = useState(false);
  const [joinFlowDismissedForSession, setJoinFlowDismissedForSession] = useState(false);
  const [locationPromptDismissedForSession, setLocationPromptDismissedForSession] = useState(false);

  const handleRallyCompleteDone = useCallback(() => {
    setShowRallyComplete(false);
    navigate('/', { replace: true });
  }, [navigate]);
  
  // ARCH-4: Use consolidated hook instead of inline query
  // ARCH-2: DB flags for gating instead of sessionStorage
  const { data: myAttendee, refetch: refetchMyAttendee, isLoading: isLoadingMyAttendee } = useMyAttendeeStatus(id);
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

  useEffect(() => {
    if (!id) return;
    setJoinFlowDismissedForSession(sessionStorage.getItem(`event-join-flow-dismissed-${id}`) === 'true');
    setLocationPromptDismissedForSession(sessionStorage.getItem(`event-location-prompt-dismissed-${id}`) === 'true');
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
  const isAfterRallyRaw = event?.status === 'after_rally';
  const isCompletedRaw = event?.status === 'completed';

  // Stealth After R@lly: hide the whole After R@lly experience from anyone the host didn't pick.
  const afterRallyStealth = (event as any)?.after_rally_stealth === true;
  const afterRallyInvitedIds: string[] = ((event as any)?.after_rally_invited_ids ?? []) as string[];
  const isAfterRallyInvited = !afterRallyStealth
    || isCreator
    || isCohost
    || (!!activeProfile?.id && afterRallyInvitedIds.includes(activeProfile.id));
  // For excluded users, the R@lly looks finished — they see the recap, no After R@lly UI.
  const isStealthExcluded = isAfterRallyRaw && !isAfterRallyInvited;
  const isAfterRally = isAfterRallyRaw && isAfterRallyInvited;
  // Preview override: append ?previewRecap=1 to render the recap before the event ends.
  // Available to any signed-in viewer so designers/hosts can review without swapping accounts.
  const previewRecap = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('previewRecap') === '1';
  const isCompleted = isCompletedRaw || isStealthExcluded || previewRecap;
  
  const hasTransportModeForEvent = Boolean(myAttendee?.arrival_transport_mode);
  const hasRidePlan =
    myAttendee?.is_dd === true ||
    (myAttendee?.needs_ride === true && !!myAttendee?.ride_pickup_location);
  const hasCompletedJoinFlow =
    hasRidePlan ||
    (hasTransportModeForEvent && Boolean(myAttendee?.location_prompt_shown));
  const shouldAutoStartJoinFlow = isAttending &&
    !isLoadingMyAttendee &&
    !hasCompletedJoinFlow &&
    !hasRidePlan &&
    !hasTransportModeForEvent &&
    event?.status !== 'completed' &&
    !joinFlowDismissedForSession;

  const isSimpleMode = !event?.is_barhop &&
    (eventDDs?.length ?? 0) === 0 &&
    !isLive &&
    !isAfterRally;
  
  const joinFlowFiredRef = useRef(false);

  // Reset the one-shot guard when the event changes
  useEffect(() => {
    joinFlowFiredRef.current = false;
    autoOptInFiredRef.current = false;
    if (typeof window !== 'undefined' && id) {
      afterRallyAskedRef.current = sessionStorage.getItem(`after_rally_asked_${id}`) === '1';
      rallyHomeAskedRef.current = sessionStorage.getItem(`rally_home_asked_${id}`) === '1';
    }
  }, [id]);

  useEffect(() => {
    if (joinFlowFiredRef.current) return;
    if (hasCompletedJoinFlow) {
      joinFlowFiredRef.current = true;
      return;
    }
    if (shouldAutoStartJoinFlow && !showTransportSelector && !showSafetyChoice && !showRidesSelection && !showLocationSharingModal) {
      joinFlowFiredRef.current = true;
      const timer = setTimeout(() => {
        setShowTransportSelector(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoStartJoinFlow, hasCompletedJoinFlow, showTransportSelector, showSafetyChoice, showRidesSelection, showLocationSharingModal]);
  
  // R@lly Home prompt status for current user
  const myPromptStatus = useMyRallyHomePrompt(id);
  

  // Show After R@lly opt-in dialog when event is in after_rally status
  // Dialog shows on NORMAL screen - user must opt-in to see purple theme
  // Always show if user hasn't opted in yet (no sessionStorage blocking)
  useEffect(() => {
    if (!isAfterRally || !(isAttending || isCreator)) return;

    // Reset guards if the user fully opted in (e.g. rejoined)
    if (myAttendee?.after_rally_opted_in === true) {
      afterRallyAskedRef.current = false;
      rallyHomeAskedRef.current = false;
      if (typeof window !== 'undefined' && id) {
        sessionStorage.removeItem(`after_rally_asked_${id}`);
        sessionStorage.removeItem(`rally_home_asked_${id}`);
      }
      return;
    }

    // Skip re-prompt if user already declined ("not participating")
    if (myAttendee?.not_participating_rally_home_confirmed === true) return;
    // Skip if user explicitly answered the opt-in (true OR false). Only auto-open
    // for users who never answered (null/undefined).
    if (myAttendee?.after_rally_opted_in === false) return;
    // Per-session per-event guard — prevents background refetches from re-firing
    if (afterRallyAskedRef.current) return;

    // Auto-opt-in if user already has a ride plan (DD or rider) — plan carries over.
    // Only fire once per mount to avoid update loops.
    if ((myAttendee?.is_dd === true || myAttendee?.needs_ride === true) && !autoOptInFiredRef.current) {
      autoOptInFiredRef.current = true;
      supabase
        .from('event_attendees')
        .update({ after_rally_opted_in: true } as any)
        .eq('event_id', id!)
        .eq('profile_id', profile?.id!)
        .then(() => { refetchMyAttendee(); });
      return;
    }
    if (myAttendee?.is_dd === true || myAttendee?.needs_ride === true) return;

    afterRallyAskedRef.current = true;
    if (typeof window !== 'undefined' && id) {
      sessionStorage.setItem(`after_rally_asked_${id}`, '1');
    }
    setShowAfterRallyOptIn(true);
  }, [isAfterRally, isAttending, isCreator, id, profile?.id, myAttendee?.after_rally_opted_in, myAttendee?.not_participating_rally_home_confirmed, myAttendee?.is_dd, myAttendee?.needs_ride, refetchMyAttendee]);

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
    // Per-session guard so refetches don't re-open this dialog
    if (!rallyHomeAskedRef.current) {
      rallyHomeAskedRef.current = true;
      if (typeof window !== 'undefined' && id) {
        sessionStorage.setItem(`rally_home_asked_${id}`, '1');
      }
      setShowRallyHomeDialog(true);
    }
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
    // Strict gate: only fires when cover_charge > 0 and not already paid.
    const ok = await ensurePaid();
    if (!ok) return;
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
      
      sessionStorage.setItem(`event-join-flow-dismissed-${event.id}`, 'true');
      setJoinFlowDismissedForSession(true);
      toast.success('Got it! Have a great time 🎉');
      trackEvent('safety_confirmed', { event_id: event.id, choice: 'self_transport' });
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      queryClient.invalidateQueries({ queryKey: ['my-attendee-status', event.id, profile.id] });
      setShowSafetyChoice(false);
      if (!locationPromptDismissedForSession) {
        setShowLocationSharingModal(true);
      }
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
    <EventThemeProvider themeKey={(event as any).flyer_theme} disabled={showAfterRallyTheme}>
    <div className={`min-h-[100dvh] pb-20 ${showAfterRallyTheme ? 'after-rally-mode' : ''}`}>
      <Header afterRallyMode={showAfterRallyTheme} />
      
      <main className="container py-6 space-y-6 relative z-10">
        {/* Back Button — adaptive glass for colorful flyers */}
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-foreground/[0.08] dark:bg-black/30 border border-foreground/10 text-foreground backdrop-blur-sm text-sm font-medium hover:bg-foreground/[0.12] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Link>

        {/* Hero Media Carousel - above title */}
        <RallyHeroMediaCarousel eventId={event.id} canManage={canManage} />

        {/* Live Updates Banner */}
        {updates.length > 0 && <LiveUpdates updates={updates} />}

        {/* Completed R@lly: minimal header */}
        {isCompleted && (
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight font-montserrat event-themed-title">{event.title}</h1>
            <Badge className="bg-muted text-muted-foreground border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
        )}

        {/* Event Header — hidden for completed events */}
        {!isCompleted && (
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
              <h1 className="text-3xl font-bold tracking-tight event-themed-title ev-ink-strong">
                {getEventTypeEmoji(event.event_type) && (
                  <span className="mr-1.5" style={{ WebkitTextFillColor: 'initial' }}>{getEventTypeEmoji(event.event_type)}</span>
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
                      <Avatar
                        key={a.id}
                        className="h-6 w-6 border-2 border-background cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); const id = (a as any).profile_id ?? a.profile?.id; id && openProfile(id); }}
                        aria-label={`View ${a.profile?.display_name || 'attendee'}'s profile`}
                      >
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
              {/* Date/Time isolation card + invite cluster */}
              <div className="mt-2 space-y-3">
                {/* Prominent Date & Time — solid isolation barrier for theme-proof contrast */}
                <div className="bg-background/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/20 dark:border-zinc-800/50 shadow-xl p-4 rounded-2xl flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center rounded-xl bg-[#F47A19] px-3 py-2 min-w-[64px] shadow-md">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white leading-none">
                      {format(new Date(event.start_time), 'MMM')}
                    </span>
                    <span className="text-2xl font-black text-white font-montserrat leading-none mt-1">
                      {format(new Date(event.start_time), 'd')}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <span className="text-foreground font-black text-xl tracking-wider uppercase font-montserrat leading-tight">
                      {format(new Date(event.start_time), 'EEEE')}
                    </span>
                    <span className="text-[#F47A19] font-black text-xl font-montserrat leading-tight">
                      {format(new Date(event.start_time), 'h:mm a')}
                    </span>
                    {event.location_name && (
                      <span className="text-muted-foreground font-semibold text-base truncate mt-0.5">
                        {event.location_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-stretch gap-2.5">
                  <button
                    type="button"
                    className="flex-1 w-full h-12 flex items-center justify-center gap-1.5 text-center font-bold text-sm px-4 rounded-xl bg-card border border-border text-card-foreground shadow-sm hover:bg-accent/10 backdrop-blur-md transition-all"
                    onClick={async () => {
                      const url = buildRallyShareUrl({ eventId: event.id, inviteCode: event.invite_code }, { referrerId: profile?.id });
                      trackEvent('invite_link_copied', { event_id: event.id });
                      if (Capacitor.isNativePlatform()) {
                        const shared = await shareContent({
                          title: event.title,
                          text: `Join me at ${event.title} on R@lly`,
                          url,
                          successToast: 'Link copied!',
                        });
                        if (shared) {
                          setLinkCopied(true);
                          window.setTimeout(() => setLinkCopied(false), 1200);
                        }
                        return;
                      }
                      copyToClipboard(url);
                      toast.success('Link copied!');
                      setLinkCopied(true);
                      window.setTimeout(() => setLinkCopied(false), 1200);
                    }}
                  >
                    {linkCopied ? (
                      <Check className="h-4 w-4" />
                    ) : Capacitor.isNativePlatform() ? (
                      <Share2 className="h-4 w-4" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    {linkCopied ? 'Sent' : 'Send invite link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteFriendsOpen(true)}
                    className="flex-1 w-full h-12 flex items-center justify-center gap-1.5 text-center font-bold text-sm px-4 rounded-xl bg-card border border-border text-card-foreground shadow-sm hover:bg-accent/10 backdrop-blur-md transition-all font-montserrat"
                  >
                    <UserPlus className="h-4 w-4 text-primary" />
                    Invite Friends
                  </button>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {(event as any).invite_code_expires_at && (() => {
                    const expiresAt = new Date((event as any).invite_code_expires_at as string).getTime();
                    const expired = expiresAt < Date.now();
                    const hoursLeft = Math.max(0, Math.round((expiresAt - Date.now()) / 3600000));
                    return (
                      <span
                        className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full ${
                          expired
                            ? 'bg-destructive/15 text-destructive'
                            : 'bg-background/40 text-muted-foreground border border-white/10 dark:border-black/10'
                        }`}
                      >
                        {expired ? 'Expired' : `Expires in ${hoursLeft}h`}
                      </span>
                    );
                  })()}
                  {canManage && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-xs font-medium pl-2.5 pr-3 py-1.5 rounded-full border border-transparent transition shadow-sm"
                      style={{
                        color: 'var(--theme-accent)',
                        background: 'var(--theme-accent-soft)',
                      }}
                      onClick={async () => {
                        const { error } = await (supabase as any).rpc('rotate_event_invite_code', {
                          _event_id: event.id,
                          _ttl_hours: 72,
                        });
                        if (error) { toast.error('Could not rotate invite'); return; }
                        toast.success('New invite link generated');
                        queryClient.invalidateQueries({ queryKey: ['event', event.id] });
                      }}
                    >
                      Rotate
                    </button>
                  )}
                </div>
              </div>

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
            <InviteFriendsSheet
              open={inviteFriendsOpen}
              onOpenChange={setInviteFriendsOpen}
              eventId={event.id}
              eventTitle={event.title}
              existingAttendeeIds={event.attendees?.map(a => a.profile?.id).filter(Boolean) as string[] || []}
            />
          </div>

          {event.description && (
            <p className="text-muted-foreground">{event.description}</p>
          )}

          {/* Host edit affordances (kept invisible when not manager) */}
          {canManage && event.status !== 'completed' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <EditEventTimeDialog
                eventId={event.id}
                eventTitle={event.title}
                currentStartTime={event.start_time}
                currentEndTime={event.end_time}
                attendeeProfileIds={(event.attendees ?? []).map((a: any) => a.profile?.id ?? a.profile_id).filter(Boolean)}
                currentProfileId={activeProfile?.id}
              />
              <EditEventLocationDialog
                eventId={event.id}
                currentLocationName={event.location_name}
                currentLat={event.location_lat}
                currentLng={event.location_lng}
              />
            </div>
          )}

          {/* Location Map Preview - Show if event has coordinates */}
          {event.location_lat && event.location_lng && !(isAfterRally && event.is_barhop) && (
            <LocationMapPreview
              lat={event.location_lat}
              lng={event.location_lng}
              name={event.location_name || undefined}
              address={undefined}
              height="h-40"
              interactive={true}
              showDirections={true}
            />
          )}

          {/* Host and Co-hosts */}
          {event.creator && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    className="cursor-pointer h-12 w-12 ring-2 ring-[#F47A19]/30"
                    onClick={() => { const id = (event as any).creator_id ?? event.creator?.id; id && openProfile(id); }}
                    aria-label={`View ${event.creator.display_name || 'host'}'s profile`}
                  >
                    <AvatarImage src={event.creator.avatar_url || undefined} />
                    <AvatarFallback>
                      {event.creator.display_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    aria-label="Host"
                    className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[#F47A19] ring-2 ring-background flex items-center justify-center shadow-md"
                  >
                    <Crown className="h-3 w-3 text-white" strokeWidth={2.5} />
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hosted by</p>
                  <button
                    type="button"
                    onClick={() => { const id = (event as any).creator_id ?? event.creator?.id; id && openProfile(id); }}
                    className="font-medium hover:underline text-left"
                  >
                    {event.creator.display_name}
                  </button>
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
                  <div
                    key={cohost.id}
                    className="flex items-center gap-1.5 bg-muted/50 rounded-full pl-1 pr-2.5 py-0.5 cursor-pointer"
                    onClick={() => { const id = (cohost as any).profile_id ?? cohost.profile?.id; id && openProfile(id); }}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={cohost.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[9px]">
                        {cohost.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{getPublicName(cohost.profile)}</span>
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
        {!isCompleted && isAfterRally && (
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
        {!isCompleted && (isLiveEvent || isAfterRally) && isAttending && (
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

        {/* Split Check / Request Payment intentionally hidden — R@lly Tabs not yet released */}

        {!isCompleted && isScheduled && isAttending && hasCompletedJoinFlow && (
          <Button
            variant="outline"
            className="w-full font-montserrat font-bold bg-card text-card-foreground border-border hover:bg-card/80"
            onClick={() => setShowTransportSelector(true)}
          >
            <Settings2 className="h-5 w-5 mr-2" />
            Edit My Plan
          </Button>
        )}

        {/* Going Rogue Button - visible during live/after rally for attendees */}
        {!isCompleted && (isLive || isAfterRally) && isAttending && (
          <GoingRogueButton
            onGoRogue={async (finalWords) => {
              const result = await goRogue.mutateAsync(finalWords);
              // Reset one-shot guard so safety modal re-triggers
              joinFlowFiredRef.current = false;
              queryClient.invalidateQueries({ queryKey: ['my-attendee-status', id] });
              return result;
            }}
            isPending={goRogue.isPending}
            hasGoneRogue={hasGoneRogue}
          />
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
        )}

        {/* Recap Screen — full-width outside event header card */}
        {isCompleted && (
          <RallyRecapScreen
            eventId={event.id}
            eventTitle={event.title}
            eventType={event.event_type}
            attendeeCount={attendeeCount}
            ddCount={eventDDs?.length ?? 0}
          />
        )}

        {/* Safety Tracker + Host Safety Dashboard - only show when R@lly Home is active */}
        {!isCompleted && isAfterRally ? (
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
        {!isCompleted && isDD && (isLiveEvent || isAfterRally) && (
          <DDArrivedButton eventId={event.id} />
        )}

        {/* DD Dropoff Button - For DDs to confirm passenger dropoffs */}
        {!isCompleted && isDD && (isLiveEvent || isAfterRally) && (
          <DDDropoffButton eventId={event.id} />
        )}

        {/* Tabs for Details, Photos, Chat — Track & Rides intentionally hidden */}
        {!isCompleted && <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details" className="text-[11px] sm:text-xs">Details</TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-1 text-[11px] sm:text-xs">
              <MapPin className="h-3.5 w-3.5" />
              Track
            </TabsTrigger>
            <TabsTrigger value="rides" className="flex items-center gap-1 text-[11px] sm:text-xs">
              <Car className="h-3.5 w-3.5" />
              Rides
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-1 text-[11px] sm:text-xs">
              <Camera className="h-3.5 w-3.5" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-1 text-[11px] sm:text-xs">
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
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
                      const targetId = (attendee as any).profile_id ?? attendee.profile?.id;
                      return (
                        <ProfileTapWrapper key={attendee.id} profileId={targetId}>
                          <div className="flex flex-col items-center gap-1 relative">
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
                        </ProfileTapWrapper>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dress Code - only when host set one */}
            {(event as any).dress_code && String((event as any).dress_code).trim() && (
              <Card className="border-l-2 border-l-primary">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Shirt className="h-3.5 w-3.5 text-primary" />
                    <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      Dress Code
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-medium text-foreground">{(event as any).dress_code}</p>
                </CardContent>
              </Card>
            )}

            {/* Song Rec's - opt-in collaborative module */}
            {(event as any).song_recs_enabled && (
              <SongRecsCard
                eventId={event.id}
                isParticipant={isCreator || isCohost || isAttending}
                currentProfileId={activeProfile?.id}
              />
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

          <TabsContent value="photos" className="mt-4 space-y-4">
            {rogueAlerts && rogueAlerts.length > 0 && (
              <RogueAutoPoll eventId={event.id} alerts={rogueAlerts as any} reactions={reactions as any} />
            )}
            <EventPhotoFeed eventId={event.id} isHost={canManage} eventStatus={event.status as any} eventUpdatedAt={event.updated_at as any} />
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
            {/* Quick rideshare deep links */}
            <RideshareDeepLinkButtons
              eventLat={event.location_lat}
              eventLng={event.location_lng}
              eventName={event.title}
              eventAddress={event.location_name}
            />

            {/* DD Request Banner - Show if user has a pending request */}
            {myDDRequest && profile && (
              <DDRequestBanner
                request={myDDRequest}
                eventId={event.id}
                userName={profile.display_name || 'You'}
              />
            )}

            {/* Request a Ride Card - Always visible */}
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

            {/* Rider Line - unassigned riders waiting for pickup */}
            <RiderLine eventId={event.id} />

            {/* DD: see your accepted passengers */}
            <MyPassengersList eventId={event.id} />

            {/* DD: manually add any attendee as a passenger */}
            <AddPassengerDialog eventId={event.id} />

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

          </TabsContent>
        </Tabs>}

        {/* Leave Event Button - At bottom for attendees (hidden on completed) */}
        {!isCompleted && !isCreator && isAttending && (
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
          sessionStorage.setItem(`event-join-flow-dismissed-${event.id}`, 'true');
          setJoinFlowDismissedForSession(true);
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
          sessionStorage.setItem(`event-join-flow-dismissed-${event.id}`, 'true');
          setJoinFlowDismissedForSession(true);
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
        onSkip={() => {
          sessionStorage.setItem(`event-location-prompt-dismissed-${event.id}`, 'true');
          setLocationPromptDismissedForSession(true);
        }}
        onComplete={() => {
          sessionStorage.setItem(`event-location-prompt-dismissed-${event.id}`, 'true');
          setLocationPromptDismissedForSession(true);
          setShowLocationSharingModal(false);
        }}
      />

      {/* Transport Mode Selector - shown after joining */}
      {profile && (
        <TransportModeSelector
          open={showTransportSelector}
          onOpenChange={setShowTransportSelector}
          eventId={event.id}
          profileId={profile.id}
          eventLat={event.location_lat}
          eventLng={event.location_lng}
          eventName={event.title}
          eventAddress={event.location_name}
          onSkip={() => {
            sessionStorage.setItem(`event-join-flow-dismissed-${event.id}`, 'true');
            setJoinFlowDismissedForSession(true);
          }}
          onComplete={() => {
            sessionStorage.setItem(`event-join-flow-dismissed-${event.id}`, 'true');
            setJoinFlowDismissedForSession(true);
            setShowTransportSelector(false);
            setShowSafetyChoice(true);
          }}
        />
      )}

      {/* Cover Charge Dialog - rendered by useCoverChargeGate */}
      {coverDialog}

      {/* Split Check / Request Payment dialogs intentionally disabled — R@lly Tabs not yet released */}

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

      {/* Rogue Alert Overlay - Realtime + queue */}
      {latestAlert && (
        <RogueAlertOverlay
          alert={latestAlert}
          queueCount={pendingCount}
          reactionCounts={
            reactions
              .filter(r => r.rogue_alert_id === latestAlert.id)
              .reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
          }
          onReact={(emoji) => submitReaction.mutate({ alertId: latestAlert.id, emoji })}
          onDismiss={dismissAlert}
        />
      )}
    </div>
    </EventThemeProvider>
  );
}