import { useState, useMemo } from 'react';
import { getPublicName } from '@/lib/identity';
import { MiniFounderGem } from '@/components/badges/MiniFounderGem';
import { PUBLIC_APP_URL } from '@/lib/appUrl';
import { openSms } from '@/lib/nativeLinks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageCircle, Zap, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUpsertUserContacts } from '@/hooks/useUserContacts';
import { useRallyFriends } from '@/hooks/useRallyFriends';
import { usePhoneContacts } from '@/hooks/usePhoneContacts';
import { useUserContacts } from '@/hooks/useUserContacts';
import { AddPeopleSheet } from '@/components/contacts/AddPeopleSheet';
import { cn } from '@/lib/utils';
import {
  getFriendshipState,
  useFriendships,
  usePublicProfileSearch,
  useRequestFriend,
  useRespondToFriendRequest,
} from '@/hooks/useFriendships';
import { ProfileTapWrapper } from '@/components/profile/ProfileTapWrapper';
import { toast } from 'sonner';

interface ContactsTabProps {
  onInviteToRally?: (profileId: string) => void;
  onAddToSquad?: (profileId: string) => void;
}

type SelectableContact = {
  key: string;
  name: string;
  subline?: string;
  phone?: string;
  email?: string;
};

const SectionLabel = ({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) => (
  <div className="flex items-center gap-2 px-1 pt-1">
    <span
      className={cn(
        'w-1.5 h-1.5 rounded-full',
        accent ? 'bg-[#F47A19] shadow-[0_0_8px_#F47A19]' : 'bg-zinc-600'
      )}
    />
    <p className="text-[10px] font-black font-montserrat text-zinc-500 uppercase tracking-[0.2em]">
      {children}
    </p>
  </div>
);

export function ContactsTab({ onInviteToRally, onAddToSquad }: ContactsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const { data: rallyFriends = [], isLoading: loadingFriends } = useRallyFriends();
  const { data: phoneContacts = [] } = usePhoneContacts();
  const { data: cloudContacts = [] } = useUserContacts();
  const { data: friendships = [] } = useFriendships();
  const { data: rallySearchResults = [], isLoading: loadingRallySearch } =
    usePublicProfileSearch(searchQuery);
  const requestFriend = useRequestFriend();
  const respondToFriendRequest = useRespondToFriendRequest();
  const { profile } = useAuth();
  const upsertContacts = useUpsertUserContacts();

  const q = searchQuery.trim().toLowerCase();

  const filteredFriends = useMemo(
    () =>
      rallyFriends.filter(
        (f) => !q || f.display_name?.toLowerCase().includes(q)
      ),
    [rallyFriends, q]
  );

  // Merge phone + cloud contacts, dedup by phone/email
  const unifiedContacts: SelectableContact[] = useMemo(() => {
    const map = new Map<string, SelectableContact>();
    phoneContacts.forEach((c) => {
      const key = c.phone_number || c.id;
      map.set(key, {
        key: `p-${c.id}`,
        name: c.display_name || c.phone_number || 'Unknown',
        subline: c.phone_number,
        phone: c.phone_number,
      });
    });
    cloudContacts.forEach((c) => {
      const key = c.phone || c.email || c.id;
      if (!map.has(key)) {
        map.set(key, {
          key: `c-${c.id}`,
          name: c.name || c.phone || c.email || 'Unknown',
          subline: c.phone || c.email || undefined,
          phone: c.phone || undefined,
          email: c.email || undefined,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [phoneContacts, cloudContacts]);

  const filteredContacts = useMemo(() => {
    if (!q) return unifiedContacts;
    return unifiedContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(searchQuery) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [unifiedContacts, q, searchQuery]);

  const toggleContact = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const referralParam = profile?.id ? `?r=${profile.id}` : '';
  const inviteLink = `${PUBLIC_APP_URL}${referralParam}`;
  const smsBody = `Yo! I'm getting the squad together on R@lly. Use my link to join the inner circle: ${inviteLink}`;

  const handleInviteToApp = (phone: string, name?: string) => {
    if (name || phone) {
      upsertContacts.mutate([{ name, phone, source: 'invite' }]);
    }
    openSms(phone, smsBody);
  };

  const handleSendSelected = () => {
    const selected = filteredContacts.filter((c) => selectedKeys.has(c.key));
    const phones = selected.map((c) => c.phone).filter(Boolean).join(',');
    openSms(phones, smsBody);
    toast.success(`Invite opened for ${selected.length} contact${selected.length > 1 ? 's' : ''}`);
    setSelectedKeys(new Set());
  };

  const handleFriendAction = async (targetProfileId: string) => {
    const state = getFriendshipState(targetProfileId, friendships, profile?.id);
    try {
      if (state.state === 'none') {
        await requestFriend.mutateAsync(targetProfileId);
        toast.success('Friend request sent.');
      } else if (state.state === 'pending_incoming' && state.friendship) {
        await respondToFriendRequest.mutateAsync({
          friendshipId: state.friendship.id,
          response: 'accepted',
        });
        toast.success('R@lly Friend added.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Could not update friend request');
    }
  };

  const trimmed = searchQuery.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  const isPhoneQuery = digitsOnly.length >= 10;
  const showSearchResults = q.length >= 2;
  const noMatches =
    showSearchResults &&
    filteredFriends.length === 0 &&
    filteredContacts.length === 0 &&
    rallySearchResults.length === 0 &&
    !loadingRallySearch;

  const selectedCount = selectedKeys.size;

  return (
    <div className="space-y-3 relative">
      {/* Search + Add People */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends, contacts, handles…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80 backdrop-blur-sm border-0 shadow-sm rounded-xl"
          />
        </div>
        <AddPeopleSheet />
      </div>

      <ScrollArea
        className={cn(
          'pr-2',
          selectedCount > 0
            ? 'h-[calc(100vh-380px)]'
            : 'h-[calc(100vh-300px)]'
        )}
      >
        <div className="space-y-5 pb-4">
          {/* Quick Add when search has no matches */}
          {noMatches && (
            <button
              onClick={() =>
                handleInviteToApp(
                  isPhoneQuery ? digitsOnly : '',
                  isPhoneQuery ? undefined : trimmed
                )
              }
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-l-4 border-[#F47A19] bg-[#F47A19]/10 animate-in fade-in duration-300 hover:scale-[1.01] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#F47A19] flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm font-montserrat text-foreground">
                  {isPhoneQuery ? `R@lly ${trimmed}` : `Invite '${trimmed}' via Text`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tap to open SMS with your invite link
                </p>
              </div>
            </button>
          )}

          {/* R@lly Members search results — only while typing */}
          {showSearchResults && rallySearchResults.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>R@lly Members</SectionLabel>
              {rallySearchResults.map((result) => {
                const state = getFriendshipState(result.id, friendships, profile?.id);
                const isLocked =
                  state.state === 'accepted' || state.state === 'pending_outgoing';
                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 px-1 py-2"
                  >
                    <ProfileTapWrapper
                      profileId={result.id}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={result.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                          {result.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 text-left">
                        <p className="font-medium text-sm truncate">
                          {result.display_name || 'R@lly Member'}
                        </p>
                        {result.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {result.bio}
                          </p>
                        )}
                      </div>
                    </ProfileTapWrapper>
                    <Button
                      size="sm"
                      variant={isLocked ? 'ghost' : 'default'}
                      className="h-8 rounded-full shrink-0 text-xs"
                      disabled={
                        isLocked || requestFriend.isPending || respondToFriendRequest.isPending
                      }
                      onClick={() => handleFriendAction(result.id)}
                    >
                      {state.label}
                    </Button>
                  </div>
                );
              })}
            </section>
          )}

          {/* R@lly Friends */}
          {filteredFriends.length > 0 && (
            <section className="space-y-1">
              <SectionLabel>R@lly Friends</SectionLabel>
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <ProfileTapWrapper
                    profileId={friend.id}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left min-w-0">
                      <p className="font-medium text-sm inline-flex items-center truncate">
                        {getPublicName(friend)}
                        <MiniFounderGem profileId={friend.id} />
                      </p>
                      {friend.isSquadMate && (
                        <p className="text-xs text-muted-foreground truncate">
                          In {friend.squadSymbols.length} squad
                          {friend.squadSymbols.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </ProfileTapWrapper>
                  {onInviteToRally && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-primary shrink-0"
                      onClick={() => onInviteToRally(friend.id)}
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Unified contacts — selectable */}
          {filteredContacts.length > 0 && (
            <section className="space-y-1">
              <SectionLabel>Your Contacts</SectionLabel>
              {filteredContacts.map((contact) => {
                const isSelected = selectedKeys.has(contact.key);
                return (
                  <button
                    key={contact.key}
                    onClick={() => toggleContact(contact.key)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all',
                      isSelected
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-muted/40'
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback
                        className={cn(
                          'font-bold text-sm',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isSelected ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          contact.name.charAt(0).toUpperCase() || '#'
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-sm truncate">{contact.name}</p>
                      {contact.subline && (
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.subline}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </section>
          )}

          {/* Empty state — only when there's truly nothing */}
          {!loadingFriends &&
            rallyFriends.length === 0 &&
            unifiedContacts.length === 0 &&
            !showSearchResults && (
              <div className="text-center py-12 px-6">
                <p className="text-sm text-muted-foreground">
                  Nobody here yet. Tap{' '}
                  <span className="font-semibold text-foreground">Add People</span> to
                  sync your contacts or invite by name.
                </p>
              </div>
            )}
        </div>
      </ScrollArea>

      {/* Sticky multi-select action bar */}
      {selectedCount > 0 && (
        <div className="sticky bottom-0 left-0 right-0 px-2 pb-2 pt-3 bg-gradient-to-t from-background via-background to-background/0 animate-in slide-in-from-bottom-2 duration-200">
          <Button
            className="w-full rounded-xl h-12 text-base font-bold bg-[#F47A19] hover:bg-[#F47A19]/90 text-white shadow-lg"
            onClick={handleSendSelected}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            R@lly {selectedCount} Contact{selectedCount > 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}
