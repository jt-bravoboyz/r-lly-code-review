import { cn } from '@/lib/utils';
import { TierBadgeIcon } from './TierBadgeIcon';
import { Check } from 'lucide-react';
import { getTierQuote } from '@/lib/badges';
import type { BadgeTier } from '@/hooks/useBadgeSystem';

interface TierLadderProps {
  tiers: BadgeTier[];
  currentTierKey: string | null;
  totalPoints: number;
  className?: string;
}

export function TierLadder({ tiers, currentTierKey, totalPoints, className }: TierLadderProps) {
  const currentTierIndex = tiers.findIndex(t => t.tier_key === currentTierKey);

  return (
    <div className={cn('space-y-2', className)}>
      {tiers.map((tier, index) => {
        const isUnlocked = index <= currentTierIndex;
        const isCurrent = tier.tier_key === currentTierKey;
        const isNext = index === currentTierIndex + 1;
        const pointsToUnlock = tier.min_points - totalPoints;

        return (
          <div
            key={tier.tier_key}
            className={cn(
              'relative flex items-center gap-4 p-3 rounded-xl transition-all duration-200',
              isCurrent && 'bg-primary/10 border border-primary/30',
              isUnlocked && !isCurrent && 'bg-muted/50',
              !isUnlocked && 'opacity-60'
            )}
          >
            {/* Connector line */}
            {index < tiers.length - 1 && (
              <div 
                className={cn(
                  'absolute left-[26px] top-[52px] w-0.5 h-6 -ml-px',
                  index < currentTierIndex ? 'bg-primary' : 'bg-border'
                )}
              />
            )}

            {/* Badge icon */}
            <TierBadgeIcon 
              tier={tier} 
              size="sm" 
              locked={!isUnlocked}
              showGlow={isCurrent}
            />

            {/* Tier info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-semibold text-sm',
                  isCurrent && 'text-primary'
                )}>
                  {tier.tier_name}
                </span>
                {isCurrent && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/20 px-1.5 py-0.5 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {tier.min_points.toLocaleString()}
                {tier.max_points ? ` - ${tier.max_points.toLocaleString()}` : '+'} pts
              </div>
              {/* Quote - only revealed when unlocked */}
              {isUnlocked ? (
                <p className="text-xs italic text-muted-foreground/80 mt-1 leading-relaxed whitespace-pre-line">
                  {getTierQuote(tier.tier_key)}
                </p>
              ) : (
                <p className="text-xs italic text-muted-foreground/50 mt-1">
                  Unlock to reveal
                </p>
              )}
            </div>

            {/* Status indicator */}
            <div className="flex-shrink-0">
              {isUnlocked ? (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>
              ) : isNext ? (
                <div className="text-xs font-medium text-muted-foreground">
                  {pointsToUnlock > 0 && `${pointsToUnlock} pts`}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
