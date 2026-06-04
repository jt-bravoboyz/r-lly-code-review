import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  squadId: string;
  memberIds: string[];
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string;
  location_name: string | null;
  status: string | null;
  creator_id: string;
}

/**
 * Upcoming events surfaced for a squad page.
 * Strict filter: only rallies where this squad was explicitly tagged via the
 * Squads selector during creation/editing (i.e. a row exists in event_squads
 * linking this squad to the event). Member-overlap rallies are excluded.
 */
export function SquadUpcomingEvents({ squadId }: Props) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['squad-upcoming-events', squadId],
    queryFn: async () => {
      const horizon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      // 1) Find events this squad was explicitly invited to
      const { data: links, error: linkErr } = await supabase
        .from('event_squads')
        .select('event_id')
        .eq('squad_id', squadId);
      if (linkErr) throw linkErr;
      const eventIds = (links ?? []).map((r: any) => r.event_id);
      if (eventIds.length === 0) return [] as UpcomingEvent[];

      // 2) Fetch the matching upcoming, non-cancelled events
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, location_name, status, creator_id')
        .in('id', eventIds)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', horizon)
        .not('status', 'in', '("completed","cancelled")')
        .order('start_time', { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as UpcomingEvent[];
    },
    enabled: !!squadId,
    staleTime: 1000 * 60,
  });


  return (
    <div>
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        Upcoming R@llies
      </h2>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground rounded-2xl bg-card/40 border border-border/50">
          <Calendar className="h-7 w-7 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nothing on the books</p>
          <p className="text-xs">When a squadmate spins up a R@lly, it lands here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((event) => (
            <Card
              key={event.id}
              className="cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{event.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.start_time), 'MMM d · h:mm a')}
                      </span>
                      {event.location_name && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{event.location_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border-primary/20">
                    Upcoming
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
