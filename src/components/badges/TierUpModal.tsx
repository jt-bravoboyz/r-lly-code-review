import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, ChevronRight } from 'lucide-react';
import { TierBadgeIcon } from './TierBadgeIcon';
import { useConfetti } from '@/hooks/useConfetti';
import { useMarkTierSeen, type TierUpData } from '@/hooks/useBadgeSystem';
import { cn } from '@/lib/utils';

interface TierUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierUpData: TierUpData | null;
}

type AnimationStage = 'backdrop' | 'burst' | 'badge' | 'text' | 'complete';

export function TierUpModal({ isOpen, onClose, tierUpData }: TierUpModalProps) {
  const [stage, setStage] = useState<AnimationStage>('backdrop');
  const { fireRallyConfetti } = useConfetti();
  const confettiRef = useRef(fireRallyConfetti);
  confettiRef.current = fireRallyConfetti;
  const markTierSeen = useMarkTierSeen();
  const hasAnimatedRef = useRef(false);

  // Animation sequence — runs exactly once per open
  useEffect(() => {
    if (!isOpen) {
      setStage('backdrop');
      hasAnimatedRef.current = false;
      return;
    }

    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    const timers = [
      setTimeout(() => setStage('burst'), 200),
      setTimeout(() => setStage('badge'), 500),
      setTimeout(() => {
        setStage('text');
        confettiRef.current();
      }, 800),
      setTimeout(() => {
        setStage('complete');
        confettiRef.current();
      }, 1400),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  const handleClose = async () => {
    if (tierUpData?.historyId) {
      await markTierSeen.mutateAsync(tierUpData.historyId);
    }
    onClose();
  };

  const handleShare = () => {
    if (!tierUpData?.toTier) return;
    
    // Web Share API or fallback
    if (navigator.share) {
      navigator.share({
        title: 'R@lly Tier Up!',
        text: `I just reached ${tierUpData.toTier.tier_name} tier on R@lly! 🎉`,
      }).catch(() => {});
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(
        `I just reached ${tierUpData.toTier.tier_name} tier on R@lly! 🎉`
      );
    }
  };

  if (!tierUpData?.toTier) return null;

  const tier = tierUpData.toTier;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent">
        <div 
          className={cn(
            "relative flex flex-col items-center justify-center min-h-[480px] p-8 rounded-2xl",
            "bg-gradient-to-b from-background via-background to-background/95",
            "transition-opacity duration-300",
            stage === 'backdrop' ? 'opacity-0' : 'opacity-100'
          )}
        >
          {/* Light burst effect */}
          <div 
            className={cn(
              "absolute inset-0 pointer-events-none",
              stage !== 'backdrop' && "animate-light-burst"
            )}
            style={{
              background: `radial-gradient(circle at center, ${tier.accent_color}40 0%, transparent 70%)`,
            }}
          />

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/40 animate-float"
                style={{
                  left: `${20 + i * 12}%`,
                  top: `${30 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '4s',
                }}
              />
            ))}
          </div>

          {/* Badge reveal */}
          <div 
            className={cn(
              "relative z-10 transition-all duration-700",
              stage === 'backdrop' || stage === 'burst' 
                ? 'opacity-0 scale-50 blur-sm' 
                : 'opacity-100 scale-100 blur-0',
              stage === 'badge' && 'animate-badge-reveal'
            )}
          >
            <TierBadgeIcon 
              tier={tier} 
              size="xl" 
              showGlow 
            />
          </div>

          {/* Congrats title */}
          <h2 
            className={cn(
              "mt-8 text-2xl font-bold text-center tracking-tight transition-all duration-500",
              stage === 'text' || stage === 'complete'
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-4'
            )}
            style={{ color: tier.accent_color }}
          >
            {tier.congrats_title}
          </h2>

          {/* Congrats body */}
          <p 
            className={cn(
              "mt-3 text-center text-muted-foreground max-w-[280px] transition-all duration-500 delay-100",
              stage === 'text' || stage === 'complete'
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-4'
            )}
          >
            {tier.congrats_body}
          </p>

          {/* Points display */}
          <div 
            className={cn(
              "mt-6 flex items-center gap-2 text-sm font-semibold transition-all duration-500 delay-200",
              stage === 'complete' 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-4'
            )}
          >
            <span className="text-primary">⭐</span>
            <span>{tierUpData.totalPoints.toLocaleString()} Total Points</span>
            <span className="text-primary">⭐</span>
          </div>

          {/* Action buttons */}
          <div 
            className={cn(
              "mt-8 flex gap-3 transition-all duration-500 delay-300",
              stage === 'complete' 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-4'
            )}
          >
            <Button
              variant="outline"
              size="lg"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <Button
              size="lg"
              onClick={handleClose}
              className="gap-2 btn-rally"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
