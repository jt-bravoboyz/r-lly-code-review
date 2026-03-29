import { useState } from 'react';
import { Users, Calendar, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useMarkNotificationRead, useDeleteNotification } from '@/hooks/useNotifications';
import { useRespondToInvite } from '@/hooks/useEventInvites';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';

type Notification = Tables<'notifications'>;

interface InviteAlertCardProps {
  notification: Notification;
}

export function InviteAlertCard({ notification }: InviteAlertCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [responded, setResponded] = useState(false);
  const markRead = useMarkNotificationRead();
  const deleteNotification = useDeleteNotification();
  const respondToInvite = useRespondToInvite();
  const queryClient = useQueryClient();

  const data = notification.data as Record<string, any> | null;
  const isSquadInvite = notification.type === 'squad_invite';
  const isRallyInvite = notification.type === 'rally_invite' || notification.type === 'event_invite';

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      if (isSquadInvite && data?.invite_code) {
        const { data: result, error } = await supabase.rpc('join_squad_by_invite_code', {
          p_invite_code: data.invite_code,
        });

        if (error) throw error;
        const res = result as { success?: boolean; error?: string };
        if (res?.error) {
          toast.error(res.error);
          setIsAccepting(false);
          return;
        }

        toast.success('You joined the squad! 🎉');
        queryClient.invalidateQueries({ queryKey: ['squads'] });
        queryClient.invalidateQueries({ queryKey: ['owned-squads'] });
        queryClient.invalidateQueries({ queryKey: ['member-squads'] });
      } else if (isRallyInvite && data?.invite_id) {
        await respondToInvite.mutateAsync({
          inviteId: data.invite_id,
          eventId: data.event_id,
          response: 'accepted',
        });
        toast.success("You're in! 🎉");
      } else if (isRallyInvite && data?.event_id) {
        // Fallback: find invite by event
        const { data: invites } = await supabase
          .from('event_invites')
          .select('id')
          .eq('event_id', data.event_id)
          .eq('status', 'pending')
          .limit(1);

        if (invites?.[0]) {
          await respondToInvite.mutateAsync({
            inviteId: invites[0].id,
            eventId: data.event_id,
            response: 'accepted',
          });
          toast.success("You're in! 🎉");
        }
      }

      deleteNotification.mutate(notification.id);
      setResponded(true);
    } catch (err: any) {
      console.error('Accept failed:', err);
      toast.error(err.message || 'Failed to accept invite');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      if (isRallyInvite && data?.invite_id) {
        await respondToInvite.mutateAsync({
          inviteId: data.invite_id,
          eventId: data.event_id,
          response: 'declined',
        });
      } else if (isRallyInvite && data?.event_id) {
        const { data: invites } = await supabase
          .from('event_invites')
          .select('id')
          .eq('event_id', data.event_id)
          .eq('status', 'pending')
          .limit(1);

        if (invites?.[0]) {
          await respondToInvite.mutateAsync({
            inviteId: invites[0].id,
            eventId: data.event_id,
            response: 'declined',
          });
        }
      }

      // For squad invites, just mark as declined by removing notification
      deleteNotification.mutate(notification.id);
      setResponded(true);
      toast('Invite declined');
    } catch (err: any) {
      console.error('Decline failed:', err);
      toast.error('Failed to decline');
    } finally {
      setIsDeclining(false);
    }
  };

  if (responded) {
    return null;
  }

  const Icon = isSquadInvite ? Users : Calendar;

  return (
    <Card
      className={`rounded-xl backdrop-blur-xl border-l-4 border-l-primary transition-all duration-300 ${
        notification.read
          ? 'bg-card/60 border-white/10'
          : 'bg-card/70 border-primary/15 shadow-[0_0_20px_hsl(27_91%_53%/0.08)]'
      }`}
      style={{ WebkitBackdropFilter: 'blur(20px)' }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`font-semibold text-sm ${notification.read ? 'text-foreground' : 'text-primary'}`}>
                {notification.title}
              </p>
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 shadow-[0_0_6px_hsl(27_91%_53%/0.5)]" />
              )}
            </div>
            {notification.body && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {notification.body}
              </p>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {notification.created_at
                ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
                : 'Just now'}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={isAccepting || isDeclining}
                className="gap-1.5 flex-1"
              >
                {isAccepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                disabled={isAccepting || isDeclining}
                className="gap-1.5 flex-1"
              >
                {isDeclining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                Decline
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
