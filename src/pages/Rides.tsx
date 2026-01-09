import { useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { RideCard } from '@/components/rides/RideCard';
import { CreateRideDialog } from '@/components/rides/CreateRideDialog';
import { DDDisclaimerDialog } from '@/components/rides/DDDisclaimerDialog';
import { RequestRideDialog } from '@/components/rides/RequestRideDialog';
import { RideRequestManager } from '@/components/rides/RideRequestManager';
import { useRides } from '@/hooks/useRides';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { useAwardDDPoints, POINT_VALUES } from '@/hooks/useRewardPoints';
import { Skeleton } from '@/components/ui/skeleton';
import { Car, Shield, Navigation, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import rallyLogo from '@/assets/rally-logo.png';

export default function Rides() {
  const { user, profile, loading: authLoading } = useAuth();
  const { data: events } = useEvents();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEventId = searchParams.get('event') || undefined;
  const { data: rides, isLoading } = useRides(selectedEventId);
  const [showDDDisclaimer, setShowDDDisclaimer] = useState(false);
  const [ddAccepted, setDDAccepted] = useState(false);
  const { awardRideComplete } = useAwardDDPoints();

  // Dev mode - bypass auth for preview
  const isDev = true;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-rally-cream flex items-center justify-center">
            <img src={rallyLogo} alt="R@lly" className="w-14 h-14 object-contain" />
          </div>
        </div>
      </div>
    );
  }

  const handleEventChange = (eventId: string) => {
    if (eventId === 'all') {
      searchParams.delete('event');
    } else {
      searchParams.set('event', eventId);
    }
    setSearchParams(searchParams);
  };

  const handleDDAccept = () => {
    setDDAccepted(true);
  };

  const handleRideComplete = async (rideId: string, passengerId: string) => {
    await awardRideComplete();
  };

  // Get my rides (where I'm the driver)
  const myRides = rides?.filter(r => r.driver?.id === profile?.id) || [];

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Custom Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="h-6" />
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/">
            <img src={rallyLogo} alt="R@lly" className="h-10 w-10 object-contain" />
          </Link>
          <h1 className="text-xl font-bold text-rally-dark font-montserrat">R@lly Ride</h1>
          <Link to="/profile">
            <Avatar className="h-10 w-10 ring-2 ring-primary/30 hover:ring-primary/50 transition-all">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>
      
      <main className="px-4 py-6 space-y-6">
        {/* Event Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Select Event</label>
          <Select value={selectedEventId || 'all'} onValueChange={handleEventChange}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events?.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mode Selection Tabs */}
        <Tabs defaultValue="rider" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50">
            <TabsTrigger value="rider" className="data-[state=active]:bg-primary data-[state=active]:text-white h-12 font-montserrat font-semibold">
              <Navigation className="h-4 w-4 mr-2" />
              R@lly Rider
            </TabsTrigger>
            <TabsTrigger value="dd" className="data-[state=active]:bg-primary data-[state=active]:text-white h-12 font-montserrat font-semibold">
              <Shield className="h-4 w-4 mr-2" />
              R@lly DD
            </TabsTrigger>
          </TabsList>

          {/* R@lly Rider Tab */}
          <TabsContent value="rider" className="mt-6 space-y-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 shadow-lg overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Navigation className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white font-montserrat">Need a Ride?</h2>
                    <p className="text-white/80 text-sm font-montserrat">Request a safe ride home from a R@lly DD</p>
                  </div>
                </div>
                <div className="mt-4">
                  <RequestRideDialog eventId={selectedEventId} />
                </div>
              </CardContent>
            </Card>

            {/* Available Rides for Riders */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-rally-dark font-montserrat">Available DDs</h3>
              <span className="text-sm text-muted-foreground">{rides?.length || 0} available</span>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                ))}
              </div>
            ) : rides && rides.length > 0 ? (
              <div className="space-y-4">
                {rides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            ) : (
              <Card className="bg-white shadow-sm rounded-2xl">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 mx-auto mb-4 flex items-center justify-center">
                    <Car className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-rally-dark font-montserrat">No DDs Available Yet</h3>
                  <p className="text-muted-foreground font-montserrat">Check back soon or request a ride and a DD will respond!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* R@lly DD Tab */}
          <TabsContent value="dd" className="mt-6 space-y-6">
            <Card className="bg-gradient-to-r from-primary to-primary/80 border-0 shadow-lg overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white font-montserrat">Be a R@lly DD</h2>
                    <p className="text-white/80 text-sm font-montserrat">Help your squad get home safe tonight</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!ddAccepted ? (
              <Card className="bg-white shadow-sm rounded-2xl border-2 border-dashed border-primary/30">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-rally-dark font-montserrat">Become a Designated Driver</h3>
                  <p className="text-muted-foreground mb-2 text-sm font-montserrat">
                    Take the pledge to stay sober and help others get home safely.
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      <Award className="h-3 w-3 mr-1" />
                      Earn {POINT_VALUES.DD_RIDE_COMPLETE} pts per ride
                    </Badge>
                  </div>
                  <Button 
                    className="gradient-accent"
                    onClick={() => setShowDDDisclaimer(true)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Accept DD Agreement
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="bg-green-50 border-green-200 rounded-2xl">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-green-800 font-montserrat">DD Mode Active</p>
                      <p className="text-sm text-green-600">Earn {POINT_VALUES.DD_RIDE_COMPLETE}+ points per completed ride</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm rounded-2xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-rally-dark font-montserrat">Offer a Ride</h3>
                      <p className="text-sm text-muted-foreground font-montserrat">Let others know you can drive</p>
                    </div>
                    <CreateRideDialog eventId={selectedEventId} />
                  </CardContent>
                </Card>

                {/* Ride Request Manager */}
                {myRides.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-rally-dark font-montserrat">Ride Requests</h3>
                    </div>
                    <RideRequestManager 
                      rides={myRides} 
                      onRideComplete={handleRideComplete}
                    />
                  </>
                )}

                {/* My Offered Rides */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-rally-dark font-montserrat">My Ride Offers</h3>
                </div>

                {isLoading ? (
                  <Skeleton className="h-32 w-full rounded-2xl" />
                ) : myRides.length > 0 ? (
                  <div className="space-y-4">
                    {myRides.map((ride) => (
                      <RideCard key={ride.id} ride={ride} />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-muted/30 rounded-2xl">
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground font-montserrat">You haven't offered any rides yet</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <DDDisclaimerDialog 
        open={showDDDisclaimer} 
        onOpenChange={setShowDDDisclaimer}
        onAccept={handleDDAccept}
      />

      <BottomNav />
    </div>
  );
}