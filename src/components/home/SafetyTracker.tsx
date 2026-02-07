import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield, Navigation, CheckCircle2, HelpCircle, XCircle, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useEventSafetyStatus, useIsEventSafetyComplete, getSafetyState, getSafetyStateLabel, type SafetyState } from '@/hooks/useSafetyStatus';
import { useQueryClient } from '@tanstack/react-query';

interface SafetyTrackerProps {
  eventId: string;
}

function SafetyStateIcon({ state }: { state: SafetyState }) {
  switch (state) {
    case 'participating':
      return <Navigation className="h-3 w-3 text-white animate-pulse" />;
    case 'arrived_safely':
      return <CheckCircle2 className="h-3 w-3 text-white" />;
    case 'not_participating':
      return <XCircle className="h-3 w-3 text-white" />;
    case 'undecided':
      return <HelpCircle className="h-3 w-3 text-white" />;
    case 'opted_in':
      return <Shield className="h-3 w-3 text-white" />;
    case 'dd_pending':
      return <Car className="h-3 w-3 text-white" />;
  }
}

function SafetyStateBadge({ state }: { state: SafetyState }) {
  const label = getSafetyStateLabel(state);
  
  switch (state) {
    case 'participating':
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
          <Navigation className="h-3 w-3 mr-1 animate-pulse" />
          {label}
        </Badge>
      );
    case 'arrived_safely':
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      );
    case 'not_participating':
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          <XCircle className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      );
    case 'undecided':
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
          <HelpCircle className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      );
    case 'opted_in':
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
          <Shield className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      );
    case 'dd_pending':
      return (
        <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Car className="h-3 w-3 mr-1" />
          {label}
        </Badge>
      );
  }
}

function getStateBackgroundColor(state: SafetyState): string {
  switch (state) {
    case 'participating':
      return 'bg-orange-50 border-orange-200';
    case 'arrived_safely':
      return 'bg-green-50 border-green-200';
    case 'not_participating':
      return 'bg-muted border-muted';
    case 'undecided':
      return 'bg-amber-50 border-amber-200';
    case 'opted_in':
      return 'bg-blue-50 border-blue-200';
    case 'dd_pending':
      return 'bg-primary/5 border-primary/20';
  }
}

function getIconBackgroundColor(state: SafetyState): string {
  switch (state) {
    case 'participating':
      return 'bg-orange-500';
    case 'arrived_safely':
      return 'bg-green-500';
    case 'not_participating':
      return 'bg-muted-foreground/50';
    case 'undecided':
      return 'bg-amber-500';
    case 'opted_in':
      return 'bg-blue-500';
    case 'dd_pending':
      return 'bg-primary';
  }
}

export function SafetyTracker({ eventId }: SafetyTrackerProps) {
  const { data: attendees, isLoading } = useEventSafetyStatus(eventId);
  const { data: safetyComplete } = useIsEventSafetyComplete(eventId);
  const queryClient = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`safety-tracker-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['event-safety-status', eventId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  // Debug logging for validation
  useEffect(() => {
    if (attendees && attendees.length > 0) {
      console.log('[R@lly Debug] SafetyTracker loaded:', { 
        event_id: eventId, 
        attendee_count: attendees.length,
        safety_complete: safetyComplete 
      });
    }
  }, [eventId, attendees, safetyComplete]);

  if (isLoading) {
    return null;
  }

  // Don't render if no attendees or safety is complete
  if (!attendees || attendees.length === 0) {
    return null;
  }

  // If safety is complete, show a success message briefly then hide
  if (safetyComplete) {
    return null;
  }

  // Group attendees by safety state for summary
  const stateCounts = attendees.reduce((acc, attendee) => {
    const state = getSafetyState(attendee);
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {} as Record<SafetyState, number>);

  const arrivedCount = stateCounts.arrived_safely || 0;
  const participatingCount = stateCounts.participating || 0;
  const optedInCount = stateCounts.opted_in || 0;
  const undecidedCount = stateCounts.undecided || 0;
  const ddPendingCount = stateCounts.dd_pending || 0;
  
  // Sort attendees: arrived_safely first to celebrate them, then participating, then others
  const sortedAttendees = [...attendees].sort((a, b) => {
    const stateOrder: Record<SafetyState, number> = {
      'arrived_safely': 0,
      'participating': 1,
      'opted_in': 2,
      'dd_pending': 3,
      'undecided': 4,
      'not_participating': 5,
    };
    return stateOrder[getSafetyState(a)] - stateOrder[getSafetyState(b)];
  });

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-secondary/5 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 font-montserrat">
          <Shield className="h-5 w-5 text-primary" />
          R@lly Home Safety
          <Badge variant="secondary" className="ml-auto">
            {arrivedCount}/{attendees.length} arrived safely
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 pb-2 border-b">
          {participatingCount > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <Navigation className="h-3 w-3 mr-1" />
              {participatingCount} en route
            </Badge>
          )}
          {optedInCount > 0 && (
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              <Shield className="h-3 w-3 mr-1" />
              {optedInCount} ready
            </Badge>
          )}
          {undecidedCount > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <HelpCircle className="h-3 w-3 mr-1" />
              {undecidedCount} undecided
            </Badge>
          )}
          {ddPendingCount > 0 && (
            <Badge variant="outline" className="text-primary border-primary/30">
              <Car className="h-3 w-3 mr-1" />
              {ddPendingCount} DD pending
            </Badge>
          )}
        </div>

        {/* Arrived safely section - Celebrate arrivals! */}
        {arrivedCount > 0 && (
          <div className="pb-2 border-b border-green-200">
            <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Arrived Safely ({arrivedCount})
            </p>
            <div className="flex flex-wrap gap-2">
              {sortedAttendees
                .filter(a => getSafetyState(a) === 'arrived_safely')
                .map((attendee) => (
                  <div 
                    key={attendee.id}
                    className="flex items-center gap-1.5 bg-green-100 rounded-full px-2.5 py-1 border border-green-200"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-green-200 text-green-700">
                        {attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-green-700">
                      {attendee.profile?.display_name?.split(' ')[0] || 'Unknown'}
                    </span>
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Individual attendee statuses - Those still en route or pending */}
        {sortedAttendees
          .filter(a => getSafetyState(a) !== 'arrived_safely')
          .map((attendee) => {
          const state = getSafetyState(attendee);
          
          return (
            <div
              key={attendee.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${getStateBackgroundColor(state)}`}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${getIconBackgroundColor(state)}`}>
                  <SafetyStateIcon state={state} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {attendee.profile?.display_name || 'Unknown'}
                  {attendee.is_dd && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      <Car className="h-2.5 w-2.5 mr-0.5" />
                      DD
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {getSafetyStateLabel(state)}
                </p>
              </div>

              <div className="text-right">
                {state === 'participating' && attendee.going_home_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(attendee.going_home_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {participatingCount > 0 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            {participatingCount} {participatingCount === 1 ? 'person' : 'people'} still en route
          </p>
        )}
      </CardContent>
    </Card>
  );
}
