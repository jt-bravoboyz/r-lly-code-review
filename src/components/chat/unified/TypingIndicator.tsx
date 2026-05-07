interface Props {
  names: string[];
}

export function TypingIndicator({ names }: Props) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing…`
        : `${names[0]} and ${names.length - 1} others are typing…`;

  return (
    <div className="flex items-end gap-2 px-2 pb-1 animate-fade-in">
      <div className="rounded-2xl rounded-bl-md bg-foreground/5 dark:bg-white/[0.08] backdrop-blur-md border border-border/50 px-4 py-2.5 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1s_infinite]" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1s_infinite]" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1s_infinite]" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-[11px] text-muted-foreground italic mb-1">{label}</span>
    </div>
  );
}
