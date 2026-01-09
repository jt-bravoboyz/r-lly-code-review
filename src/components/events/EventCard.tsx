import { Calendar, MapPin, Users, Beer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  
  return (
    <Link to={`/events/${event.id}`}>
      <Card className="overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
        {event.image_url && (
          <div className="aspect-video relative overflow-hidden bg-muted">
            <img 
              src={event.image_url} 
              alt={event.title}
              className="object-cover w-full h-full"
            />
            {event.is_barhop && (
              <Badge className="absolute top-2 right-2 bg-secondary">
                <Beer className="h-3 w-3 mr-1" /> Bar Hop
              </Badge>
            )}
          </div>
        )}
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{event.title}</h3>
              {event.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {event.description}
                </p>
              )}
            </div>
            <Badge variant="outline" className="shrink-0">
              {event.event_type}
            </Badge>
          </div>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{format(new Date(event.start_time), 'EEE, MMM d · h:mm a')}</span>
            </div>
            
            {event.location_name && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="truncate">{event.location_name}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>
                  {attendeeCount} going
                  {event.max_attendees && ` · ${event.max_attendees} max`}
                </span>
              </div>
              
              {event.creator && (
                <div className="flex items-center gap-2">
                  <span className="text-xs">by</span>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={event.creator.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {event.creator.display_name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}