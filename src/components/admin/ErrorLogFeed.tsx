import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { AdminEmptyState } from './AdminEmptyState';
import { format } from 'date-fns';

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Error Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!errors || errors.length === 0 ? (
          <AdminEmptyState icon={<AlertTriangle className="h-10 w-10 opacity-30" />} message="No errors logged — smooth sailing! 🎉" />
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {errors.map((e, i) => {
              const meta = e.metadata as Record<string, unknown> | null;
              return (
                <div key={i} className="text-xs p-2 rounded bg-destructive/5 border border-destructive/10">
                  <div className="flex justify-between">
                    <span className="font-mono text-destructive truncate max-w-[200px]">
                      {String(meta?.message || 'Unknown error')}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {e.created_at ? format(new Date(e.created_at), 'MMM d HH:mm') : ''}
                    </span>
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
