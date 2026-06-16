import { useNavigate } from 'react-router-dom';
import { Car, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/layout/BottomNav';

/**
 * /rides is a dead nav destination — ride logistics live inside each
 * event. This page only appears on direct deep links and points users
 * back to their R@llies.
 */
export default function Rides() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] pb-bottom-nav flex flex-col items-center justify-center px-6 bg-gradient-to-b from-background via-background to-secondary/10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/10 shadow-2xl p-8 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 ring-1 ring-primary/30">
          <Car className="h-8 w-8 text-primary" strokeWidth={2.2} />
        </div>
        <h1 className="text-2xl font-black font-montserrat tracking-tight text-foreground">
          Rides live inside R@llies
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Coordinate your ride from within any event — offer a seat,
          request a lift, or volunteer as DD.
        </p>
        <Button
          onClick={() => navigate('/events')}
          className="mt-6 w-full h-12 btn-gradient-primary font-montserrat font-bold"
        >
          View My R@llies
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
