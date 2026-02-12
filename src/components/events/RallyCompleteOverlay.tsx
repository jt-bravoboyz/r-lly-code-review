import { useEffect, useRef } from 'react';
import { useConfetti } from '@/hooks/useConfetti';
import { PartyPopper } from 'lucide-react';

interface RallyCompleteOverlayProps {
  show: boolean;
  onDone: () => void;
}

export function RallyCompleteOverlay({ show, onDone }: RallyCompleteOverlayProps) {
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

    // Auto-navigate after 2 seconds
    const timer = setTimeout(() => {
      onDone();
    }, 2000);

    return () => clearTimeout(timer);
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-4 animate-scale-in">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
          <PartyPopper className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold font-montserrat text-foreground">
          R@lly complete.
        </h1>
        <p className="text-muted-foreground text-lg">
          See you at the next one.
        </p>
      </div>
    </div>
  );
}
