import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, MapPin, Clock, UserPlus, UserMinus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EventUpdate {
  type: 'location_change' | 'status_change' | 'attendee_joined' | 'attendee_left';
  message: string;
  timestamp: Date;
}

interface LiveUpdatesProps {
  updates: EventUpdate[];
}

const updateIcons = {
  location_change: MapPin,
  status_change: Clock,
  attendee_joined: UserPlus,
  attendee_left: UserMinus,
};

const updateColors = {
  location_change: 'text-blue-500 bg-blue-50',
  status_change: 'text-amber-500 bg-amber-50',
  attendee_joined: 'text-green-500 bg-green-50',
  attendee_left: 'text-red-500 bg-red-50',
};

export function LiveUpdates({ updates }: LiveUpdatesProps) {
  if (updates.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Live Updates
          <Badge variant="secondary" className="text-[10px]">
            {updates.length} new
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {updates.slice(0, 5).map((update, index) => {
          const Icon = updateIcons[update.type];
          const colorClass = updateColors[update.type];
          
          return (
            <div 
              key={index}
              className="flex items-center gap-3 text-sm animate-in slide-in-from-top-2"
            >
              <div className={`p-1.5 rounded-full ${colorClass}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">{update.message}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(update.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
