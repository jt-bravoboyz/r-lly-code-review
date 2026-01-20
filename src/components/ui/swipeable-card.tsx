import { ReactNode } from 'react';
import { MessageCircle, Zap } from 'lucide-react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
  leftAction?: {
    icon?: ReactNode;
    label?: string;
    className?: string;
  };
  rightAction?: {
    icon?: ReactNode;
    label?: string;
    className?: string;
  };
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  leftAction = {
    icon: <MessageCircle className="h-5 w-5" />,
    label: 'Chat',
    className: 'bg-blue-500',
  },
  rightAction = {
    icon: <Zap className="h-5 w-5" />,
    label: 'Rally',
    className: 'bg-primary',
  },
  className,
}: SwipeableCardProps) {
  const { triggerButtonFeedback } = useHaptics();

  const handleSwipeLeft = () => {
    triggerButtonFeedback();
    onSwipeLeft?.();
  };

  const handleSwipeRight = () => {
    triggerButtonFeedback();
    onSwipeRight?.();
  };

  const { offset, isSwiping, handlers } = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    disabled,
    threshold: 80,
  });

  // Calculate opacity and scale based on offset
  const leftProgress = Math.min(Math.max(offset / 80, 0), 1);
  const rightProgress = Math.min(Math.max(-offset / 80, 0), 1);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      {/* Left action - Chat (revealed on swipe right) */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 flex items-center justify-center px-6 text-white transition-opacity',
          leftAction.className
        )}
        style={{
          opacity: leftProgress,
          width: Math.max(Math.abs(offset), 0),
        }}
      >
        <div
          className="flex flex-col items-center gap-1"
          style={{
            transform: `scale(${0.8 + leftProgress * 0.2})`,
            opacity: leftProgress,
          }}
        >
          {leftAction.icon}
          <span className="text-xs font-medium">{leftAction.label}</span>
        </div>
      </div>

      {/* Right action - Rally (revealed on swipe left) */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 flex items-center justify-center px-6 text-primary-foreground transition-opacity',
          rightAction.className
        )}
        style={{
          opacity: rightProgress,
          width: Math.max(Math.abs(offset), 0),
        }}
      >
        <div
          className="flex flex-col items-center gap-1"
          style={{
            transform: `scale(${0.8 + rightProgress * 0.2})`,
            opacity: rightProgress,
          }}
        >
          {rightAction.icon}
          <span className="text-xs font-medium">{rightAction.label}</span>
        </div>
      </div>

      {/* Main content - transforms on swipe */}
      <div
        {...handlers}
        className={cn(
          'relative bg-card',
          !isSwiping && 'transition-transform duration-200 ease-out'
        )}
        style={{
          transform: `translateX(${offset}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
