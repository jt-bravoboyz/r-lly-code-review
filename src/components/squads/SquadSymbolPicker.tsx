import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Shield,
  Sword,
  Swords,
  Target,
  Crosshair,
  Medal,
  Star,
  Crown,
  Flag,
  Anchor,
  Skull,
  Flame,
  Zap,
  Heart,
  Diamond,
  type LucideIcon,
} from 'lucide-react';

export type SquadSymbol = 
  | 'shield' 
  | 'sword' 
  | 'swords' 
  | 'target' 
  | 'crosshair' 
  | 'medal' 
  | 'star' 
  | 'crown' 
  | 'flag' 
  | 'anchor' 
  | 'skull' 
  | 'flame' 
  | 'zap' 
  | 'heart' 
  | 'diamond';

export const SQUAD_SYMBOLS: { id: SquadSymbol; icon: LucideIcon; label: string }[] = [
  { id: 'shield', icon: Shield, label: 'Shield' },
  { id: 'sword', icon: Sword, label: 'Sword' },
  { id: 'swords', icon: Swords, label: 'Swords' },
  { id: 'target', icon: Target, label: 'Target' },
  { id: 'crosshair', icon: Crosshair, label: 'Crosshair' },
  { id: 'medal', icon: Medal, label: 'Medal' },
  { id: 'star', icon: Star, label: 'Star' },
  { id: 'crown', icon: Crown, label: 'Crown' },
  { id: 'flag', icon: Flag, label: 'Flag' },
  { id: 'anchor', icon: Anchor, label: 'Anchor' },
  { id: 'skull', icon: Skull, label: 'Skull' },
  { id: 'flame', icon: Flame, label: 'Flame' },
  { id: 'zap', icon: Zap, label: 'Zap' },
  { id: 'heart', icon: Heart, label: 'Heart' },
  { id: 'diamond', icon: Diamond, label: 'Diamond' },
];

export function getSquadIcon(symbol: string): LucideIcon {
  const found = SQUAD_SYMBOLS.find(s => s.id === symbol);
  return found?.icon || Shield;
}

interface SquadSymbolPickerProps {
  value: SquadSymbol;
  onChange: (symbol: SquadSymbol) => void;
  size?: 'sm' | 'md';
}

export function SquadSymbolPicker({ value, onChange, size = 'md' }: SquadSymbolPickerProps) {
  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className="grid grid-cols-5 gap-2">
      {SQUAD_SYMBOLS.map(({ id, icon: Icon, label }) => (
        <Button
          key={id}
          type="button"
          variant="outline"
          className={cn(
            buttonSize,
            'p-0 transition-all',
            value === id
              ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30'
              : 'hover:bg-primary/10 hover:border-primary/50'
          )}
          onClick={() => onChange(id)}
          title={label}
        >
          <Icon className={iconSize} />
        </Button>
      ))}
    </div>
  );
}

interface SquadSymbolBadgeProps {
  symbol: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function SquadSymbolBadge({ symbol, className, size = 'sm' }: SquadSymbolBadgeProps) {
  const Icon = getSquadIcon(symbol);
  const sizeClasses = {
    xs: 'h-4 w-4 p-0.5',
    sm: 'h-5 w-5 p-0.5',
    md: 'h-6 w-6 p-1',
  };
  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-primary/20 text-primary flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
    </div>
  );
}
