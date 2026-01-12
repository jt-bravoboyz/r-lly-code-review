import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, Navigation, HelpCircle, XCircle, Car, PartyPopper } from 'lucide-react';
import { useEventSafetyStatus, useIsEventSafetyComplete, getSafetyState, getSafetyStateLabel } from '@/hooks/useSafetyStatus';
import { toast } from 'sonner';

interface HostSafetyDashboardProps {
  eventId: string;
  onCompleteRally?: () => void;
}

export function HostSafetyDashboard({ eventId, onCompleteRally }: HostSafetyDashboardProps) {
  const { data: attendees, isLoading } = useEventSafetyStatus(eventId);
  const { data: safetyComplete } = useIsEventSafetyComplete(eventId);

  if (isLoading || !attendees) {
    return null;
  }

  // Group attendees by state
  const participating = attendees.filter(a => getSafetyState(a) === 'participating');
  const arrivedSafely = attendees.filter(a => getSafetyState(a) === 'arrived_safely');
  const notParticipating = attendees.filter(a => getSafetyState(a) === 'not_participating');
  const undecided = attendees.filter(a => getSafetyState(a) === 'undecided');
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{arrivedSafely.length}</p>
            <p className="text-xs text-green-700">Arrived Safely</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{participating.length}</p>
            <p className="text-xs text-orange-700">Participating in R@lly Home</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{undecided.length}</p>
            <p className="text-xs text-amber-700">Undecided</p>
          </div>
          <div className="bg-muted border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{notParticipating.length}</p>
            <p className="text-xs text-muted-foreground">Not Participating in R@lly Home</p>
          </div>
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

        {/* Attendees needing attention */}
        {(undecided.length > 0 || participating.length > 0) && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Awaiting Safety Confirmation</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {[...undecided, ...participating].map(attendee => {
                const state = getSafetyState(attendee);
                return (
                  <div 
                    key={attendee.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {attendee.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1">{attendee.profile?.display_name}</span>
                    <Badge 
                      variant="outline" 
                      className={state === 'undecided' ? 'text-amber-600 border-amber-300' : 'text-orange-600 border-orange-300'}
                    >
                      {state === 'undecided' ? (
                        <><HelpCircle className="h-3 w-3 mr-1" /> Undecided</>
                      ) : (
                        <><Navigation className="h-3 w-3 mr-1" /> En Route</>
                      )}
                    </Badge>
                    {attendee.is_dd && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Car className="h-2.5 w-2.5" />
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
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
              <Shield className="h-4 w-4 mr-2" />
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
