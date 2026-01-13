import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, AlertTriangle, PartyPopper } from 'lucide-react';
import { useIsEventSafetyComplete, useEventSafetyStatus, getSafetyState, getSafetyStateLabel } from '@/hooks/useSafetyStatus';

interface SafetyCloseoutDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SafetyCloseoutDialog({ 
  eventId, 
  open, 
  onOpenChange, 
  onConfirm 
}: SafetyCloseoutDialogProps) {
  const { data: safetyComplete, isLoading } = useIsEventSafetyComplete(eventId);
  const { data: attendees } = useEventSafetyStatus(eventId);

  // Count attendees in each state
  const stateCounts = attendees?.reduce((acc, a) => {
    const state = getSafetyState(a);
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const pendingCount = 
    (stateCounts['participating'] || 0) + 
    (stateCounts['undecided'] || 0) + 
    (stateCounts['dd_pending'] || 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 font-montserrat">
            {safetyComplete ? (
              <>
                <PartyPopper className="h-5 w-5 text-green-500" />
                Complete R@lly
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Safety Check Incomplete
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {safetyComplete ? (
                <p>
                  Everyone has confirmed their safety status. Complete this R@lly?
                </p>
              ) : (
                <>
                  <p>
                    Not all attendees have confirmed their safety status.
                  </p>
                  {pendingCount > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {stateCounts['participating'] > 0 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          {stateCounts['participating']} Participating in R@lly Home
                        </Badge>
                      )}
                      {stateCounts['undecided'] > 0 && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          {stateCounts['undecided']} Undecided
                        </Badge>
                      )}
                      {stateCounts['dd_pending'] > 0 && (
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {stateCounts['dd_pending']} DD - Awaiting Arrival
                        </Badge>
                      )}
                    </div>
                  )}
                </>
              )}
              
              {/* Summary stats */}
              <div className="pt-2 border-t space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>{stateCounts['arrived_safely'] || 0} Arrived Safely</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span>{stateCounts['not_participating'] || 0} Not Participating in R@lly Home</span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={!safetyComplete || isLoading}
            className={`w-full ${
              safetyComplete 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {safetyComplete ? (
              <>
                <PartyPopper className="h-4 w-4 mr-2" />
                Complete R@lly
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Waiting for Safety Confirmations
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
