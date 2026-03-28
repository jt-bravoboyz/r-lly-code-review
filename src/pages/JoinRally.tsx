import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

interface EventPreview {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  location_name: string | null;
  is_barhop: boolean;
  is_quick_rally: boolean;
  invite_code: string;
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
  const [showSafetyChoice, setShowSafetyChoice] = useState(false);
  const [showRidesSelection, setShowRidesSelection] = useState(false);
  const [joinedEventId, setJoinedEventId] = useState<string | null>(null);
  const [savingSafetyChoice, setSavingSafetyChoice] = useState(false);
  const [hasMadeSafetyChoice, setHasMadeSafetyChoice] = useState(false);

  const fetchEvent = async (inviteCode: string) => {
    if (!inviteCode || inviteCode.length < 6) return;
    
    setLoading(true);
    
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_event_preview_by_invite_code', { invite_code_param: inviteCode });

    if (rpcError) {
      console.error('Error fetching event:', rpcError);
      toast.error('Failed to find rally');
      setEvent(null);
      setLoading(false);
      return;
    }

    if (rpcData && rpcData.length > 0) {
      const eventData = rpcData[0];
      const transformedEvent: EventPreview = {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start_time,
        location_name: eventData.location_name,
        is_barhop: eventData.is_barhop,
        is_quick_rally: eventData.is_quick_rally,
        invite_code: eventData.invite_code,
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

  useEffect(() => {
    if (code) {
      fetchEvent(code);
    } else {
      setLoading(false);
    }
  }, [code, profile]);

  const handleJoin = async () => {
    if (!user) {
      sessionStorage.setItem('pendingRallyCode', event?.invite_code || manualCode);
      // Forward referral param if present
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('r');
      if (ref) {
        sessionStorage.setItem('rally-referrer-id', ref);
      }
      navigate('/auth');
      return;
    }

    if (!event) return;

    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('request_join_event', {
        p_event_id: event.id
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

      toast.success('Request sent! Waiting for host approval...', {
        description: 'The host will be notified of your request',
        icon: '⏳',
      });
      
      setAlreadyJoined(false);
      
    } catch (error: any) {
      console.error('[R@lly Debug] Join error:', error);
      toast.error(error.message || 'Failed to request to join R@lly');
    } finally {
      setJoining(false);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.length >= 6) {
      fetchEvent(manualCode);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black">
        <div className="w-24 h-24 rounded-full bg-white/[0.06] flex items-center justify-center animate-pulse">
          <img src={rallyLogo} alt="R@lly" className="w-14 h-14 object-contain" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black relative overflow-hidden flex flex-col">
      {/* Ambient radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#F47A19]/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-[#F47A19]/[0.08] blur-[100px]" />
      </div>

      {/* Transparent floating header */}
      <div className="fixed top-0 left-0 right-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 1.5rem)' }}>
        <div className="relative flex items-center justify-center px-4 py-3">
          <Button variant="ghost" size="sm" className="absolute left-4 text-white/70 hover:text-white" asChild>
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
            <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.1] rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-montserrat text-white">Join a R@lly</h2>
                <p className="text-sm text-white/50 mt-1">Enter the invite code</p>
              </div>
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="ABCD12"
                  className="text-center text-2xl tracking-[0.3em] font-bold uppercase bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/20 focus-visible:ring-[#F47A19]/40 focus-visible:border-[#F47A19]/30 h-14 rounded-xl"
                  maxLength={6}
                />
                <Button 
                  type="submit" 
                  className="w-full gradient-primary h-12"
                  disabled={manualCode.length < 6 || loading}
                >
                  {loading ? 'Looking...' : 'Find Rally'}
                </Button>
              </form>
            </div>
          )}

          {/* Loading State */}
          {loading && code && (
            <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.1] rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-4">
              <Skeleton className="h-8 w-3/4 mx-auto bg-white/[0.08]" />
              <Skeleton className="h-4 w-1/2 mx-auto bg-white/[0.08]" />
              <Skeleton className="h-16 w-full bg-white/[0.08]" />
              <Skeleton className="h-10 w-full bg-white/[0.08]" />
            </div>
          )}

          {/* Event Preview */}
          {!loading && event && (
            <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.1] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
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
                  <p className="text-white/80 text-sm mt-1">📍 {event.location_name}</p>
                )}
                <p className="text-white/80 text-sm">
                  {format(new Date(event.start_time), 'EEEE, MMM d · h:mm a')}
                </p>
              </div>

              <div className="p-5 space-y-4">
                {/* Host */}
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={event.creator.avatar_url || undefined} />
                    <AvatarFallback className="bg-white/[0.1] text-white">
                      {event.creator.display_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-white/50">Hosted by</p>
                    <p className="font-medium text-white">{event.creator.display_name}</p>
                  </div>
                </div>

                {/* Attendees */}
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Users className="h-4 w-4" />
                  <span>{event.attendees?.[0]?.count || 0} people going</span>
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-sm text-white/50">{event.description}</p>
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
                    <div className="p-4 rounded-xl bg-white/[0.06] border border-white/[0.1] text-center">
                      <div className="w-12 h-12 rounded-full bg-white/[0.1] mx-auto mb-2 flex items-center justify-center">
                        <Users className="h-6 w-6 text-white/60" />
                      </div>
                      <p className="font-semibold text-white">Request Pending</p>
                      <p className="text-sm text-white/50 mt-1">
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

          {/* Not Found */}
          {!loading && !event && code && (
            <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.1] rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/[0.06] mx-auto flex items-center justify-center">
                <Users className="h-8 w-8 text-white/40" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-montserrat text-white">R@lly Not Found</h2>
                <p className="text-sm text-white/50">
                  This invite code doesn't match any active R@lly.
                </p>
              </div>
              <Button variant="outline" className="border-white/[0.1] text-white" onClick={() => navigate('/events')}>
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
    </div>
  );
}
