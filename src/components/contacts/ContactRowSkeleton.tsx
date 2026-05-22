import { cn } from '@/lib/utils';

interface ContactRowSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Premium liquid-glass skeleton row that matches the live contact row
 * geometry (avatar + 2 text lines + trailing chip). Renders an adaptive
 * frosted pulse so loading states don't jolt the layout.
 */
export function ContactRowSkeleton({ count = 4, className }: ContactRowSkeletonProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] animate-pulse"
        >
          {/* Avatar shimmer */}
          <div className="h-11 w-11 rounded-2xl shrink-0 bg-black/[0.06] dark:bg-white/[0.05]" />

          {/* Two text lines */}
          <div className="flex-1 min-w-0 space-y-2">
            <div
              className="h-3 rounded-full bg-black/[0.07] dark:bg-white/[0.06]"
              style={{ width: `${55 + ((i * 13) % 30)}%` }}
            />
            <div
              className="h-2.5 rounded-full bg-black/[0.05] dark:bg-white/[0.04]"
              style={{ width: `${35 + ((i * 17) % 25)}%` }}
            />
          </div>

          {/* Trailing chip */}
          <div className="h-7 w-14 rounded-full shrink-0 bg-black/[0.05] dark:bg-white/[0.04]" />

          {/* Inner shimmer sweep */}
          <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/[0.04] to-transparent animate-[shimmer-slide_2.2s_ease-in-out_infinite]" />
        </div>
      ))}
    </div>
  );
}
