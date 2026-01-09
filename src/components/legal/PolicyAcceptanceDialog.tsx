import { useState } from 'react';
import { Shield, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  PrivacyPolicy,
  TermsAndConditions,
  CommunityGuidelines,
  AlcoholLiabilityRelease,
  RideCoordinationWaiver,
} from './LegalContent';

interface PolicyAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

interface PolicySection {
  id: string;
  title: string;
  content: React.ElementType;
}

const policySections: PolicySection[] = [
  { id: 'privacy', title: 'Privacy Policy', content: PrivacyPolicy },
  { id: 'terms', title: 'Terms and Conditions', content: TermsAndConditions },
  { id: 'community', title: 'Community Guidelines', content: CommunityGuidelines },
  { id: 'alcohol', title: 'Alcohol Liability Release', content: AlcoholLiabilityRelease },
  { id: 'ride', title: 'Ride Coordination Waiver', content: RideCoordinationWaiver },
];

export function PolicyAcceptanceDialog({ open, onOpenChange, onAccept }: PolicyAcceptanceDialogProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [acknowledgedLiability, setAcknowledgedLiability] = useState(false);

  const handleAccept = () => {
    if (acceptedPolicies && acknowledgedLiability) {
      localStorage.setItem('rally-policies-accepted', 'true');
      localStorage.setItem('rally-policies-accepted-date', new Date().toISOString());
      onAccept();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "#1E1E1E", borderColor: "rgba(255, 106, 0, 0.2)" }}
        hideCloseButton
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(255, 106, 0, 0.15)" }}
            >
              <Shield className="h-6 w-6" style={{ color: "#FF6A00" }} />
            </div>
            <div>
              <DialogTitle 
                className="text-xl font-bold font-montserrat"
                style={{ color: "rgba(255, 255, 255, 0.95)" }}
              >
                R@lly Policies
              </DialogTitle>
              <DialogDescription style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                Review and accept to continue
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 max-h-[50vh]">
          <div className="space-y-2">
            {policySections.map((section) => {
              const ContentComponent = section.content;
              const isExpanded = expandedSection === section.id;
              
              return (
                <Collapsible
                  key={section.id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedSection(open ? section.id : null)}
                >
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left"
                      style={{ 
                        backgroundColor: isExpanded ? "rgba(255, 106, 0, 0.1)" : "rgba(255, 255, 255, 0.05)",
                        borderWidth: "1px",
                        borderColor: isExpanded ? "rgba(255, 106, 0, 0.3)" : "rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <span 
                        className="font-medium text-sm"
                        style={{ color: "rgba(255, 255, 255, 0.9)" }}
                      >
                        {section.title}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" style={{ color: "#FF6A00" }} />
                      ) : (
                        <ChevronDown className="h-4 w-4" style={{ color: "rgba(255, 255, 255, 0.5)" }} />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div 
                      className="p-4 mt-1 rounded-lg text-sm"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}
                    >
                      <ContentComponent />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        <div 
          className="space-y-4 pt-4 border-t mt-4"
          style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
        >
          <div className="flex items-start gap-3">
            <Checkbox 
              id="accept-policies" 
              checked={acceptedPolicies} 
              onCheckedChange={(checked) => setAcceptedPolicies(checked === true)}
              className="border-white/30 data-[state=checked]:bg-[#FF6A00] data-[state=checked]:border-[#FF6A00]"
            />
            <Label 
              htmlFor="accept-policies" 
              className="text-sm leading-snug cursor-pointer"
              style={{ color: "rgba(255, 255, 255, 0.8)" }}
            >
              I have read and agree to all R@lly policies including Privacy Policy, Terms and Conditions, Community Guidelines, Alcohol Liability Release, and Ride Coordination Waiver.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox 
              id="acknowledge-liability" 
              checked={acknowledgedLiability} 
              onCheckedChange={(checked) => setAcknowledgedLiability(checked === true)}
              className="border-white/30 data-[state=checked]:bg-[#FF6A00] data-[state=checked]:border-[#FF6A00]"
            />
            <Label 
              htmlFor="acknowledge-liability" 
              className="text-sm leading-snug cursor-pointer"
              style={{ color: "rgba(255, 255, 255, 0.8)" }}
            >
              I understand that R@lly and Bravo Boyz LLC are not liable for any incidents, injuries, or issues that may arise during my use of the app.
            </Label>
          </div>

          <Button 
            className="w-full h-12 rounded-full font-bold shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: acceptedPolicies && acknowledgedLiability 
                ? "linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)" 
                : "rgba(255, 255, 255, 0.1)",
              color: acceptedPolicies && acknowledgedLiability ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
              boxShadow: acceptedPolicies && acknowledgedLiability 
                ? "0 8px 32px rgba(255, 106, 0, 0.4)" 
                : "none",
            }}
            disabled={!acceptedPolicies || !acknowledgedLiability}
            onClick={handleAccept}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Accept & Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
