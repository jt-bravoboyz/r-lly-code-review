import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DDDisclaimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

export function DDDisclaimerDialog({ open, onOpenChange, onAccept }: DDDisclaimerDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAccept = () => {
    if (accepted && acknowledged) {
      onAccept();
      onOpenChange(false);
      setAccepted(false);
      setAcknowledged(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-montserrat">R@lly DD Agreement</DialogTitle>
              <DialogDescription className="text-sm">Designated Driver Responsibility Acknowledgment</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 mb-1">Important Safety Notice</p>
                  <p className="text-amber-700 text-xs">Please read and acknowledge the following terms before proceeding as a R@lly DD.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">DESIGNATED DRIVER COMMITMENT:</strong> By accepting the role of R@lly DD, I hereby acknowledge and agree that I will serve as a designated driver for this event and will abstain from consuming any alcoholic beverages or controlled substances that may impair my ability to operate a motor vehicle safely.
              </p>

              <p>
                <strong className="text-foreground">RESPONSIBILITY & LIABILITY:</strong> I understand and acknowledge that:
              </p>

              <ul className="list-disc pl-5 space-y-2">
                <li>I am solely responsible for my conduct, driving ability, and any decisions I make while serving as a R@lly DD.</li>
                <li>I must possess a valid driver's license, adequate vehicle insurance, and a vehicle in safe operating condition.</li>
                <li>I will comply with all applicable traffic laws, regulations, and safety requirements.</li>
                <li>I will not operate a vehicle if I am fatigued, impaired, or otherwise unable to drive safely.</li>
              </ul>

              <p>
                <strong className="text-foreground">RELEASE OF LIABILITY:</strong> I hereby release, waive, and forever discharge R@lly, Bravo Boyz LLC, their officers, directors, employees, agents, affiliates, successors, and assigns (collectively, the "Released Parties") from any and all claims, demands, damages, costs, expenses, actions, and causes of action, whether in law or equity, arising out of or related to my participation as a R@lly DD.
              </p>

              <p>
                <strong className="text-foreground">INDEMNIFICATION:</strong> I agree to indemnify, defend, and hold harmless the Released Parties from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorney's fees) arising out of or related to my actions or omissions as a R@lly DD.
              </p>

              <p>
                <strong className="text-foreground">ACKNOWLEDGMENT:</strong> I understand that R@lly and Bravo Boyz LLC provide this platform solely as a means to connect designated drivers with those seeking safe transportation. The Released Parties do not assume any responsibility for the conduct of any R@lly DD or the outcome of any ride facilitated through this platform.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-start gap-3">
            <Checkbox 
              id="accept" 
              checked={accepted} 
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <Label htmlFor="accept" className="text-sm leading-snug cursor-pointer">
              I have read and understand the terms above, and I agree to serve as a designated driver without consuming alcohol or any impairing substances.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox 
              id="acknowledge" 
              checked={acknowledged} 
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <Label htmlFor="acknowledge" className="text-sm leading-snug cursor-pointer">
              I acknowledge that R@lly and Bravo Boyz LLC are not liable for any incidents, accidents, or issues that may arise during my service as a R@lly DD.
            </Label>
          </div>

          <Button 
            className="w-full gradient-accent"
            disabled={!accepted || !acknowledged}
            onClick={handleAccept}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Accept & Become R@lly DD
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}