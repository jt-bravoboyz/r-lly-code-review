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
import { ContactRowSkeleton } from '@/components/contacts/ContactRowSkeleton';
import { PeopleYouMayKnowCarousel } from '@/components/contacts/PeopleYouMayKnowCarousel';
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
        accent
          ? 'bg-[#F47A19] shadow-[0_0_10px_#F47A19]'
          : 'bg-[#F47A19] shadow-[0_0_8px_rgba(244,122,25,0.7)]'
      )}
    />
    <p className="text-[10px] font-black font-montserrat text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.2em]">
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
    <div className="relative">
      {/* Premium glass island — adapts to light/dark */}
      <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-[#0F0F12] backdrop-blur-xl border border-black/[0.05] dark:border-white/[0.08] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] p-4 sm:p-5 space-y-5">
        {/* Ambient orange drift */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#F47A19]/10 dark:bg-[#F47A19]/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-[#F47A19]/[0.04] dark:bg-[#F47A19]/[0.06] blur-3xl"
        />

        {/* Search + Add People */}
        <div className="relative z-10 flex gap-2">
          <div className="relative flex-1">
            <Search strokeWidth={2.25} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-zinc-500 pointer-events-none z-10" />
            <Input
              placeholder="Search friends, contacts, handles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '16px' }}
              className="pl-10 h-12 bg-black/[0.04] dark:bg-white/5 border border-black/[0.06] dark:border-white/10 rounded-2xl text-zinc-900 dark:text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-[#F47A19] focus-visible:border-[#F47A19] transition-colors"
            />
          </div>
          <AddPeopleSheet />
        </div>

        <ScrollArea
          className={cn(
            'pr-2 relative z-10',
            selectedCount > 0
              ? 'h-[calc(100vh-420px)]'
              : 'h-[calc(100vh-340px)]'
          )}
        >
          <div className="space-y-5 pb-4">
            {!q && <PeopleYouMayKnowCarousel />}
            {/* Quick Add when search has no matches */}
            {noMatches && (
              <button
                onClick={() =>
                  handleInviteToApp(
                    isPhoneQuery ? digitsOnly : '',
                    isPhoneQuery ? undefined : trimmed
                  )
                }
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-[#F47A19]/15 to-transparent border border-[#F47A19]/30 shadow-[0_4px_24px_-8px_rgba(244,122,25,0.4)] animate-in fade-in duration-300 active:scale-[0.99] transition-transform"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#F47A19] flex items-center justify-center shrink-0 shadow-lg shadow-[#F47A19]/30">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-black text-sm font-montserrat text-zinc-900 dark:text-white truncate">
                    {isPhoneQuery ? `R@lly ${trimmed}` : `Invite '${trimmed}' via Text`}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-semibold">
                    Tap to open SMS with your invite link
                  </p>
                </div>
              </button>
            )}

            {/* R@lly Members search results — only while typing */}
            {showSearchResults && loadingRallySearch && rallySearchResults.length === 0 && (
              <section className="space-y-2">
                <SectionLabel accent>R@lly Members</SectionLabel>
                <ContactRowSkeleton count={3} />
              </section>
            )}
            {showSearchResults && rallySearchResults.length > 0 && (

              <section className="space-y-2">
                <SectionLabel accent>R@lly Members</SectionLabel>
                {rallySearchResults.map((result) => {
                  const state = getFriendshipState(result.id, friendships, profile?.id);
                  const isLocked =
                    state.state === 'accepted' || state.state === 'pending_outgoing';
                  return (
                    <div
                      key={result.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05]"
                    >
                      <ProfileTapWrapper
                        profileId={result.id}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <Avatar className="h-11 w-11 shrink-0 ring-1 ring-black/10 dark:ring-white/10">
                          <AvatarImage src={result.avatar_url || undefined} />
                          <AvatarFallback className="bg-[#F47A19]/15 text-[#F47A19] font-black">
                            {result.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 text-left">
                          <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                            {result.display_name || 'R@lly Member'}
                          </p>
                          {result.bio && (
                            <p className="text-[11px] text-zinc-500 line-clamp-1">
                              {result.bio}
                            </p>
                          )}
                        </div>
                      </ProfileTapWrapper>
                      <Button
                        size="sm"
                        className={cn(
                          'h-8 rounded-full shrink-0 text-[11px] font-black uppercase tracking-wider px-3',
                          isLocked
                            ? 'bg-black/5 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
                            : 'bg-[#F47A19] text-white hover:bg-[#F47A19]/90 shadow-lg shadow-[#F47A19]/20'
                        )}
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
            {loadingFriends && filteredFriends.length === 0 && (
              <section className="space-y-2">
                <SectionLabel accent>R@lly Friends</SectionLabel>
                <ContactRowSkeleton count={5} />
              </section>
            )}
            {filteredFriends.length > 0 && (

              <section className="space-y-2">
                <SectionLabel accent>R@lly Friends</SectionLabel>
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] hover:bg-black/[0.05] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <ProfileTapWrapper
                      profileId={friend.id}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <Avatar className="h-11 w-11 shrink-0 ring-1 ring-black/10 dark:ring-white/10">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback className="bg-[#F47A19]/15 text-[#F47A19] font-black">
                          {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left min-w-0">
                        <p className="font-bold text-sm inline-flex items-center text-zinc-900 dark:text-white truncate">
                          {getPublicName(friend)}
                          <MiniFounderGem profileId={friend.id} />
                        </p>
                        {friend.isSquadMate && (
                          <p className="text-[11px] text-zinc-500 truncate">
                            In {friend.squadSymbols.length} squad
                            {friend.squadSymbols.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </ProfileTapWrapper>
                    {onInviteToRally && (
                      <Button
                        size="sm"
                        className="h-9 w-9 p-0 rounded-xl bg-[#F47A19]/15 text-[#F47A19] hover:bg-[#F47A19]/25 shrink-0"
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
              <section className="space-y-2">
                <SectionLabel>Your Contacts</SectionLabel>
                {filteredContacts.map((contact) => {
                  const isSelected = selectedKeys.has(contact.key);
                  return (
                    <button
                      key={contact.key}
                      onClick={() => toggleContact(contact.key)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-[0.99]',
                        isSelected
                          ? 'bg-[#F47A19]/10 border-[#F47A19]/40 ring-1 ring-[#F47A19]/40 shadow-[0_4px_20px_-8px_rgba(244,122,25,0.5)]'
                          : 'bg-black/[0.03] dark:bg-white/[0.02] border-black/[0.05] dark:border-white/[0.05] hover:bg-black/[0.05] dark:hover:bg-white/[0.04]'
                      )}
                    >
                      <div
                        className={cn(
                          'h-11 w-11 rounded-2xl shrink-0 flex items-center justify-center font-black text-sm',
                          isSelected
                            ? 'bg-[#F47A19] text-white shadow-lg shadow-[#F47A19]/30'
                            : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-black/[0.06] dark:border-white/10'
                        )}
                      >
                        {isSelected ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          contact.name.charAt(0).toUpperCase() || '#'
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{contact.name}</p>
                        {contact.subline && (
                          <p className="text-[11px] text-zinc-500 truncate">
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
                <div className="text-center py-14 px-6">
                  <p className="text-sm text-zinc-500 font-semibold">
                    Nobody here yet. Tap{' '}
                    <span className="font-black text-[#F47A19]">Add People</span> to
                    sync your contacts or invite by name.
                  </p>
                </div>
              )}
          </div>
        </ScrollArea>
      </div>

      {/* Sticky multi-select action bar */}
      {selectedCount > 0 && (
        <div className="sticky bottom-0 left-0 right-0 px-2 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 animate-in slide-in-from-bottom-2 duration-200">
          <Button
            className="w-full rounded-2xl h-12 text-sm font-black font-montserrat uppercase tracking-wider bg-[#F47A19] hover:bg-[#F47A19]/90 text-white shadow-[0_4px_20px_rgba(244,122,25,0.35)] hover:shadow-[0_6px_28px_rgba(244,122,25,0.5)] transition-all"
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
