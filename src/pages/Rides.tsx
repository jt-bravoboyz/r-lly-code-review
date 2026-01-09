import { BottomNav } from '@/components/layout/BottomNav';
import { RideCard } from '@/components/rides/RideCard';
import { CreateRideDialog } from '@/components/rides/CreateRideDialog';
import { useRides } from '@/hooks/useRides';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Car, Shield, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import rallyLogo from '@/assets/rally-logo.png';

export default function Rides() {
  const { user, profile, loading: authLoading } = useAuth();
  const { data: rides, isLoading } = useRides();

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
        {/* DD Mode Hero */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 border-0 shadow-lg overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white font-montserrat">DD Mode</h2>
                <p className="text-white/80 text-sm font-montserrat">Get home safe with a sober driver</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card className="bg-white shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-rally-dark font-montserrat">Offer a Ride</h3>
              <p className="text-sm text-muted-foreground font-montserrat">Help others get home safe</p>
            </div>
            <CreateRideDialog />
          </CardContent>
        </Card>

        {/* Available Rides Section */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-rally-dark font-montserrat">Available Rides</h3>
          <span className="text-sm text-muted-foreground">{rides?.length || 0} rides</span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
              <div className="w-16 h-16 rounded-full bg-rally-light mx-auto mb-4 flex items-center justify-center">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-rally-dark font-montserrat">No rides available</h3>
              <p className="text-muted-foreground mb-6 font-montserrat">Be a DD and help others get home safe!</p>
              <CreateRideDialog />
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}