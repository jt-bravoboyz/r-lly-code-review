import { ReactNode, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface SwipeDismissCardProps {
  children: ReactNode;
  onDismiss: () => void;
  className?: string;
}

export function SwipeDismissCard({ children, onDismiss, className }: SwipeDismissCardProps) {
  const [dismissed, setDismissed] = useState<'left' | 'right' | null>(null);
  const [removed, setRemoved] = useState(false);
  const { triggerButtonFeedback } = useHaptics();

  const handleDismiss = useCallback((direction: 'left' | 'right') => {
    triggerButtonFeedback();
    setDismissed(direction);
    setTimeout(() => {
      setRemoved(true);
      setTimeout(() => onDismiss(), 50);
    }, 300);
  }, [onDismiss, triggerButtonFeedback]);

  const { offset, isSwiping, handlers } = useSwipeGesture({
    onSwipeLeft: () => handleDismiss('left'),
    onSwipeRight: () => handleDismiss('right'),
    disabled: dismissed !== null,
    threshold: 120,
    resistance: 1,
  });

  if (removed) {
    return (
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: 0, opacity: 0, marginBottom: 0 }}
      />
    );
  }

  const progress = Math.min(Math.abs(offset) / 120, 1);
  const rotation = (offset / 120) * 3;
  const opacity = 1 - progress * 0.3;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl transition-all duration-300',
        dismissed && 'pointer-events-none',
        className
      )}
      style={{
        maxHeight: dismissed ? 0 : 200,
        opacity: dismissed ? 0 : 1,
        marginBottom: dismissed ? 0 : undefined,
        transitionProperty: dismissed ? 'max-height, opacity, margin-bottom' : undefined,
        transitionDuration: dismissed ? '300ms' : undefined,
        transitionDelay: dismissed ? '250ms' : undefined,
      }}
    >
      {/* Background reveal */}
      <div
        className="absolute inset-0 flex items-center rounded-xl bg-destructive/10"
        style={{ opacity: progress }}
      >
        <div
          className={cn(
            'flex items-center gap-2 text-destructive/70 transition-opacity',
            offset > 0 ? 'ml-5' : 'ml-auto mr-5'
          )}
          style={{ opacity: progress, transform: `scale(${0.7 + progress * 0.3})` }}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-xs font-medium">Dismiss</span>
        </div>
      </div>

      {/* Card content */}
      <div
        {...handlers}
        className={cn(
          'relative',
          !isSwiping && !dismissed && 'transition-transform duration-200 ease-out'
        )}
        style={{
          transform: dismissed
            ? `translateX(${dismissed === 'left' ? '-120%' : '120%'})`
            : `translateX(${offset}px) rotate(${rotation}deg)`,
          opacity: dismissed ? 0 : opacity,
          transition: dismissed
            ? 'transform 300ms ease-out, opacity 300ms ease-out'
            : !isSwiping
            ? 'transform 200ms ease-out'
            : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
