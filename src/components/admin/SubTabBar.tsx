import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SubTab {
  key: string;
  label: string;
}

interface SubTabBarProps {
  tabs: SubTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Apple-Pro segmented sub-tab bar with sliding indicator.
 * Use inside a top-level admin view to split content into focused sections.
 * Sticks to the top of the scroll container (sticky top-[72px]) on mobile so
 * users can switch sections without losing context.
 */
export function SubTabBar({ tabs, active, onChange, className }: SubTabBarProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = refs.current[active];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, tabs.length]);

  return (
    <div
      className={cn(
        'sticky top-[64px] z-40 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 mb-4',
        'bg-background/80 backdrop-blur-xl',
        className
      )}
    >
      <div className="relative inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 p-1 backdrop-blur-sm overflow-x-auto max-w-full no-scrollbar">
        <div
          className="absolute top-1 bottom-1 rounded-full bg-card shadow-sm border border-border/40 transition-all duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
          aria-hidden
        />
        {tabs.map((tab) => (
          <button
            key={tab.key}
            ref={(el) => (refs.current[tab.key] = el)}
            onClick={() => onChange(tab.key)}
            className={cn(
              'relative z-10 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap',
              active === tab.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
