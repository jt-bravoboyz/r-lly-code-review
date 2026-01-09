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
  
  return (
    <Link to={`/events/${event.id}`}>
      <Card className="card-rally overflow-hidden group">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Left: Avatar or Bar Hop indicator */}
            <div className="shrink-0">
              {event.is_barhop ? (
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Beer className="h-6 w-6 text-primary" />
                </div>
              ) : event.creator ? (
                <Avatar className="h-12 w-12 ring-2 ring-border">
                  <AvatarImage src={event.creator.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
                    {event.creator.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>

            {/* Middle: Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-base truncate">{event.title}</h3>
                  {event.is_barhop && (
                    <span className="badge-rally text-[10px] mt-1">Bar Hop</span>
                  )}
                </div>
                {isLive && (
                  <span className="status-live shrink-0">LIVE</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>{format(new Date(event.start_time), 'EEE h:mm a')}</span>
                </div>
                
                {event.location_name && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate max-w-[120px]">{event.location_name}</span>
                  </div>
                )}
              </div>

              {/* Attendees */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].slice(0, Math.min(attendeeCount, 3)).map((_, i) => (
                      <div 
                        key={i} 
                        className="w-6 h-6 rounded-full bg-muted border-2 border-card"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {attendeeCount > 0 ? `+${attendeeCount} going` : 'Be first!'}
                  </span>
                </div>
                
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
