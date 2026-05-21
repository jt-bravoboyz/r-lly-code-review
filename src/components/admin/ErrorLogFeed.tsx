import { useQuery } from '@tanstack/react-query';
import { copyToClipboard } from '@/lib/nativeShare';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Copy } from 'lucide-react';
import { AdminEmptyState } from './AdminEmptyState';
import { BentoCard } from './BentoCard';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Severity = 'error' | 'warn' | 'info';

function classifySeverity(meta: Record<string, unknown> | null): Severity {
  const sev = String(meta?.severity || meta?.level || '').toLowerCase();
  if (sev.includes('warn')) return 'warn';
  if (sev.includes('info')) return 'info';
  return 'error';
}

export function ErrorLogFeed() {
  const { data: errors } = useQuery({
    queryKey: ['admin-error-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('analytics_events')
        .select('event_name, created_at, user_id, metadata')
        .eq('event_name', 'client_error')
        .order('created_at', { ascending: false })
        .range(0, 49);
      return data || [];
    },
    refetchInterval: 15000,
  });

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyOne = (text: string, idx: number) => {
    copyToClipboard(text);
    setCopiedIdx(idx);
    toast.success('Error copied');
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = () => {
    if (!errors?.length) return;
    const dump = errors
      .map(e => {
        const m = e.metadata as Record<string, unknown> | null;
        const sev = classifySeverity(m).toUpperCase();
        const time = e.created_at ? format(new Date(e.created_at), 'yyyy-MM-dd HH:mm:ss') : '';
        const msg = String(m?.message || 'Unknown error');
        const stack = String(m?.stack || '');
        const path = String(m?.path || m?.url || '');
        return `[${sev}] ${time}\n${msg}${path ? `\nat ${path}` : ''}${stack ? `\n${stack}` : ''}`;
      })
      .join('\n\n---\n\n');
    copyToClipboard(dump);
    toast.success(`Copied ${errors.length} error${errors.length === 1 ? '' : 's'}`);
  };

  // Debug-grade card: solid background, full-opacity border, no glass blur,
  // saturated severity tokens. Overrides BentoCard's translucent default for
  // field-readability under sunlight.
  return (
    <BentoCard
      span={6}
      className="bg-background border-border/80 hover:translate-y-0 hover:shadow-md backdrop-blur-none"
      contentClassName="p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Error Log
          </h3>
          {errors && errors.length > 0 && (
            <span className="inline-flex h-5 items-center rounded-full bg-red-500/15 border border-red-500/40 px-2 text-[10px] font-bold tabular-nums text-red-500">
              {errors.length}
            </span>
          )}
        </div>
        {errors && errors.length > 0 && (
          <button
            type="button"
            onClick={copyAll}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-foreground/5 active:bg-foreground/10 transition-colors"
          >
            <Copy className="h-3 w-3" />
            Copy all
          </button>
        )}
      </div>

      {!errors || errors.length === 0 ? (
        <AdminEmptyState
          icon={<AlertTriangle className="h-10 w-10 opacity-30" />}
          message="No errors logged — smooth sailing! 🎉"
        />
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 -mr-1">
          {errors.map((e, i) => {
            const meta = e.metadata as Record<string, unknown> | null;
            const sev = classifySeverity(meta);
            const sevColor =
              sev === 'error'
                ? 'text-red-500'
                : sev === 'warn'
                ? 'text-amber-500'
                : 'text-sky-400';
            const msg = String(meta?.message || 'Unknown error');
            const stack = meta?.stack ? String(meta.stack) : '';
            const path = meta?.path || meta?.url ? String(meta.path || meta.url) : '';
            const timeStr = e.created_at ? format(new Date(e.created_at), 'MMM d HH:mm:ss') : '';
            const fullText = `[${sev.toUpperCase()}] ${timeStr}\n${msg}${path ? `\nat ${path}` : ''}${stack ? `\n${stack}` : ''}`;

            return (
              <div
                key={i}
                className={cn(
                  'group relative rounded-md border border-border/80 bg-background px-3 py-2',
                  'hover:bg-foreground/5 active:bg-foreground/10 transition-colors',
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      'shrink-0 text-[10px] font-bold uppercase tracking-wider tabular-nums',
                      sevColor,
                    )}
                  >
                    {sev}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs leading-snug text-foreground whitespace-pre-wrap break-all">
                      {msg}
                    </p>
                    {path && (
                      <p className="font-mono text-[10px] leading-snug text-foreground/60 whitespace-pre-wrap break-all mt-0.5">
                        at {path}
                      </p>
                    )}
                    {stack && (
                      <pre className="font-mono text-[10px] leading-snug text-foreground/50 whitespace-pre-wrap break-all mt-1 max-h-24 overflow-y-auto">
                        {stack}
                      </pre>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-mono tabular-nums text-foreground/60">
                    {timeStr}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyOne(fullText, i)}
                  className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80 opacity-0 group-hover:opacity-100 hover:bg-foreground/5 transition-opacity"
                  aria-label="Copy this error"
                >
                  <Copy className="h-2.5 w-2.5" />
                  {copiedIdx === i ? 'Copied' : 'Copy'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </BentoCard>
  );
}
