import { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Beer, Check, X, MessageCircle, Navigation, Home, Plus, Zap, Crown, UserPlus, Car, Play, Moon, PartyPopper } from 'lucide-react';
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
import { useCohosts } from '@/hooks/useCohosts';
import { useMyDDRequest, useEventDDs } from '@/hooks/useDDManagement';
import { useStartRally, useEndRally } from '@/hooks/useAfterRally';
import { RideCard } from '@/components/rides/RideCard';
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
import { toast } from 'sonner';

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
  const [showFirstTimeWelcome, setShowFirstTimeWelcome] = useState(false);
  const [showAfterRallyOptIn, setShowAfterRallyOptIn] = useState(false);

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

  // Show After R@lly opt-in dialog when event transitions to after_rally
  useEffect(() => {
    if (isAfterRally && isAttending && !isCreator && !isCohost) {
      // Check if user hasn't opted in yet (we use sessionStorage to track if dialog was shown)
      const shownKey = `after_rally_shown_${id}`;
      if (!sessionStorage.getItem(shownKey)) {
        sessionStorage.setItem(shownKey, 'true');
        setShowAfterRallyOptIn(true);
      }
    }
  }, [isAfterRally, isAttending, isCreator, isCohost, id]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
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
              <h1 className="text-2xl font-bold">{event.title}</h1>
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

          {/* Location Map Preview - Show if event has coordinates */}
          {event.location_lat && event.location_lng && !event.is_barhop && (
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

        {/* Host Rally Controls - Start/End Rally */}
        {canManage && isLiveEvent && !isAfterRally && (
          <Card className="bg-gradient-to-r from-primary to-primary/80 border-0 shadow-lg">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  {isScheduled ? (
                    <Play className="h-6 w-6 text-white" />
                  ) : (
                    <Moon className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg font-montserrat">
                    {isScheduled ? 'Start R@lly' : 'End R@lly'}
                  </h3>
                  <p className="text-white/80 text-sm font-montserrat">
                    {isScheduled 
                      ? 'Go live and notify your crew' 
                      : 'Transition to After R@lly'
                    }
                  </p>
                </div>
              </div>
              {isScheduled ? (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await startRally.mutateAsync(event.id);
                      toast.success('R@lly is live! 🎉');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to start rally');
                    }
                  }}
                  disabled={startRally.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await endRally.mutateAsync(event.id);
                      toast.success('After R@lly started! 🌙');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to end rally');
                    }
                  }}
                  disabled={endRally.isPending}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  End Rally
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* After R@lly Banner - Show when in after_rally status */}
        {isAfterRally && (
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 border-0 shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <PartyPopper className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg font-montserrat">After R@lly Mode</h3>
                <p className="text-white/80 text-sm font-montserrat">The main event has ended. Continue the night!</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* R@lly Home Button - Only show during live events for attendees */}
        {(isLiveEvent || isAfterRally) && isAttending && (
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


        {/* Safety Tracker - Always show during/after live events (independent of event status) */}
        {(isLiveEvent || isAfterRally) && <SafetyTracker eventId={event.id} />}
        
        {/* Host Safety Dashboard - For hosts and co-hosts */}
        {canManage && (isLiveEvent || isAfterRally) && (
          <HostSafetyDashboard eventId={event.id} />
        )}

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
                    {event.attendees.map((attendee) => {
                      // Use is_dd from attendee data directly (from safe_event_attendees view)
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
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 shadow-lg">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Navigation className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white font-montserrat">Need a Ride?</h3>
                      <p className="text-white/80 text-sm">Request a safe ride to the event</p>
                    </div>
                  </div>
                  <RequestRideDialog eventId={event.id} eventName={event.title} />
                </CardContent>
              </Card>
            )}

            {/* DD Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Designated Drivers
                </CardTitle>
                {isAttending && <DDVolunteerButton eventId={event.id} />}
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
        onHeadHome={() => {
          // Trigger R@lly Home flow
          toast.info('Opening R@lly Home...');
        }}
      />
    </div>
  );
}