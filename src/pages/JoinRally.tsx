import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, Check, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useJoinEvent } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import rallyLogo from '@/assets/rally-logo.png';

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
  const { profile, loading: authLoading } = useAuth();
  const joinEvent = useJoinEvent();
  
  const [event, setEvent] = useState<EventPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState(code || '');
  const [joining, setJoining] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  const fetchEvent = async (inviteCode: string) => {
    if (!inviteCode || inviteCode.length < 6) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        start_time,
        location_name,
        is_barhop,
        is_quick_rally,
        invite_code,
        creator:profiles!events_creator_id_fkey(id, display_name, avatar_url),
        attendees:event_attendees(count)
      `)
      .eq('invite_code', inviteCode.toUpperCase())
      .maybeSingle();

    if (error) {
      toast.error('Failed to find rally');
      setEvent(null);
    } else if (data) {
      setEvent(data as EventPreview);
      
      // Check if already attending
      if (profile) {
        const { data: attendance } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('event_id', data.id)
          .eq('profile_id', profile.id)
          .maybeSingle();
        
        setAlreadyJoined(!!attendance);
      }
    } else {
      setEvent(null);
      toast.error('Rally not found');
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
    if (!profile) {
      // Store the invite code and redirect to auth
      sessionStorage.setItem('pendingRallyCode', event?.invite_code || manualCode);
      navigate('/auth');
      return;
    }

    if (!event) return;

    setJoining(true);
    try {
      await joinEvent.mutateAsync({ eventId: event.id, profileId: profile.id });
      toast.success("You're in! 🎉");
      navigate(`/events/${event.id}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.info("You're already in this rally!");
        navigate(`/events/${event.id}`);
      } else {
        toast.error(error.message || 'Failed to join rally');
      }
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-24 h-24 rounded-full bg-rally-light flex items-center justify-center animate-pulse">
          <img src={rallyLogo} alt="R@lly" className="w-14 h-14 object-contain" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="h-6" />
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <img src={rallyLogo} alt="R@lly" className="h-10 w-10 object-contain" />
          <div className="w-16" />
        </div>
      </header>

      <main className="container max-w-md mx-auto py-8 px-4 space-y-6">
        {/* Manual Code Entry */}
        {!code && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-bold font-montserrat">Join a R@lly</h2>
                <p className="text-sm text-muted-foreground">Enter the invite code</p>
              </div>
              <form onSubmit={handleCodeSubmit} className="space-y-3">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="ABCD12"
                  className="text-center text-2xl tracking-widest font-bold uppercase"
                  maxLength={6}
                />
                <Button 
                  type="submit" 
                  className="w-full gradient-primary"
                  disabled={manualCode.length < 6 || loading}
                >
                  {loading ? 'Looking...' : 'Find Rally'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && code && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        )}

        {/* Event Preview */}
        {!loading && event && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                {event.is_quick_rally && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    <Zap className="h-3 w-3 mr-1" />
                    Quick R@lly
                  </Badge>
                )}
                {event.is_barhop && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    🍺 Bar Hop
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold font-montserrat">{event.title}</h1>
              {event.location_name && (
                <p className="text-white/80 text-sm mt-1">📍 {event.location_name}</p>
              )}
              <p className="text-white/80 text-sm">
                {format(new Date(event.start_time), 'EEEE, MMM d · h:mm a')}
              </p>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Host */}
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={event.creator.avatar_url || undefined} />
                  <AvatarFallback>
                    {event.creator.display_name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Hosted by</p>
                  <p className="font-medium">{event.creator.display_name}</p>
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
                  className="w-full"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  You're In - View Rally
                </Button>
              ) : (
                <Button 
                  className="w-full gradient-primary"
                  onClick={handleJoin}
                  disabled={joining}
                >
                  {joining ? 'Joining...' : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {profile ? 'Join This Rally' : 'Sign In to Join'}
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Not Found */}
        {!loading && !event && code && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-montserrat">Rally Not Found</h2>
                <p className="text-sm text-muted-foreground">
                  This invite code doesn't match any active rally.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/events')}>
                Browse Rallies
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}