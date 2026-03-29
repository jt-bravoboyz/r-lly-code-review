import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(policySections[0].id);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [acknowledgedLiability, setAcknowledgedLiability] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedPolicy = policySections.find(p => p.id === selectedPolicyId)!;
  const ContentComponent = selectedPolicy.content;

  // Reset scroll gate when switching policies
  useEffect(() => {
    setHasScrolledToBottom(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [selectedPolicyId]);

  // Check if content fits without scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 50) {
      setHasScrolledToBottom(true);
    }
  }, [selectedPolicyId]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 100) {
      setHasScrolledToBottom(true);
    }
  }, []);

  const canAccept = acceptedPolicies && acknowledgedLiability && hasScrolledToBottom;

  const handleAccept = async () => {
    if (!canAccept) return;
    localStorage.setItem('rally-policies-accepted', 'true');
    localStorage.setItem('rally-policies-accepted-date', new Date().toISOString());

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          policies_accepted_at: new Date().toISOString(),
        } as any).eq('user_id', user.id);
      }
    } catch (e) {
      console.error('Failed to persist policy acceptance:', e);
    }

    onAccept();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md flex flex-col p-0 gap-0"
        style={{
          backgroundColor: "#1E1E1E",
          borderColor: "rgba(255, 106, 0, 0.2)",
          height: 'min(92dvh, 700px)',
          maxHeight: '92dvh',
        }}
        hideCloseButton
      >
        {/* ── Fixed Header ── */}
        <div className="shrink-0 px-5 pt-5 pb-3">
          <DialogHeader className="mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
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

          {/* Policy Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="w-full flex items-center justify-between p-3 rounded-lg text-left min-h-[44px]"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderWidth: "1px",
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <span className="font-medium text-sm" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
                {selectedPolicy.title}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                style={{ color: "rgba(255, 255, 255, 0.5)" }}
              />
            </button>

            {dropdownOpen && (
              <div
                className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden"
                style={{
                  backgroundColor: "#2A2A2A",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                {policySections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setSelectedPolicyId(section.id);
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left p-3 text-sm transition-colors min-h-[44px]"
                    style={{
                      color: section.id === selectedPolicyId ? "#FF6A00" : "rgba(255, 255, 255, 0.8)",
                      backgroundColor: section.id === selectedPolicyId ? "rgba(255, 106, 0, 0.1)" : "transparent",
                    }}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable Policy Text ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto px-5 py-3"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            className="rounded-lg p-4 text-sm leading-relaxed"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              color: "rgba(255, 255, 255, 0.75)",
            }}
          >
            <ContentComponent />
          </div>
        </div>

        {/* Scroll hint */}
        {!hasScrolledToBottom && (
          <div className="shrink-0 px-5 py-1">
            <p className="text-xs text-center animate-pulse" style={{ color: "rgba(255, 106, 0, 0.7)" }}>
              ↓ Scroll to the bottom to continue
            </p>
          </div>
        )}

        {/* ── Fixed Footer ── */}
        <div
          className="shrink-0 px-5 pb-5 pt-3 space-y-3 border-t"
          style={{ borderColor: "rgba(255, 255, 255, 0.1)", backgroundColor: "#1E1E1E" }}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-policies"
              checked={acceptedPolicies}
              onCheckedChange={(checked) => setAcceptedPolicies(checked === true)}
              className="border-white/30 data-[state=checked]:bg-[#FF6A00] data-[state=checked]:border-[#FF6A00] mt-0.5"
            />
            <Label
              htmlFor="accept-policies"
              className="text-xs leading-snug cursor-pointer"
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
              className="border-white/30 data-[state=checked]:bg-[#FF6A00] data-[state=checked]:border-[#FF6A00] mt-0.5"
            />
            <Label
              htmlFor="acknowledge-liability"
              className="text-xs leading-snug cursor-pointer"
              style={{ color: "rgba(255, 255, 255, 0.8)" }}
            >
              I understand that R@lly and Bravo Boyz LLC are not liable for any incidents, injuries, or issues that may arise during my use of the app.
            </Label>
          </div>

          <Button
            className="w-full h-12 rounded-full font-bold shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: canAccept
                ? "linear-gradient(135deg, #FF6A00 0%, #FF8C42 100%)"
                : "rgba(255, 255, 255, 0.1)",
              color: canAccept ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
              boxShadow: canAccept ? "0 8px 32px rgba(255, 106, 0, 0.4)" : "none",
            }}
            disabled={!canAccept}
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
