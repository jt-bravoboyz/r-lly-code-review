import { useState } from 'react';
import { Car, Check, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DDDisclaimerDialog } from './DDDisclaimerDialog';
import { useRespondToDDRequest, DDRequest } from '@/hooks/useDDManagement';
import { toast } from 'sonner';

interface DDRequestBannerProps {
  request: DDRequest;
  eventId: string;
  userName: string;
}

export function DDRequestBanner({ request, eventId, userName }: DDRequestBannerProps) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const respondToRequest = useRespondToDDRequest();

  const handleAcceptClick = () => {
    setShowDisclaimer(true);
  };

  const handleDisclaimerAccept = async () => {
    try {
      await respondToRequest.mutateAsync({
        requestId: request.id,
        eventId,
        response: 'accepted',
        userName,
      });
      toast.success('You are now the DD! 🚗');
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept DD request');
    }
  };

  const handleDecline = async () => {
    try {
      await respondToRequest.mutateAsync({
        requestId: request.id,
        eventId,
        response: 'declined',
        userName,
      });
      toast.info('DD request declined');
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline request');
    }
  };

  return (
    <>
      <Card className="border-primary bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-primary">DD Request</span>
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-medium text-foreground">
                  {request.requested_by_profile?.display_name || 'The host'}
                </span>
                {' '}has requested you to be the Designated Driver for this rally.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAcceptClick}
                  disabled={respondToRequest.isPending}
                  className="gradient-primary"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDecline}
                  disabled={respondToRequest.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DDDisclaimerDialog
        open={showDisclaimer}
        onOpenChange={setShowDisclaimer}
        onAccept={handleDisclaimerAccept}
      />
    </>
  );
}
