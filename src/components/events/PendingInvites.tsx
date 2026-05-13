import { useState } from 'react';
import { Check, X, Calendar, MapPin, Zap, Beer, PartyPopper, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingInvites, useRespondToInvite, type EventInvite } from '@/hooks/useEventInvites';
import { useCoverChargeGate } from '@/hooks/useCoverChargeGate';
import { useAuth } from '@/hooks/useAuth';
import { useConfetti } from '@/hooks/useConfetti';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function PendingInviteCard({ invite }: { invite: EventInvite }) {
  const respondToInvite = useRespondToInvite();
  const { profile } = useAuth();
  const { fireRallyConfetti } = useConfetti();
  const navigate = useNavigate();
  const [isResponding, setIsResponding] = useState(false);

  const event = invite.event;
  const inviter = invite.inviter;
  const cover = Number(event?.cover_charge ?? 0);

  const { ensurePaid, dialog: coverDialog } = useCoverChargeGate(
    event ? { id: event.id, title: event.title, cover_charge: event.cover_charge } : null,
    profile as any,
  );

  const handleRespond = async (response: 'accepted' | 'declined') => {
    setIsResponding(true);
    try {
      if (response === 'accepted') {
        // Strict gate: only fires when cover_charge > 0 and not already paid.
        const ok = await ensurePaid();
        if (!ok) {
          setIsResponding(false);
          return;
        }
      }

      await respondToInvite.mutateAsync({
        inviteId: invite.id,
        eventId: invite.event_id,
        response,
      });

      if (response === 'accepted') {
        fireRallyConfetti();
        toast.success("You're in! 🎉");
        setTimeout(() => navigate(`/events/${invite.event_id}`), 500);
      } else {
        toast.success('Invite declined');
      }
    } catch (error: any) {
      // If cover is required and was somehow bypassed, route to event page.
      if (error?.code === 'cover_required') {
        toast.error('Cover charge required — opening payment…');
        navigate(`/events/${invite.event_id}`);
      } else {
        toast.error(error.message || 'Failed to respond to invite');
      }
      setIsResponding(false);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src={inviter?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {inviter?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{inviter?.display_name || 'Someone'}</span>
              {' invited you to '}
              <span className="font-semibold text-primary">{event?.title || 'a rally'}</span>
            </p>

            {event && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {event.is_quick_rally && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Zap className="h-3 w-3" />
                      Quick
                    </Badge>
                  )}
                  {event.is_barhop && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Beer className="h-3 w-3" />
                      Bar Hop
                    </Badge>
                  )}
                  {cover > 0 && (
                    <Badge className="text-xs gap-1 bg-primary/15 text-primary border-primary/30">
                      ${cover.toFixed(2)} cover
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(event.start_time), 'EEE, MMM d · h:mm a')}
                </div>

                {event.location_name && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {event.location_name}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                className="flex-1 gap-1 bg-primary hover:bg-primary/90"
                onClick={() => handleRespond('accepted')}
                disabled={isResponding}
              >
                <Check className="h-4 w-4" />
                {isResponding
                  ? 'Joining...'
                  : cover > 0
                  ? `Pay $${cover.toFixed(2)} & Join`
                  : "I'm In!"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => handleRespond('declined')}
                disabled={isResponding}
              >
                <X className="h-4 w-4" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      {coverDialog}
    </Card>
  );
}

export function PendingInvites() {
  const { data: invites, isLoading } = usePendingInvites();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!invites || invites.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <PartyPopper className="h-4 w-4 text-primary" />
        R@lly Invites
      </h3>

      {invites.map((invite) => (
        <PendingInviteCard key={invite.id} invite={invite} />
      ))}
    </div>
  );
}
