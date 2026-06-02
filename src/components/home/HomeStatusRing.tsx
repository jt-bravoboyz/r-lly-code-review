import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEventSafetyStatus } from '@/hooks/useSafetyStatus';
import { getPrivateName } from '@/lib/identity';
import { cn } from '@/lib/utils';

interface HomeStatusRingProps {
  eventId: string;
}

export function HomeStatusRing({ eventId }: HomeStatusRingProps) {
  const { data: attendees, isLoading } = useEventSafetyStatus(eventId);

  if (isLoading || !attendees || attendees.length === 0) return null;

  const arrived = attendees.filter(
    (a) => a.arrived_safely === true || !!a.dd_dropoff_confirmed_at
  );
  const stillOut = attendees.filter(
    (a) => !(a.arrived_safely === true || !!a.dd_dropoff_confirmed_at)
  );

  const renderAvatar = (a: (typeof attendees)[number], isArrived: boolean) => {
    const firstName = a.profile
      ? (getPrivateName(a.profile as any) || '').split(' ')[0]
      : '';
    return (
      <div key={a.id} className="flex flex-col items-center gap-1 w-12">
        <Avatar
          className={cn(
            'h-10 w-10',
            isArrived
              ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background'
              : 'opacity-40'
          )}
        >
          <AvatarImage src={a.profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {firstName.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-center truncate max-w-[48px]">
          {firstName}
        </span>
      </div>
    );
  };

  return (
    <Card className="rounded-xl border-0 shadow-[0_4px_12px_rgba(0,0,0,0.04)] bg-card">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm font-semibold font-montserrat">
          🏠 {arrived.length} of {attendees.length} home safe
        </p>

        {arrived.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Made it home ({arrived.length})
            </p>
            <div className="flex flex-wrap gap-3">
              {arrived.map((a) => renderAvatar(a, true))}
            </div>
          </div>
        )}

        {stillOut.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Still out ({stillOut.length})
            </p>
            <div className="flex flex-wrap gap-3">
              {stillOut.map((a) => renderAvatar(a, false))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
