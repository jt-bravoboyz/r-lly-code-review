import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Users, Check, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import rallyLogo from '@/assets/rally-logo.png';
import { SafetyChoiceModal } from '@/components/events/SafetyChoiceModal';
import { RidesSelectionModal } from '@/components/events/RidesSelectionModal';
import { trackEvent } from '@/lib/analytics';
import { useCoverChargeGate } from '@/hooks/useCoverChargeGate';

interface EventPreview {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  location_name: string | null;
  is_barhop: boolean;
  is_quick_rally: boolean;
  invite_code: string;
  cover_charge: number;
  invite_code_expires_at: string | null;
  creator: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  attendees: { count: number }[];
}

export default function JoinRally() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [event, setEvent] = useState<EventPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState(code || '');
  const [joining, setJoining] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showSafetyChoice, setShowSafetyChoice] = useState(false);
  const [showRidesSelection, setShowRidesSelection] = useState(false);
  const [joinedEventId, setJoinedEventId] = useState<string | null>(null);
  const [savingSafetyChoice, setSavingSafetyChoice] = useState(false);
  const [hasMadeSafetyChoice, setHasMadeSafetyChoice] = useState(false);
  const { ensurePaid, dialog: coverDialog } = useCoverChargeGate(event, profile);

  // If Universal Links aren't intercepting this URL (provisioning / AASA cache issues),
  // fall back to the custom URL scheme so the native app still opens directly.
  // This fires in mobile Safari only — inside the native app Capacitor.isNativePlatform()
  // is true so we skip it, and on desktop nothing happens.
  useEffect(() => {
    if (!code) return;
    if (Capacitor.isNativePlatform()) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;
    const timer = setTimeout(() => {
      window.location.href = `com.bravoboyz.rally://join/${code}`;
    }, 50);
    return () => clearTimeout(timer);
  }, [code]);

  const fetchEvent = async (inviteCode: string) => {
    if (!inviteCode || inviteCode.length < 4) return;
    
    setLoading(true);
    setIsExpired(false);
    setLoadError(false);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_event_preview_by_invite_code', { invite_code_param: inviteCode });

    if (rpcError) {
      console.error('Error fetching event:', rpcError);
      // Structurally-valid code that failed to load (network blip, RLS edge) —
      // surface a retryable error instead of a misleading "not found" card.
      const looksValid = /^[A-Z0-9]{4,8}$/i.test(inviteCode.trim());
      if (looksValid) {
        setLoadError(true);
      } else {
        toast.error('Failed to find rally');
      }
      setEvent(null);
      setLoading(false);
      return;
    }

    if (rpcData && rpcData.length > 0) {
      const eventData = rpcData[0] as any;
      const expiresAt: string | null = eventData.invite_code_expires_at ?? null;
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        setIsExpired(true);
        setEvent(null);
        setLoading(false);
        return;
      }

      const transformedEvent: EventPreview = {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start_time,
        location_name: eventData.location_name,
        is_barhop: eventData.is_barhop,
        is_quick_rally: eventData.is_quick_rally,
        invite_code: eventData.invite_code,
        cover_charge: Number(eventData.cover_charge ?? 0),
        invite_code_expires_at: expiresAt,
        creator: {
          id: eventData.creator_id,
          display_name: eventData.creator_display_name,
          avatar_url: eventData.creator_avatar_url,
        },
        attendees: [{ count: Number(eventData.attendee_count) }],
      };
      setEvent(transformedEvent);
      
      if (profile) {
        const { data: attendance } = await supabase
          .from('event_attendees')
          .select('id, status, going_home_at, not_participating_rally_home_confirmed, is_dd')
          .eq('event_id', eventData.id)
          .eq('profile_id', profile.id)
          .maybeSingle();
        
        if (attendance) {
          if (attendance.status === 'attending') {
            setAlreadyJoined(true);
            setIsPending(false);
            const hasSafetyChoice = 
              attendance.going_home_at !== null || 
              attendance.not_participating_rally_home_confirmed !== null ||
              attendance.is_dd === true;
            setHasMadeSafetyChoice(hasSafetyChoice);
          } else if (attendance.status === 'pending') {
            setIsPending(true);
            setAlreadyJoined(false);
          }
        }
      }
    } else {
      setEvent(null);
      toast.error('R@lly not found');
    }
    setLoading(false);
  };

  // Realtime: when host flips this user's status from pending → attending,
  // auto-advance into the success flow without requiring a page refresh.
  useEffect(() => {
    if (!event?.id || !profile?.id || !isPending) return;

    const channel = supabase
      .channel(`join-pending-${event.id}-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_attendees',
          filter: `profile_id=eq.${profile.id}`,
        },
        (payload) => {
          const row = payload.new as { event_id: string; status: string };
          if (row.event_id !== event.id) return;
          if (row.status !== 'attending') return;

          // Flip background card from "Pending" → "You're In" instantly
          setIsPending(false);
          setAlreadyJoined(true);
          setHasMadeSafetyChoice(false);
          setJoinedEventId(event.id);

          trackEvent('invite_code_redeemed', {
            event_id: event.id,
            invite_code: event.invite_code,
            source: 'join_rally_page_realtime',
          });

          toast.success("You're in! 🎉", {
            description: 'Host approved — welcome to the R@lly!',
          });

          setShowSafetyChoice(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id, event?.invite_code, profile?.id, isPending]);

  useEffect(() => {
    if (code) {
      fetchEvent(code);
    } else {
      setLoading(false);
    }
  }, [code, profile]);

  const handleJoin = async () => {
    if (!user) {
      localStorage.setItem('pendingRallyCode', event?.invite_code || manualCode);
      // Forward referral param if present
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('r');
      if (ref) {
        localStorage.setItem('rally-referrer-id', ref);
      }
      // Contextual auth landing: pass intent + event title so /auth can
      // render "Sign in to claim your spot in {title}".
      const authParams = new URLSearchParams({ intent: 'join' });
      if (event?.title) authParams.set('title', event.title);
      if (ref) authParams.set('r', ref);
      navigate(`/auth?${authParams.toString()}`);
      return;
    }


    if (!event) return;

    setJoining(true);
    try {
      // Cover-charge gate: only fires when cover_charge > 0 and not already paid.
      const ok = await ensurePaid();
      if (!ok) {
        setJoining(false);
        return;
      }

      const { data, error } = await supabase.rpc('request_join_event', {
        p_event_id: event.id,
        p_invite_code: event.invite_code,
      });

      if (error) {
        console.error('[R@lly Debug] RPC error:', error);
        throw error;
      }

      const result = data as { success?: boolean; error?: string; status?: string };

      if (result.error) {
        if (result.status === 'attending') {
          toast.info("You're already in this R@lly!");
          navigate(`/events/${event.id}`);
          return;
        }
        if (result.status === 'pending') {
          toast.info('Your request is already pending approval');
          return;
        }
        throw new Error(result.error);
      }

      if (result.status === 'attending') {
        // Track invite-code redemption so admin "Invite copies" reflects code-based joins.
        trackEvent('invite_code_redeemed', {
          event_id: event.id,
          invite_code: event.invite_code,
          source: code ? 'join_rally_page_link' : 'join_rally_page_manual',
        });
        toast.success("You're in! 🎉", {
          description: 'Welcome to the R@lly!',
        });
        setAlreadyJoined(true);
        setJoinedEventId(event.id);
        setShowSafetyChoice(true);
      } else {
        toast.success('Request sent! Waiting for host approval...', {
          description: 'The host will be notified of your request',
          icon: '⏳',
        });
        setIsPending(true);
      }
      
    } catch (error: any) {
      console.error('[R@lly Debug] Join error:', error);
      toast.error(error.message || 'Failed to request to join R@lly');
    } finally {
      setJoining(false);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (trimmed.length >= 4) {
      fetchEvent(trimmed);
    }
  };


  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center animate-pulse">
          <img src={rallyLogo} alt="R@lly" className="w-14 h-14 object-contain" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden flex flex-col">
      {/* Ambient brand glow — subtle warmth on light surface */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#F47A19]/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-[#F47A19]/5 blur-[100px]" />
      </div>

      {/* Transparent floating header */}
      <div className="fixed top-0 left-0 right-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 1.5rem)' }}>
        <div className="relative flex items-center justify-center px-4 py-3">
          <Button variant="ghost" size="sm" className="absolute left-4 text-muted-foreground hover:text-foreground" asChild>
            <Link to="/events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <img src={rallyLogo} alt="R@lly" className="h-10 w-10 object-contain" />
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center relative z-10 px-4" style={{ paddingTop: 'env(safe-area-inset-top, 1.5rem)' }}>
        <div className="w-full max-w-sm space-y-6">
          {/* Manual Code Entry */}
          {!code && (
            <div className="backdrop-blur-xl bg-card/80 border border-border rounded-2xl p-8 shadow-lg space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-montserrat text-foreground">Join a R@lly</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter the invite code</p>
              </div>
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="ABCD12"
                  className="text-center text-2xl tracking-[0.3em] font-bold uppercase bg-background border-border h-14 rounded-xl"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <Button
                  type="submit"
                  className="w-full gradient-primary h-12"
                  disabled={manualCode.trim().length < 4 || loading}
                >
                  {loading ? 'Looking...' : 'Find Rally'}
                </Button>
              </form>
            </div>
          )}

          {/* Loading State */}
          {loading && code && (
            <div className="backdrop-blur-xl bg-card/80 border border-border rounded-2xl p-8 shadow-lg space-y-4">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {/* Event Preview */}
          {!loading && event && (
            <div className="backdrop-blur-xl bg-card/80 border border-border rounded-2xl overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-[#F47A19] to-[#F47A19]/80 p-5">
                <div className="flex items-center gap-2 mb-2">
                  {event.is_quick_rally && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Quick R@lly
                    </Badge>
                  )}
                  {event.is_barhop && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                      🍺 Bar Hop
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold font-montserrat text-white">{event.title}</h1>
                {event.location_name && (
                  <p className="text-white/90 text-sm mt-1">📍 {event.location_name}</p>
                )}
                <p className="text-white/90 text-sm">
                  {format(new Date(event.start_time), 'EEEE, MMM d · h:mm a')}
                </p>
              </div>

              <div className="p-5 space-y-4">
                {/* Host */}
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={event.creator.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-foreground">
                      {event.creator.display_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">Hosted by</p>
                    <p className="font-medium text-foreground">{event.creator.display_name}</p>
                  </div>
                </div>

                {/* Attendees */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{event.attendees?.[0]?.count || 0} people going</span>
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                )}

                {/* Join Button */}
                {alreadyJoined ? (
                  <Button
                    className="w-full h-12"
                    onClick={() => {
                      if (hasMadeSafetyChoice) {
                        navigate(`/events/${event.id}`);
                      } else {
                        setJoinedEventId(event.id);
                        setShowSafetyChoice(true);
                      }
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    You're In - Enter Rally
                  </Button>
                ) : isPending ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-muted border border-border text-center">
                      <div className="w-12 h-12 rounded-full bg-background mx-auto mb-2 flex items-center justify-center">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="font-semibold text-foreground">Request Pending</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Waiting for the host to approve your request
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full gradient-primary h-12"
                    onClick={handleJoin}
                    disabled={joining}
                  >
                    {joining ? 'Sending Request...' : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {profile ? 'Join This Rally' : 'Sign In to Join'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Expired */}
          {!loading && isExpired && (
            <div className="backdrop-blur-xl bg-card/80 border border-[#F47A19]/30 rounded-2xl p-8 shadow-lg text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#F47A19]/15 mx-auto flex items-center justify-center">
                <Zap className="h-8 w-8 text-[#F47A19]" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-montserrat text-foreground">Invite Link Expired</h2>
                <p className="text-sm text-muted-foreground">
                  Ask the host for a fresh link — this one's past its window.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/events')}>
                Browse R@llies
              </Button>
            </div>
          )}

          {/* Transient load error — retryable */}
          {!loading && loadError && (
            <div className="backdrop-blur-xl bg-card/80 border border-border rounded-2xl p-8 shadow-lg text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-montserrat text-foreground">Trouble loading invite</h2>
                <p className="text-sm text-muted-foreground">
                  Check your connection and try again.
                </p>
              </div>
              <Button onClick={() => fetchEvent(code || manualCode)}>
                Retry
              </Button>
            </div>
          )}

          {/* Not Found */}
          {!loading && !event && !isExpired && !loadError && code && (
            <div className="backdrop-blur-xl bg-card/80 border border-border rounded-2xl p-8 shadow-lg text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-montserrat text-foreground">R@lly Not Found</h2>
                <p className="text-sm text-muted-foreground">
                  This invite code doesn't match any active R@lly.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/events')}>
                Browse R@llies
              </Button>
            </div>
          )}
        </div>
      </main>


      {/* Safety Choice Modal */}
      <SafetyChoiceModal
        open={showSafetyChoice}
        onOpenChange={setShowSafetyChoice}
        isLoading={savingSafetyChoice}
        onRallyGotMe={() => {
          setShowSafetyChoice(false);
          setShowRidesSelection(true);
        }}
        onDoingItMyself={async () => {
          if (!profile || !joinedEventId) return;
          setSavingSafetyChoice(true);
          try {
            await supabase
              .from('event_attendees')
              .update({ not_participating_rally_home_confirmed: true })
              .eq('event_id', joinedEventId)
              .eq('profile_id', profile.id);
            
            setShowSafetyChoice(false);
            navigate(`/events/${joinedEventId}`);
          } catch (error) {
            toast.error('Failed to save choice');
          } finally {
            setSavingSafetyChoice(false);
          }
        }}
      />

      {/* Rides Selection Modal */}
      {event && joinedEventId && (
        <RidesSelectionModal
          open={showRidesSelection}
          onOpenChange={setShowRidesSelection}
          onBack={() => {
            setShowRidesSelection(false);
            setShowSafetyChoice(true);
          }}
          onComplete={() => {
            setShowRidesSelection(false);
            navigate(`/events/${joinedEventId}`);
          }}
          eventId={joinedEventId}
          eventTitle={event.title}
          eventLocationName={event.location_name || undefined}
        />
      )}
      {coverDialog}
    </div>
  );
}
