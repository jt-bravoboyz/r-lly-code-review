import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2, FileText, Users, Wine, Car, BookOpen, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AboutTheApp,
  PrivacyPolicy,
  TermsAndConditions,
  CommunityGuidelines,
  AlcoholLiabilityRelease,
  RideCoordinationWaiver,
  AcceptanceOfPolicies
} from './LegalContent';

export type LegalDocumentType = 
  | 'about'
  | 'privacy'
  | 'terms'
  | 'community'
  | 'alcohol'
  | 'ride'
  | 'acceptance';

interface LegalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: LegalDocumentType;
  requireAcceptance?: boolean;
  onAccept?: () => void;
}

const documentConfig: Record<LegalDocumentType, {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  content: React.ElementType;
  acceptanceText?: string;
  acknowledgmentText?: string;
}> = {
  about: {
    title: 'About R@lly',
    subtitle: 'Learn about our app and mission',
    icon: Info,
    iconBg: 'bg-primary/10',
    content: AboutTheApp,
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How we handle your data',
    icon: Shield,
    iconBg: 'bg-blue-500/10',
    content: PrivacyPolicy,
    acceptanceText: 'I have read and understand the Privacy Policy and consent to the collection and use of my data as described.',
    acknowledgmentText: 'I understand that I can update or delete my profile and disable location access at any time.',
  },
  terms: {
    title: 'Terms and Conditions',
    subtitle: 'Usage agreement and limitations',
    icon: FileText,
    iconBg: 'bg-purple-500/10',
    content: TermsAndConditions,
    acceptanceText: 'I have read and agree to the Terms and Conditions, including all liability disclaimers.',
    acknowledgmentText: 'I understand that continued use of R@lly constitutes acceptance of any policy updates.',
  },
  community: {
    title: 'Community Guidelines',
    subtitle: 'Standards for respectful use',
    icon: Users,
    iconBg: 'bg-green-500/10',
    content: CommunityGuidelines,
    acceptanceText: 'I agree to treat all users respectfully and follow the Community Guidelines.',
    acknowledgmentText: 'I understand that violations may result in account suspension or removal.',
  },
  alcohol: {
    title: 'Alcohol Liability Release',
    subtitle: 'Responsibility acknowledgment',
    icon: Wine,
    iconBg: 'bg-amber-500/10',
    content: AlcoholLiabilityRelease,
    acceptanceText: 'I have read and understand the terms above. I accept full responsibility for my alcohol consumption, impairment level, transportation choices, and personal safety. I voluntarily assume all risks associated with alcohol.',
    acknowledgmentText: 'I hereby release, waive, and forever discharge R@lly, Bravo Boyz LLC, and all Released Parties from any and all claims, damages, or liability arising from my alcohol consumption or impairment.',
  },
  ride: {
    title: 'Ride Coordination Waiver',
    subtitle: 'Transportation disclaimer',
    icon: Car,
    iconBg: 'bg-cyan-500/10',
    content: RideCoordinationWaiver,
    acceptanceText: 'I have read and understand the terms above. I acknowledge that R@lly does not provide transportation and I assume all risks related to ride coordination, including accidents, injury, or harm.',
    acknowledgmentText: 'I hereby release, waive, and forever discharge R@lly, Bravo Boyz LLC, and all Released Parties from any and all claims, damages, or liability arising from rides coordinated through this platform.',
  },
  acceptance: {
    title: 'Acceptance of Policies',
    subtitle: 'Complete agreement overview',
    icon: BookOpen,
    iconBg: 'bg-primary/10',
    content: AcceptanceOfPolicies,
    acceptanceText: 'I have read and agree to all R@lly policies including Privacy Policy, Terms, Community Guidelines, Alcohol Liability Release, and Ride Waiver.',
    acknowledgmentText: 'I understand these policies form the complete agreement between me and Bravo Boyz LLC.',
  },
};

export function LegalDialog({ 
  open, 
  onOpenChange, 
  documentType, 
  requireAcceptance = false,
  onAccept 
}: LegalDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const config = documentConfig[documentType];
  const ContentComponent = config.content;
  const IconComponent = config.icon;

  const handleAccept = () => {
    if (accepted && acknowledged) {
      onAccept?.();
      onOpenChange(false);
      setAccepted(false);
      setAcknowledged(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setAccepted(false);
      setAcknowledged(false);
    }
    onOpenChange(open);
  };

  const showAcceptance = requireAcceptance && config.acceptanceText && config.acknowledgmentText;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
              <IconComponent className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-montserrat">{config.title}</DialogTitle>
              <DialogDescription className="text-sm">{config.subtitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          {showAcceptance && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Please Read Carefully</p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs">Review and acknowledge the following terms before proceeding.</p>
                </div>
              </div>
            </div>
          )}
          <ContentComponent />
        </ScrollArea>

        {showAcceptance ? (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="accept" 
                checked={accepted} 
                onCheckedChange={(checked) => setAccepted(checked === true)}
              />
              <Label htmlFor="accept" className="text-sm leading-snug cursor-pointer">
                {config.acceptanceText}
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox 
                id="acknowledge" 
                checked={acknowledged} 
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <Label htmlFor="acknowledge" className="text-sm leading-snug cursor-pointer">
                {config.acknowledgmentText}
              </Label>
            </div>

            <Button 
              className="w-full gradient-accent"
              disabled={!accepted || !acknowledged}
              onClick={handleAccept}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Accept & Continue
            </Button>
          </div>
        ) : (
          <div className="pt-4 border-t">
            <Button 
              className="w-full"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
