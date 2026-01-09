import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { RideCard } from '@/components/rides/RideCard';
import { CreateRideDialog } from '@/components/rides/CreateRideDialog';
import { useRides } from '@/hooks/useRides';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Car } from 'lucide-react';

export default function Rides() {
  const { user, loading: authLoading } = useAuth();
  const { data: rides, isLoading } = useRides();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen pb-20">
      <Header title="Rides" />
      
      <main className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">DD Mode</h1>
            <p className="text-muted-foreground">Get home safe with a sober driver</p>
          </div>
          <CreateRideDialog />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : rides && rides.length > 0 ? (
          <div className="space-y-4">
            {rides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No rides available</h3>
            <p className="text-muted-foreground mb-4">Offer a ride to help others get home safe!</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}