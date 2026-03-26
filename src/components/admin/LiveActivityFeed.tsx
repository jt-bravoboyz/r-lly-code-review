import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Calendar, Users, Zap, ShieldCheck, PartyPopper } from 'lucide-react';

interface ActivityItem {
  id: string;
  event_name: string;
  created_at: string;
  user_id: string | null;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  event_created: Calendar,
  event_joined: Users,
  rally_started: Zap,
  rally_completed: PartyPopper,
  safety_confirmed: ShieldCheck,
};

const EVENT_LABELS: Record<string, string> = {
  event_viewed: 'Viewed an event',
  event_created: 'Created an event',
  event_joined: 'Joined an event',
  rally_started: 'Rally started',
  rally_ended: 'Rally ended',
  rally_completed: 'Rally completed',
  safety_confirmed: 'Safety confirmed',
  invite_link_copied: 'Copied invite link',
  recap_shared: 'Shared recap',
};

export function LiveActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    // Fetch recent
    supabase
      .from('analytics_events')
      .select('id, event_name, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setItems(data);
      });

    // Subscribe to realtime
    const channel = supabase
      .channel('admin-live-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'analytics_events' },
        (payload) => {
          const newItem = payload.new as ActivityItem;
          setItems(prev => [newItem, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500 animate-pulse" />
          Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Waiting for activity...</p>
          )}
          {items.map(item => {
            const Icon = EVENT_ICONS[item.event_name] || Activity;
            const label = EVENT_LABELS[item.event_name] || item.event_name;
            const time = new Date(item.created_at!).toLocaleTimeString();
            const date = new Date(item.created_at!).toLocaleDateString();

            return (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-sm">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1">{label}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{date} {time}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
