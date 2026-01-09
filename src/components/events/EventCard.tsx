import { Clock, MapPin, Users, Beer, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    event_type: string;
    image_url: string | null;
    start_time: string;
    location_name: string | null;
    is_barhop: boolean | null;
    max_attendees: number | null;
    creator?: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
    attendees?: { count: number }[];
  };
}

export function EventCard({ event }: EventCardProps) {
  const attendeeCount = event.attendees?.[0]?.count || 0;
  const isLive = new Date(event.start_time) <= new Date();
  const eventDate = new Date(event.start_time);
  
  return (
    <Link to={`/events/${event.id}`}>
      <Card className="bg-white shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Left: Date badge */}
            <div className="shrink-0 text-center">
              <div className="w-14 h-14 rounded-xl bg-rally-light flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-primary uppercase">
                  {format(eventDate, 'MMM')}
                </span>
                <span className="text-xl font-bold text-rally-dark">
                  {format(eventDate, 'd')}
                </span>
              </div>
            </div>

            {/* Middle: Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-rally-dark truncate font-montserrat">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {event.is_barhop && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold">
                        <Beer className="h-3 w-3" />
                        Bar Hop
                      </span>
                    )}
                    {isLive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{format(eventDate, 'h:mm a')}</span>
                </div>
                
                {event.location_name && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[140px]">{event.location_name}</span>
                  </div>
                )}
              </div>

              {/* Attendees */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex -space-x-2">
                  {[1, 2, 3].slice(0, Math.min(Math.max(attendeeCount, 1), 3)).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 border-2 border-white flex items-center justify-center"
                    >
                      <Users className="h-3 w-3 text-primary" />
                    </div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {attendeeCount > 0 ? `${attendeeCount} going` : 'Be first to join!'}
                </span>
              </div>
            </div>

            {/* Right: Arrow */}
            <div className="shrink-0 self-center">
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
