import { useState } from 'react';
import { Car, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DDDisclaimerDialog } from './DDDisclaimerDialog';
import { useVolunteerAsDD, useIsDD } from '@/hooks/useDDManagement';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface DDVolunteerButtonProps {
  eventId: string;
}

export function DDVolunteerButton({ eventId }: DDVolunteerButtonProps) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { profile } = useAuth();
  const { data: isDD } = useIsDD(eventId);
  const volunteerAsDD = useVolunteerAsDD();

  const handleVolunteerClick = () => {
    setShowDisclaimer(true);
  };

  const handleDisclaimerAccept = async () => {
    if (!profile) return;
    
    try {
      await volunteerAsDD.mutateAsync({
        eventId,
        userName: profile.display_name || 'Someone',
      });
      toast.success('You are now the DD! 🚗 Thank you for keeping everyone safe!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to volunteer as DD');
    }
  };

  if (isDD) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Badge className="bg-primary/20 text-primary border-primary">
          <Car className="h-3 w-3 mr-1" />
          You're the DD
        </Badge>
        <p className="text-[10px] text-muted-foreground text-right max-w-32">
          Remember to confirm your own arrival after all drop-offs
        </p>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleVolunteerClick}
        disabled={volunteerAsDD.isPending}
        className="border-primary text-primary hover:bg-primary/10"
      >
        <Shield className="h-4 w-4 mr-2" />
        Volunteer as DD
      </Button>

      <DDDisclaimerDialog
        open={showDisclaimer}
        onOpenChange={setShowDisclaimer}
        onAccept={handleDisclaimerAccept}
      />
    </>
  );
}
