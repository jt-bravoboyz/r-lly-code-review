import { Users, Calendar, ExternalLink, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMarkFriendRequestNotificationsRead, useMarkNotificationRead } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';
import { useRespondToFriendRequest } from '@/hooks/useFriendships';
import { toast } from 'sonner';

type Notification = Tables<'notifications'>;

interface InviteAlertCardProps {
  notification: Notification;
}

export function InviteAlertCard({ notification }: InviteAlertCardProps) {
  const markRead = useMarkNotificationRead();
  const markFriendRequestRead = useMarkFriendRequestNotificationsRead();
  const respondToFriendRequest = useRespondToFriendRequest();
  const navigate = useNavigate();

  const data = notification.data as Record<string, any> | null;
  const isSquadInvite = notification.type === 'squad_invite';
  const isRallyInvite = notification.type === 'rally_invite' || notification.type === 'event_invite';
  const isFriendRequest = notification.type === 'friend_request';

  const handleViewInvite = () => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }

    if (isSquadInvite && data?.invite_code) {
      navigate(`/join-squad?code=${data.invite_code}`);
    } else if (isRallyInvite && data?.event_id) {
      navigate(`/events/${data.event_id}`);
    }
  };

  const handleFriendResponse = async (response: 'accepted' | 'declined') => {
    if (!data?.friendship_id) return;

    try {
      await respondToFriendRequest.mutateAsync({ friendshipId: data.friendship_id, response });
      await markFriendRequestRead.mutateAsync(data.friendship_id);
      toast.success(response === 'accepted' ? 'R@lly Friend added.' : 'Friend request declined.');
    } catch (error: any) {
      toast.error(error.message || 'Could not update friend request');
    }
  };

  const Icon = isFriendRequest ? UserPlus : isSquadInvite ? Users : Calendar;

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

            {isFriendRequest && !notification.read && data?.friendship_id ? (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={respondToFriendRequest.isPending || markFriendRequestRead.isPending}
                  onClick={() => handleFriendResponse('accepted')}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-full"
                  disabled={respondToFriendRequest.isPending || markFriendRequestRead.isPending}
                  onClick={() => handleFriendResponse('declined')}
                >
                  Decline
                </Button>
              </div>
            ) : !isFriendRequest ? (
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={handleViewInvite}
                  className="gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Invite
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
