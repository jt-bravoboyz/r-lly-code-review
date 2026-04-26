import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTipProps {
  /** 1-2 sentence partner-friendly explanation. Plain English only. */
  text: string;
  className?: string;
}

/**
 * Plain-English tooltip for technical metrics (K-Factor, DAU/WAU, cohorts, etc.).
 * Shows a tiny info icon — hover/focus/tap reveals the explanation.
 */
export function InfoTip({ text, className }: InfoTipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="What does this mean?"
            className={cn(
              'inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors',
              className
            )}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
