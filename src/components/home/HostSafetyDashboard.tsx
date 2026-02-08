import { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, CheckCircle2, Navigation, HelpCircle, XCircle, Car, PartyPopper, Clock } from 'lucide-react';
import { useEventSafetyStatus, useIsEventSafetyComplete, getSafetyState, getSafetyStateLabel, type SafetyState } from '@/hooks/useSafetyStatus';
import { useSafetyNotifications } from '@/hooks/useSafetyNotifications';
import { toast } from 'sonner';

interface HostSafetyDashboardProps {
  eventId: string;
  onCompleteRally?: () => void;
}

// Badge component for safety states with full terminology
function SafetyStateBadge({ state }: { state: SafetyState }) {
  const label = getSafetyStateLabel(state);
  
  switch (state) {
    case 'arrived_safely':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px]">
          <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
          {label}
        </Badge>
      );
    case 'participating':
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[10px]">
          <Navigation className="h-2.5 w-2.5 mr-1" />
          {label}
        </Badge>
      );
    case 'not_participating':
      return (
        <Badge variant="outline" className="text-muted-foreground text-[10px]">
          <XCircle className="h-2.5 w-2.5 mr-1" />
          {label}
        </Badge>
      );
    case 'undecided':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">
          <HelpCircle className="h-2.5 w-2.5 mr-1" />
          {label}
        </Badge>
      );
    case 'opted_in':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px]">
          <Shield className="h-2.5 w-2.5 mr-1" />
          {label}
        </Badge>
      );
    case 'dd_pending':
      return (
        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
          <Car className="h-2.5 w-2.5 mr-1" />
          {label}
        </Badge>
      );
  }
}

export function HostSafetyDashboard({ eventId, onCompleteRally }: HostSafetyDashboardProps) {
  const { data: attendees, isLoading } = useEventSafetyStatus(eventId);
  const { data: safetyComplete } = useIsEventSafetyComplete(eventId);
  const { notifySafetyComplete } = useSafetyNotifications();
  const previousSafetyComplete = useRef<boolean | undefined>(undefined);

  // Notify when safety becomes complete
  useEffect(() => {
    // Only notify on transition from incomplete to complete
    if (
      previousSafetyComplete.current === false && 
      safetyComplete === true
    ) {
      notifySafetyComplete(eventId);
    }
    previousSafetyComplete.current = safetyComplete;
  }, [safetyComplete, eventId, notifySafetyComplete]);

  // Persist until safety is complete - don't hide when safetyComplete becomes true
  // This allows hosts to see the final "all safe" state before completing

  if (isLoading || !attendees) {
    return null;
  }

  // If no attendees, don't render
  if (attendees.length === 0) {
    return null;
  }

  // Group attendees by state
  const participating = attendees.filter(a => getSafetyState(a) === 'participating');
  const arrivedSafely = attendees.filter(a => getSafetyState(a) === 'arrived_safely');
  const notParticipating = attendees.filter(a => getSafetyState(a) === 'not_participating');
  const undecided = attendees.filter(a => getSafetyState(a) === 'undecided');
  const optedIn = attendees.filter(a => getSafetyState(a) === 'opted_in');
  const ddPending = attendees.filter(a => getSafetyState(a) === 'dd_pending');

  // DD specific counts
  const allDDs = attendees.filter(a => a.is_dd);
  const ddsArrived = allDDs.filter(a => a.arrived_safely);

  const handleCompleteRally = () => {
    if (!safetyComplete) {
      toast.error('Cannot complete R@lly - safety is not complete yet');
      return;
    }
    onCompleteRally?.();
  };

  return (
    <Card className="border-secondary/50 bg-gradient-to-br from-secondary/5 to-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 font-montserrat">
          <Shield className="h-5 w-5 text-secondary" />
          Safety Dashboard
          {safetyComplete && (
            <Badge className="ml-auto bg-green-500 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              All Safe
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center cursor-help">
                  <p className="text-2xl font-bold text-green-600">{arrivedSafely.length}</p>
                  <p className="text-xs text-green-700">Arrived Safely</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attendees who have confirmed they arrived at their destination safely</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center cursor-help">
                  <p className="text-2xl font-bold text-orange-600">{participating.length}</p>
                  <p className="text-xs text-orange-700">Participating in R@lly Home</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attendees currently traveling home - waiting for arrival confirmation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center cursor-help">
                  <p className="text-2xl font-bold text-amber-600">{undecided.length}</p>
                  <p className="text-xs text-amber-700">Undecided</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attendees who haven't made a safety choice yet</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted border rounded-lg p-3 text-center cursor-help">
                  <p className="text-2xl font-bold text-muted-foreground">{notParticipating.length}</p>
                  <p className="text-xs text-muted-foreground">Not Participating in R@lly Home</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attendees who confirmed they're not using R@lly Home tracking</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* DD Section */}
        {allDDs.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                Designated Drivers
              </span>
              <Badge variant={ddsArrived.length === allDDs.length ? 'default' : 'secondary'}>
                {ddsArrived.length}/{allDDs.length} arrived
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {allDDs.map(dd => {
                const arrived = dd.arrived_safely;
                return (
                  <div 
                    key={dd.id} 
                    className={`flex items-center gap-2 rounded-full pl-1 pr-3 py-1 ${
                      arrived ? 'bg-green-100' : 'bg-orange-100'
                    }`}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={dd.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {dd.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{dd.profile?.display_name}</span>
                    {arrived ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    ) : (
                      <Navigation className="h-3 w-3 text-orange-600 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
            {ddPending.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                DDs must confirm their own arrival regardless of participation choice.
              </p>
            )}
          </div>
        )}

        {/* Full Attendee List with Safety Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">All Attendees</p>
            <Badge variant="outline" className="text-[10px]">
              {attendees.length} total
            </Badge>
          </div>
          <ScrollArea className="max-h-48">
            <div className="space-y-1 pr-2">
              {attendees.map(attendee => {
                const state = getSafetyState(attendee);
                return (
                  <div 
                    key={attendee.id}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                      state === 'arrived_safely' ? 'bg-green-50/50' :
                      state === 'participating' ? 'bg-orange-50/50' :
                      state === 'undecided' ? 'bg-amber-50/50' :
                      state === 'opted_in' ? 'bg-blue-50/50' :
                      state === 'dd_pending' ? 'bg-primary/5' :
                      'bg-muted/30'
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1 truncate text-primary brightness-75 font-medium">{attendee.profile?.display_name}</span>
                    <SafetyStateBadge state={state} />
                    {attendee.is_dd && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        <Car className="h-2.5 w-2.5" />
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Empty State when all safe */}
        {safetyComplete && (
          <div className="text-center py-3 bg-green-50 rounded-lg border border-green-200">
            <PartyPopper className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-green-700">Everyone is accounted for!</p>
            <p className="text-xs text-green-600">All attendees have confirmed their safety status.</p>
          </div>
        )}

        {/* Complete Rally Button */}
        <Button
          className="w-full"
          variant={safetyComplete ? 'default' : 'secondary'}
          disabled={!safetyComplete}
          onClick={handleCompleteRally}
        >
          {safetyComplete ? (
            <>
              <PartyPopper className="h-4 w-4 mr-2" />
              Complete R@lly - Everyone is Safe!
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Waiting for Safety Confirmations...
            </>
          )}
        </Button>

        {!safetyComplete && (
          <p className="text-xs text-center text-muted-foreground">
            R@lly can only be completed when all attendees have confirmed their safety status.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
