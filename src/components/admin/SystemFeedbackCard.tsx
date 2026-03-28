import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

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

const typeColor: Record<string, string> = {
  bug: 'destructive',
  feature: 'default',
  other: 'secondary',
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

    // Realtime
    const channel = supabase
      .channel('system-feedback-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_feedback' }, (payload) => {
        setFeedback(prev => [payload.new as FeedbackRow, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          System Feedback
          {feedback.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{feedback.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : feedback.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No feedback yet</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {feedback.map((fb) => {
              const Icon = typeIcon[fb.type] || HelpCircle;
              return (
                <div key={fb.id} className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={typeColor[fb.type] as any} className="text-[10px] capitalize">
                        {fb.type}
                      </Badge>
                      {fb.screen_path && (
                        <span className="text-[10px] text-muted-foreground font-mono truncate">{fb.screen_path}</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{fb.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(fb.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
