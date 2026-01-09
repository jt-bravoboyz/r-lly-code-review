import { cn } from '@/lib/utils';
import type { BadgeTier } from '@/lib/badges';

interface BadgeIconProps {
  tier: BadgeTier;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  locked?: boolean;
}

export function BadgeIcon({ tier, size = 'md', className, locked = false }: BadgeIconProps) {
  const sizeClasses = {
    sm: 'w-[60px] h-[60px]',
    md: 'w-[90px] h-[90px]',
    lg: 'w-[132px] h-[132px]',
  };

  return (
    <div 
      className={cn(
        'relative flex items-center justify-center',
        sizeClasses[size],
        locked && 'opacity-40 grayscale',
        className
      )}
    >
      {/* Outer gem shape */}
      <div 
        className="absolute inset-0 rounded-xl"
        style={{ 
          background: tier.gradient,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        }}
      />
      
      {/* Inner gem highlight */}
      <div 
        className="absolute inset-[15%] rounded-lg opacity-60"
        style={{ 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        }}
      />
      
      {/* Center facet */}
      <div 
        className="absolute inset-[30%] rounded"
        style={{ 
          background: `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, ${tier.accentColor}80 100%)`,
          clipPath: 'polygon(50% 10%, 90% 50%, 50% 90%, 10% 50%)',
        }}
      />
      
      {/* Shine effect */}
      <div 
        className="absolute top-[10%] left-[20%] w-[25%] h-[15%] rounded-full opacity-50"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
        }}
      />
    </div>
  );
}
