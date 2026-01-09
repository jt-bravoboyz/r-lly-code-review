import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Beer, Share2, Check, X, MessageCircle, Navigation, Home, Plus, Copy, Zap, Crown } from 'lucide-react';
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
import { useCohosts, useIsCohost } from '@/hooks/useCohosts';
import { RideCard } from '@/components/rides/RideCard';
import { CreateRideDialog } from '@/components/rides/CreateRideDialog';
import { EventChat } from '@/components/chat/EventChat';
import { LiveTracking } from '@/components/tracking/LiveTracking';
import { LiveMemberTracker } from '@/components/tracking/LiveMemberTracker';
import { LiveUpdates } from '@/components/events/LiveUpdates';
import { RallyHomeButton } from '@/components/home/RallyHomeButton';
import { GoingHomeTracker } from '@/components/home/GoingHomeTracker';
import { AddCohostDialog } from '@/components/events/AddCohostDialog';
import { BarHopStopsMap } from '@/components/tracking/BarHopStopsMap';
import { BarHopControls } from '@/components/events/BarHopControls';
import { BarHopStopManager } from '@/components/events/BarHopStopManager';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import { useBarHopStopsRealtime } from '@/hooks/useBarHopStopsRealtime';
import { toast } from 'sonner';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const { data: rides } = useRides(id);
  const { updates } = useEventRealtime(id);
  useBarHopStopsRealtime(id); // Real-time updates for bar hop stops
  const joinEvent = useJoinEvent();
  const leaveEvent = useLeaveEvent();
  const updateEvent = useUpdateEvent();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Dev mode - bypass auth
  const isDev = true;

  if (authLoading && !isDev) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user && !isDev) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20">
        <Header />
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

  // Use dev profile if no real profile
  const devProfile = { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', display_name: 'Dev User' };
  const activeProfile = profile || (isDev ? devProfile : null);

  const isAttending = isDev ? true : event.attendees?.some(a => a.profile?.id === activeProfile?.id);
  const isCreator = event.creator?.id === activeProfile?.id;
  const isCohost = useIsCohost(event.id);
  const canManage = isCreator || isCohost;
  const attendeeCount = event.attendees?.length || 0;
  const isLiveEvent = new Date(event.start_time) <= new Date();

  const handleJoin = async () => {
    if (!profile) return;
    try {
      await joinEvent.mutateAsync({ eventId: event.id, profileId: profile.id });
      toast.success("You're in! 🎉");
    } catch (error: any) {
      toast.error(error.message || 'Failed to join event');
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
    <div className="min-h-screen pb-20">
      <Header />
      
      <main className="container py-6 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/events">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
          </Link>
        </Button>

        {/* Live Updates Banner */}
        {updates.length > 0 && <LiveUpdates updates={updates} />}

        {/* Event Header */}
        <div className="space-y-4">
          {event.image_url && (
            <div className="aspect-video relative overflow-hidden rounded-lg bg-muted">
              <img 
                src={event.image_url} 
                alt={event.title}
                className="object-cover w-full h-full"
              />
              {event.is_barhop && (
                <Badge className="absolute top-3 right-3 bg-secondary">
                  <Beer className="h-3 w-3 mr-1" /> Bar Hop
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{event.event_type}</Badge>
                {event.is_quick_rally && (
                  <Badge className="bg-secondary/20 text-secondary border-0">
                    <Zap className="h-3 w-3 mr-1" />
                    Quick
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold">{event.title}</h1>
            </div>
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Share2 className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share This Rally</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Invite Code</p>
                    <div className="bg-muted rounded-xl p-4">
                      <p className="text-3xl font-bold tracking-widest font-montserrat text-primary">
                        {event.invite_code || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/join/${event.invite_code}`);
                        toast.success('Link copied!');
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button 
                      onClick={async () => {
                        if (navigator.share) {
                          await navigator.share({
                            title: `Join ${event.title}`,
                            text: `Join my R@lly! Code: ${event.invite_code}`,
                            url: `${window.location.origin}/join/${event.invite_code}`,
                          });
                        } else {
                          navigator.clipboard.writeText(`${window.location.origin}/join/${event.invite_code}`);
                          toast.success('Link copied!');
                        }
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {event.description && (
            <p className="text-muted-foreground">{event.description}</p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{format(new Date(event.start_time), 'EEEE, MMMM d · h:mm a')}</span>
            </div>
            
            {event.location_name && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{event.location_name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>
                {attendeeCount} attending
                {event.max_attendees && ` · ${event.max_attendees} max`}
              </span>
            </div>
          </div>

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

          {/* Join/Leave Button */}
          {!isCreator && (
            <div className="pt-2">
              {isAttending ? (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleLeave}
                  disabled={leaveEvent.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Leave Event
                </Button>
              ) : (
                <Button 
                  className="w-full gradient-primary"
                  onClick={handleJoin}
                  disabled={joinEvent.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Join Event
                </Button>
              )}
            </div>
          )}
        </div>

        {/* R@lly Home Button - Only show during live events for attendees */}
        {isLiveEvent && isAttending && (
          <section className="space-y-4">
            <RallyHomeButton 
              eventId={event.id}
              trigger={
                <Card className="bg-gradient-to-r from-secondary to-secondary/80 border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Home className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg font-montserrat">R@lly Home</h3>
                        <p className="text-white/80 text-sm font-montserrat">Let your crew know you're heading out</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              }
            />
          </section>
        )}

        {/* Going Home Tracker - Show who's heading home */}
        {isLiveEvent && <GoingHomeTracker eventId={event.id} />}

        {/* Tabs for Details, Chat, Tracking, Rides */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5" />
              Track
            </TabsTrigger>
            <TabsTrigger value="rides">Rides</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Bar Hop Mode Toggle - Only for event managers */}
            {canManage && (
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
                    {event.attendees.map((attendee) => (
                      <div key={attendee.id} className="flex flex-col items-center gap-1">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {attendee.profile?.display_name?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate max-w-16">
                          {attendee.profile?.display_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bar Hop Stops - Show when bar hop mode is enabled */}
            {event.is_barhop && (
              <>
                {/* Bar Hop Controls - Host can move between stops */}
                <BarHopControls
                  eventId={event.id}
                  stops={event.stops || []}
                  canManage={canManage}
                  hostName={activeProfile?.display_name || 'Host'}
                />

                {/* Full Stop Manager with reorder, remove, ETA */}
                <BarHopStopManager
                  eventId={event.id}
                  stops={event.stops || []}
                  canManage={canManage}
                />
              </>
            )}

            {/* Bar Hop Map - Show when stops have coordinates */}
            {event.is_barhop && event.stops && event.stops.length > 0 && (
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
              <EventChat eventId={event.id} eventTitle={event.title} />
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

            {/* Live Member Tracker with GPS, compass, and distance/bearing */}
            <LiveMemberTracker eventId={event.id} isLive={isLiveEvent} />
          </TabsContent>

          <TabsContent value="rides" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Rides (DD Mode)</CardTitle>
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
      </main>

      <BottomNav />
    </div>
  );
}