import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, UserPlus, Check, Clock, MessageCircle, X, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  useFriendships,
  useRequestFriend,
  useRespondToFriendRequest,
  getFriendshipState,
} from '@/hooks/useFriendships';
import { getPublicName } from '@/lib/identity';
import { toast } from 'sonner';

interface PublicProfileSheetProps {
  profileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublicProfileSheet({ profileId, open, onOpenChange }: PublicProfileSheetProps) {
  const { profile: me } = useAuth();
  const navigate = useNavigate();
  const { data: friendships = [] } = useFriendships();
  const requestFriend = useRequestFriend();
  const respondFriend = useRespondToFriendRequest();

  const { data, isLoading } = useQuery({
    queryKey: ['public-profile', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data: row } = await (supabase as any)
        .from('safe_profiles')
        .select('id, display_name, avatar_url, bio, founding_member, founder_number, badges, reward_points')
        .eq('id', profileId)
        .maybeSingle();
      return row;
    },
    enabled: !!profileId && open,
  });

  const isSelf = !!me?.id && me.id === profileId;
  const friendState = profileId
    ? getFriendshipState(profileId, friendships, me?.id)
    : { label: 'Add Friend', state: 'none' as const, friendship: undefined };

  const publicName = getPublicName(data as any);
  const initial = publicName.charAt(0).toUpperCase();

  const handleFriendAction = async (response: 'accepted' | 'declined' = 'accepted') => {
    if (!profileId) return;
    try {
      if (friendState.state === 'none') {
        await requestFriend.mutateAsync(profileId);
        toast.success(`Friend request sent to ${publicName}`);
      } else if (friendState.state === 'pending_incoming' && friendState.friendship) {
        await respondFriend.mutateAsync({
          friendshipId: friendState.friendship.id,
          response,
        });
        if (response === 'accepted') {
          toast.success(`You and ${publicName} are now friends!`);
        } else {
          toast.success('Friend request declined');
          onOpenChange(false);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Something went wrong');
    }
  };

  const friendButton = () => {
    if (isSelf) {
      return (
        <Button
          variant="outline"
          className="flex-1 min-h-[44px]"
          onClick={() => {
            onOpenChange(false);
            navigate('/profile');
          }}
        >
          View your profile
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      );
    }
    if (friendState.state === 'accepted') {
      return (
        <Button variant="secondary" disabled className="flex-1 min-h-[44px]">
          <Check className="h-4 w-4 mr-2" />
          Friends
        </Button>
      );
    }
    if (friendState.state === 'pending_outgoing') {
      return (
        <Button variant="outline" disabled className="flex-1 min-h-[44px]">
          <Clock className="h-4 w-4 mr-2" />
          Requested
        </Button>
      );
    }
    if (friendState.state === 'pending_incoming') {
      return (
        <>
          <Button
            onClick={() => handleFriendAction('accepted')}
            className="flex-1 min-h-[44px]"
            disabled={respondFriend.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            Accept
          </Button>
          <Button
            variant="outline"
            onClick={() => handleFriendAction('declined')}
            className="flex-1 min-h-[44px]"
            disabled={respondFriend.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Decline
          </Button>
        </>
      );
    }
    return (
      <Button
        onClick={() => handleFriendAction('accepted')}
        className="flex-1 min-h-[44px]"
        disabled={requestFriend.isPending}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Add Friend
      </Button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="sr-only">Profile</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Profile not found</p>
          </div>
        ) : (
          <div className="space-y-4 pb-2">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center pt-2">
              <Avatar className="h-24 w-24 ring-2 ring-primary/20 shadow-lg">
                <AvatarImage src={(data as any).avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold mt-3">{publicName}</h2>

              {/* Founder chip */}
              {(data as any).founding_member && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
                  <Star className="h-3.5 w-3.5 text-primary fill-primary/40" />
                  <span className="text-xs font-bold text-primary">
                    {(data as any).founder_number
                      ? `Founder #${(data as any).founder_number}`
                      : 'Founding Member'}
                  </span>
                </div>
              )}

              {/* Points */}
              {typeof (data as any).reward_points === 'number' && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {(data as any).reward_points} pts
                </Badge>
              )}
            </div>

            {/* Bio */}
            {(data as any).bio && (
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                  {(data as any).bio}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {friendButton()}
              {friendState.state === 'accepted' && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => toast.info('Direct messaging coming soon')}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
