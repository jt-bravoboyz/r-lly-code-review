import { cn } from '@/lib/utils';

export type DatePreset = 'today' | '7d' | '30d' | 'all';

interface AdminDateFilterProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
}

const presets: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'All' },
];

export function AdminDateFilter({ value, onChange }: AdminDateFilterProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
      {presets.map(p => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full transition-all',
            value === p.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
