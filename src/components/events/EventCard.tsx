import { Clock, MapPin, Users, Beer, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { getEventTypeLabel } from '@/lib/eventTypes';

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
      <Card className="relative bg-gradient-to-br from-white via-white to-orange-50/30 shadow-md rounded-2xl overflow-hidden group hover:shadow-xl hover:shadow-primary/15 transition-all duration-300 hover:-translate-y-1 border border-orange-100/50 ripple-container">
        {/* Shimmer overlay on hover */}
        <div className="shimmer-overlay rounded-2xl" />
        
        <CardContent className="p-4 relative z-10">
          <div className="flex items-start gap-4">
            {/* Left: Date badge with gradient */}
            <div className="shrink-0 text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 via-orange-100 to-yellow-50 flex flex-col items-center justify-center shadow-sm border border-primary/10 group-hover:shadow-md group-hover:border-primary/20 transition-all duration-300">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                  {format(eventDate, 'MMM')}
                </span>
                <span className="text-xl font-extrabold bg-gradient-to-br from-primary to-orange-600 bg-clip-text text-transparent">
                  {format(eventDate, 'd')}
                </span>
              </div>
            </div>

            {/* Middle: Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-card-foreground truncate font-montserrat group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {event.event_type && event.event_type !== 'rally' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium border border-primary/20">
                        {getEventTypeLabel(event.event_type)}
                      </span>
                    )}
                    {event.is_barhop && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-orange-600 text-[10px] font-bold border border-orange-200/50 shadow-sm">
                        <Beer className="h-3 w-3 icon-bounce" />
                        Bar Hop
                      </span>
                    )}
                    {isLive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-[10px] font-bold border border-green-200/50 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-sm shadow-green-500/50" />
                        LIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary icon-bounce" />
                  <span className="font-medium">{format(eventDate, 'h:mm a')}</span>
                </div>
                
                {event.location_name && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary icon-bounce" />
                    <span className="truncate max-w-[140px]">{event.location_name}</span>
                  </div>
                )}
              </div>

              {/* Attendees with enhanced styling */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex -space-x-2">
                  {[1, 2, 3].slice(0, Math.min(Math.max(attendeeCount, 1), 3)).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-orange-400/50 border-2 border-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300"
                      style={{ transitionDelay: `${i * 50}ms` }}
                    >
                      <Users className="h-3 w-3 text-primary" />
                    </div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-medium group-hover:text-primary/80 transition-colors">
                  {attendeeCount > 0 ? `${attendeeCount} going` : 'Be first to join!'}
                </span>
              </div>
            </div>

            {/* Right: Arrow with enhanced animation */}
            <div className="shrink-0 self-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/5 to-orange-100/50 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-orange-500 transition-all duration-300">
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
