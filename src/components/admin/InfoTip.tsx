import { Info } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTipProps {
  /** 1-2 sentence partner-friendly explanation. Plain English only. */
  text: string;
  className?: string;
}

/**
 * Plain-English tooltip for technical metrics. Hover on desktop, tap on mobile.
 * Uses Radix Tooltip with Portal, so it escapes any overflow-hidden ancestors.
 */
export function InfoTip({ text, className }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="What does this mean?"
            onClick={(e) => {
              // Tap-to-toggle on touch devices (Radix doesn't open Tooltip on click by default).
              e.preventDefault();
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 active:bg-muted transition-colors touch-manipulation',
              className
            )}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" className="max-w-[280px] text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
