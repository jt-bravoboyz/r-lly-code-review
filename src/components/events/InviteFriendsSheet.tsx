import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Check, Users } from 'lucide-react';
import { useRallyFriends } from '@/hooks/useRallyFriends';
import { useCreateEventInvites, useEventInvites } from '@/hooks/useEventInvites';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InviteFriendsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  existingAttendeeIds: string[];
}

export function InviteFriendsSheet({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  existingAttendeeIds,
}: InviteFriendsSheetProps) {
  const [query, setQuery] = useState('');
  const [justInvited, setJustInvited] = useState<Set<string>>(new Set());
  const { data: friends = [], isLoading } = useRallyFriends();
  const { data: existingInvites = [] } = useEventInvites(eventId);
  const createInvites = useCreateEventInvites();

  const existingInvitedIds = useMemo(
    () => new Set(existingInvites.map((i) => i.invited_profile_id)),
    [existingInvites]
  );
  const attendeeSet = useMemo(() => new Set(existingAttendeeIds), [existingAttendeeIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => (f.display_name || '').toLowerCase().includes(q));
  }, [friends, query]);

  const handleInvite = async (profileId: string) => {
    setJustInvited((prev) => {
      const next = new Set(prev);
      next.add(profileId);
      return next;
    });
    try {
      await createInvites.mutateAsync({
        eventId,
        profileIds: [profileId],
        eventTitle,
      });
      toast.success('Invite sent');
    } catch (e: any) {
      setJustInvited((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
      toast.error(e?.message || 'Could not send invite');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-white/20 bg-background/95 backdrop-blur-2xl p-0 max-h-[85dvh] flex flex-col"
        style={{ WebkitBackdropFilter: 'blur(28px)' }}
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <SheetTitle className="flex items-center gap-2 font-montserrat">
            <Users className="h-5 w-5 text-primary" />
            Invite Friends
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left">
            Send a R@lly invite to anyone in your crew.
          </p>
        </SheetHeader>

        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search friends…"
              className="pl-9 h-11 rounded-full bg-card/70 border-white/10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 py-2 pb-6">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-8">Loading friends…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {query ? 'No matches.' : 'No friends yet. Add some from the Contacts tab.'}
              </p>
            ) : (
              filtered.map((friend) => {
                const isAttending = attendeeSet.has(friend.id);
                const alreadyInvited = existingInvitedIds.has(friend.id) || justInvited.has(friend.id);
                const disabled = isAttending || alreadyInvited || createInvites.isPending;
                return (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors"
                  >
                    <Avatar className="h-11 w-11 ring-1 ring-primary/20">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/15 text-primary font-bold">
                        {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate font-montserrat">
                        {friend.display_name || 'R@lly Member'}
                      </p>
                      {(isAttending || alreadyInvited) && (
                        <p className="text-[11px] text-muted-foreground">
                          {isAttending ? 'Already in' : 'Invite sent'}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      disabled={disabled}
                      onClick={() => handleInvite(friend.id)}
                      className={cn(
                        'min-h-[44px] px-4 rounded-full font-black uppercase tracking-wider text-[11px] font-montserrat transition-all',
                        isAttending || alreadyInvited
                          ? 'bg-primary/12 text-primary border border-primary/30 hover:bg-primary/12'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(244,122,25,0.4)]'
                      )}
                    >
                      {isAttending || alreadyInvited ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {isAttending ? 'In' : 'Sent'}
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Invite
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
