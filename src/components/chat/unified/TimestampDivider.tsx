import { format, isToday, isYesterday, differenceInDays } from 'date-fns';

export function formatChatDivider(d: Date): string {
  if (isToday(d)) return `Today ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
  if (differenceInDays(new Date(), d) < 7) return format(d, 'EEE h:mm a');
  return format(d, 'MMM d, h:mm a');
}

export function TimestampDivider({ at }: { at: string | Date }) {
  const d = typeof at === 'string' ? new Date(at) : at;
  return (
    <div className="flex items-center gap-2 my-3 px-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {formatChatDivider(d)}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    </div>
  );
}
