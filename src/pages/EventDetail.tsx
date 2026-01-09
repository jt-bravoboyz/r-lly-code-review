import { useParams, Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Users, Beer, Share2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvent, useJoinEvent, useLeaveEvent } from '@/hooks/useEvents';
import { useRides } from '@/hooks/useRides';
import { useAuth } from '@/hooks/useAuth';
import { RideCard } from '@/components/rides/RideCard';
import { CreateRideDialog } from '@/components/rides/CreateRideDialog';
import { toast } from 'sonner';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: event, isLoading } = useEvent(id);
  const { data: rides } = useRides(id);
  const joinEvent = useJoinEvent();
  const leaveEvent = useLeaveEvent();

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

  const isAttending = event.attendees?.some(a => a.profile?.id === profile?.id);
  const isCreator = event.creator?.id === profile?.id;
  const attendeeCount = event.attendees?.length || 0;

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
              <Badge variant="outline" className="mb-2">{event.event_type}</Badge>
              <h1 className="text-2xl font-bold">{event.title}</h1>
            </div>
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
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

          {/* Host */}
          {event.creator && (
            <div className="flex items-center gap-3 pt-2">
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

        {/* Bar Hop Stops */}
        {event.is_barhop && event.stops && event.stops.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Beer className="h-5 w-5 text-secondary" />
                Bar Hop Stops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.stops.sort((a, b) => a.stop_order - b.stop_order).map((stop, index) => (
                  <div key={stop.id} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{stop.name}</p>
                      {stop.address && (
                        <p className="text-sm text-muted-foreground">{stop.address}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rides Section */}
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
      </main>

      <BottomNav />
    </div>
  );
}