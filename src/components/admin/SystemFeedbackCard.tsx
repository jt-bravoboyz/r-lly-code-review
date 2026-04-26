import { useEffect, useState } from 'react';
import { MessageSquare, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { BentoCard } from './BentoCard';
import { MetricPill } from './MetricPill';

interface FeedbackRow {
  id: string;
  user_id: string;
  type: string;
  message: string;
  screen_path: string | null;
  created_at: string;
}

const typeIcon: Record<string, any> = {
  bug: Bug,
  feature: Lightbulb,
  other: HelpCircle,
};

const typeTone: Record<string, 'warning' | 'accent' | 'muted'> = {
  bug: 'warning',
  feature: 'accent',
  other: 'muted',
};

export function SystemFeedbackCard() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('system_feedback' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setFeedback((data as any as FeedbackRow[]) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel('system-feedback-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_feedback' }, (payload) => {
        setFeedback(prev => [payload.new as FeedbackRow, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <BentoCard span={12}>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          System Feedback
        </span>
        {feedback.length > 0 && (
          <MetricPill tone="muted" className="ml-auto">
            <span className="tabular-nums">{feedback.length}</span>
          </MetricPill>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : feedback.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No feedback yet</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 -mr-1">
          {feedback.map((fb) => {
            const Icon = typeIcon[fb.type] || HelpCircle;
            return (
              <div
                key={fb.id}
                className="flex gap-3 p-3 rounded-xl border border-border/30 bg-background/40"
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <MetricPill tone={typeTone[fb.type] || 'muted'} className="capitalize">
                      {fb.type}
                    </MetricPill>
                    {fb.screen_path && (
                      <span className="text-[10px] text-muted-foreground font-mono truncate">{fb.screen_path}</span>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{fb.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                    {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BentoCard>
  );
}
