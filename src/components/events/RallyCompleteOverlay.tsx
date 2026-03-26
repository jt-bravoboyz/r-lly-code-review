import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfetti } from '@/hooks/useConfetti';
import { PartyPopper, Users, Car, ShieldCheck, Share2, UserPlus, UsersRound } from 'lucide-react';
import { RallyFeedbackModal } from '@/components/events/RallyFeedbackModal';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { InviteToEventDialog } from '@/components/events/InviteToEventDialog';
import { toast } from 'sonner';

interface RallyCompleteOverlayProps {
  show: boolean;
  onDone: () => void;
  attendeeCount?: number;
  ddCount?: number;
  eventId?: string;
  eventTitle?: string;
  inviteCode?: string | null;
}

export function RallyCompleteOverlay({
  show,
  onDone,
  attendeeCount = 0,
  ddCount = 0,
  eventId,
  eventTitle,
  inviteCode,
}: RallyCompleteOverlayProps) {
  const { fireRallyConfetti } = useConfetti();
  const confettiRef = useRef(fireRallyConfetti);
  confettiRef.current = fireRallyConfetti;
  const hasFiredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneCalledRef = useRef(false);
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);

  const callDone = () => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onDone();
  };

  useEffect(() => {
    if (!show) {
      hasFiredRef.current = false;
      doneCalledRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    // Fire confetti
    confettiRef.current();
    setTimeout(() => confettiRef.current(), 600);

    // Show feedback modal after 3 seconds, then auto-dismiss after 8 total
    timerRef.current = setTimeout(() => {
      if (eventId) setShowFeedback(true);
    }, 3000);

    const autoClose = setTimeout(() => {
      callDone();
    }, 8000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [show, onDone]);

  if (!show) return null;

  const handleShareRecap = async () => {
    const text = `${eventTitle} — ${attendeeCount} showed up. Everyone made it home. That's how you R@lly. 🎯`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'R@lly Recap', text });
      } catch {
        // User cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Recap copied to clipboard!');
    }
    callDone();
  };

  const handleMakeSquad = () => {
    toast.success("Let's make it official!");
    callDone();
    navigate('/squads');
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="flex flex-col items-center gap-6 animate-scale-in max-w-xs w-full px-4 py-8">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
          <PartyPopper className="h-10 w-10 text-primary" />
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-3xl font-bold font-montserrat text-foreground">
            Mission complete.
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Everyone made it. That's the mission.
          </p>
        </div>

        {/* Mission Summary Recap */}
        {attendeeCount > 0 && (
          <div className="w-full rounded-xl bg-card border border-border/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Mission Summary
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span>{attendeeCount} confirmed</span>
              </div>
              {ddCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Car className="h-4 w-4 text-primary shrink-0" />
                  <span>{ddCount} DDs deployed</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>100% accounted for</span>
              </div>
            </div>

            {/* Visual completion bar */}
            <Progress value={100} className="h-2" />

            {/* Social proof */}
            {attendeeCount >= 3 && (
              <p className="text-xs text-center text-muted-foreground font-medium italic pt-1">
                This crew rallies.
              </p>
            )}
          </div>
        )}

        {/* Growth CTAs */}
        {attendeeCount > 0 && (
          <div className="w-full space-y-2">
            {eventTitle && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleShareRecap}
              >
                <Share2 className="h-4 w-4" />
                Share the Recap
              </Button>
            )}

            {inviteCode && eventId && eventTitle && (
              <InviteToEventDialog
                eventId={eventId}
                eventTitle={eventTitle}
                inviteCode={inviteCode}
                existingAttendeeIds={[]}
                trigger={
                  <Button variant="outline" className="w-full gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite This Crew Again
                  </Button>
                }
              />
            )}

            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              onClick={handleMakeSquad}
            >
              <UsersRound className="h-4 w-4" />
              Make This a Squad
            </Button>
          </div>
        )}
      </div>

      {/* Feedback modal */}
      {eventId && (
        <RallyFeedbackModal
          open={showFeedback}
          onClose={() => {
            setShowFeedback(false);
            callDone();
          }}
          eventId={eventId}
        />
      )}
    </div>
  );
}
