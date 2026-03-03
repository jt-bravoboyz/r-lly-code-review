import { useEffect, useRef } from 'react';
import { useConfetti } from '@/hooks/useConfetti';
import { PartyPopper, Users, Car, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RallyCompleteOverlayProps {
  show: boolean;
  onDone: () => void;
  attendeeCount?: number;
  ddCount?: number;
}

export function RallyCompleteOverlay({ show, onDone, attendeeCount = 0, ddCount = 0 }: RallyCompleteOverlayProps) {
  const { fireRallyConfetti } = useConfetti();
  const confettiRef = useRef(fireRallyConfetti);
  confettiRef.current = fireRallyConfetti;
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!show) {
      hasFiredRef.current = false;
      return;
    }
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    // Fire confetti
    confettiRef.current();
    setTimeout(() => confettiRef.current(), 600);

    // Auto-navigate after 5 seconds so users can absorb the recap
    const timer = setTimeout(() => {
      onDone();
    }, 5000);

    return () => clearTimeout(timer);
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-6 animate-scale-in max-w-xs w-full px-4">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
          <PartyPopper className="h-10 w-10 text-primary" />
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-montserrat text-foreground">
            Mission complete.
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Everyone made it. See you next time.
          </p>
        </div>

        {/* Mission Summary Recap */}
        {attendeeCount > 0 && (
          <div className="w-full rounded-xl bg-card border border-border/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Mission Summary
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span>{attendeeCount} confirmed</span>
              </div>
              {ddCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Car className="h-4 w-4 text-primary shrink-0" />
                  <span>{ddCount} DDs deployed</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>100% accounted for</span>
              </div>
            </div>

            {/* Visual completion bar */}
            <Progress value={100} className="h-2" />
          </div>
        )}
      </div>
    </div>
  );
}
