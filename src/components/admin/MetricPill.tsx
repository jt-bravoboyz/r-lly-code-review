import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricPillProps {
  children: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'muted';
  className?: string;
}

/**
 * Unified data pill across the admin surface.
 * Replaces the dozen one-off badge styles with consistent height, typography, tone.
 */
export function MetricPill({ children, icon, tone = 'default', className }: MetricPillProps) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium tabular-nums whitespace-nowrap',
        tone === 'default' && 'border-border/60 bg-background/60 text-foreground',
        tone === 'accent' && 'border-primary/30 bg-primary/10 text-primary',
        tone === 'success' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        tone === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        tone === 'muted' && 'border-border/40 bg-muted/40 text-muted-foreground',
        className
      )}
    >
      {icon && <span className="flex h-3.5 w-3.5 items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
