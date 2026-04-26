import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BentoCardProps {
  children: ReactNode;
  /** Visual emphasis. `hero` = orange ambient glow + ring. `accent` = subtle orange ring. */
  variant?: 'default' | 'hero' | 'accent';
  /** Bento grid column span on md+ screens (1-12). Mobile is always full-width. */
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** Bento grid row span on md+ screens. */
  rowSpan?: 1 | 2 | 3;
  className?: string;
  contentClassName?: string;
}

const spanMap: Record<number, string> = {
  1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4',
  5: 'md:col-span-5', 6: 'md:col-span-6', 7: 'md:col-span-7', 8: 'md:col-span-8',
  9: 'md:col-span-9', 10: 'md:col-span-10', 11: 'md:col-span-11', 12: 'md:col-span-12',
};

const rowSpanMap: Record<number, string> = {
  1: 'md:row-span-1', 2: 'md:row-span-2', 3: 'md:row-span-3',
};

/**
 * Apple-Pro Bento card — premium chrome wrapper for admin modules.
 * Provides rounded-3xl, hairline border, backdrop blur, hover lift, optional orange accent.
 */
export function BentoCard({
  children,
  variant = 'default',
  span = 12,
  rowSpan,
  className,
  contentClassName,
}: BentoCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-3xl border bg-card/60 backdrop-blur-sm',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:shadow-lg',
        variant === 'default' && 'border-border/40 shadow-sm',
        variant === 'accent' && 'border-primary/30 shadow-sm shadow-primary/5',
        variant === 'hero' &&
          'border-primary/40 shadow-md shadow-primary/10 ring-1 ring-primary/20',
        spanMap[span],
        rowSpan && rowSpanMap[rowSpan],
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground/[0.03] to-transparent"
      />
      {variant === 'hero' && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-2/3 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        />
      )}
      <div className={cn('relative h-full p-5 sm:p-6', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
