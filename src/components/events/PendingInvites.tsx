import { useState } from 'react';
import { Check, X, Calendar, MapPin, Zap, Beer, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingInvites, useRespondToInvite } from '@/hooks/useEventInvites';
import { useConfetti } from '@/hooks/useConfetti';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function PendingInvites() {
  const { data: invites, isLoading } = usePendingInvites();
  const respondToInvite = useRespondToInvite();
  const { fireRallyConfetti } = useConfetti();
  const navigate = useNavigate();
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());

  const handleRespond = async (inviteId: string, eventId: string, response: 'accepted' | 'declined') => {
    setRespondingIds(prev => new Set([...prev, inviteId]));
    
    try {
      await respondToInvite.mutateAsync({ inviteId, eventId, response });
      
      if (response === 'accepted') {
        fireRallyConfetti();
        toast.success("You're in! 🎉");
        // Navigate to the event after a short delay
        setTimeout(() => navigate(`/events/${eventId}`), 500);
      } else {
        toast.success('Invite declined');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to respond to invite');
    } finally {
      setRespondingIds(prev => {
        const next = new Set(prev);
        next.delete(inviteId);
        return next;
      });
    }
  };

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
      
      {invites.map((invite) => {
        const isResponding = respondingIds.has(invite.id);
        const event = invite.event;
        const inviter = invite.inviter;
        
        return (
          <Card key={invite.id} className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Inviter Avatar */}
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={inviter?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {inviter?.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  {/* Invite Message */}
                  <p className="text-sm">
                    <span className="font-semibold">{inviter?.display_name || 'Someone'}</span>
                    {' invited you to '}
                    <span className="font-semibold text-primary">{event?.title || 'a rally'}</span>
                  </p>
                  
                  {/* Event Details */}
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
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      className="flex-1 gap-1 bg-primary hover:bg-primary/90"
                      onClick={() => handleRespond(invite.id, invite.event_id, 'accepted')}
                      disabled={isResponding}
                    >
                      <Check className="h-4 w-4" />
                      {isResponding ? 'Joining...' : "I'm In!"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => handleRespond(invite.id, invite.event_id, 'declined')}
                      disabled={isResponding}
                    >
                      <X className="h-4 w-4" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
