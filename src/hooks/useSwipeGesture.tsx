import { useState, useRef, useCallback, TouchEvent } from 'react';

interface SwipeGestureOptions {
  threshold?: number;
  velocityThreshold?: number;
  resistance?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
}

interface SwipeGestureReturn {
  offset: number;
  isSwiping: boolean;
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: () => void;
  };
  reset: () => void;
}

export function useSwipeGesture({
  threshold = 80,
  velocityThreshold = 0.5,
  resistance = 0.6,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: SwipeGestureOptions = {}): SwipeGestureReturn {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const reset = useCallback(() => {
    setOffset(0);
    setIsSwiping(false);
    isHorizontalSwipe.current = null;
  }, []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startTime.current = Date.now();
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [disabled]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Determine if this is a horizontal or vertical swipe on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current === false) {
      return;
    }

    if (isHorizontalSwipe.current === true) {
      // Prevent vertical scrolling during horizontal swipe
      e.preventDefault();
    }

    // Apply resistance to make it feel natural
    const resistedOffset = diffX * resistance;
    setOffset(resistedOffset);
  }, [disabled, isSwiping, resistance]);

  const onTouchEnd = useCallback(() => {
    if (disabled || !isSwiping) return;

    const timeDiff = Date.now() - startTime.current;
    const velocity = Math.abs(offset) / timeDiff;
    
    // Check if swipe threshold is met (by distance or velocity)
    const thresholdMet = Math.abs(offset) > threshold || velocity > velocityThreshold;

    if (thresholdMet && isHorizontalSwipe.current === true) {
      if (offset > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }

    // Reset position
    reset();
  }, [disabled, isSwiping, offset, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, reset]);

  return {
    offset,
    isSwiping,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    reset,
  };
}
