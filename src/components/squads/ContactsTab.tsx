import { useState, useMemo } from 'react';
import { MiniFounderGem } from '@/components/badges/MiniFounderGem';
import { PUBLIC_APP_URL } from '@/lib/appUrl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Zap,
  Users,
  Phone,
  MessageCircle,
  Cloud,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUpsertUserContacts } from '@/hooks/useUserContacts';
import { useRallyFriends } from '@/hooks/useRallyFriends';
import { useAllMySquads, Squad } from '@/hooks/useSquads';
import { usePhoneContacts } from '@/hooks/usePhoneContacts';
import { useUserContacts } from '@/hooks/useUserContacts';
import { SquadSymbolBadge, getSquadIcon } from './SquadSymbolPicker';
import { AddPeopleSheet } from '@/components/contacts/AddPeopleSheet';
import { cn } from '@/lib/utils';
import { getFriendshipState, useFriendships, usePublicProfileSearch, useRequestFriend, useRespondToFriendRequest } from '@/hooks/useFriendships';
import { toast } from 'sonner';

interface ContactsTabProps {
  onInviteToRally?: (profileId: string) => void;
  onAddToSquad?: (profileId: string) => void;
}

export function ContactsTab({ onInviteToRally, onAddToSquad }: ContactsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsExpanded, setFriendsExpanded] = useState(true);
  const [squadMembersExpanded, setSquadMembersExpanded] = useState(true);
  const [phoneContactsExpanded, setPhoneContactsExpanded] = useState(true);
  const [cloudContactsExpanded, setCloudContactsExpanded] = useState(true);
  const [expandedSquads, setExpandedSquads] = useState<Set<string>>(new Set());

  const { data: rallyFriends = [], isLoading: loadingFriends } = useRallyFriends();
  const { data: allSquads = [], isLoading: loadingSquads } = useAllMySquads();
  const { data: phoneContacts = [], isLoading: loadingContacts } = usePhoneContacts();
  const { data: cloudContacts = [], isLoading: loadingCloud } = useUserContacts();
  const { data: friendships = [] } = useFriendships();
  const { data: rallySearchResults = [], isLoading: loadingRallySearch } = usePublicProfileSearch(searchQuery);
  const requestFriend = useRequestFriend();
  const respondToFriendRequest = useRespondToFriendRequest();

  // Filter friends by search
  const filteredFriends = rallyFriends.filter(
    (f) =>
      !searchQuery ||
      f.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter squads by search (squad name or member names)
  const filteredSquads = allSquads.filter((squad) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (squad.name.toLowerCase().includes(query)) return true;
    return squad.members?.some((m) =>
      m.profile?.display_name?.toLowerCase().includes(query)
    );
  });

  // Filter phone contacts by search
  const filteredPhoneContacts = phoneContacts.filter(
    (c) =>
      !searchQuery ||
      c.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone_number?.includes(searchQuery)
  );

  // Filter cloud contacts by search
  const filteredCloudContacts = cloudContacts.filter(
    (c) =>
      !searchQuery ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSquadExpanded = (squadId: string) => {
    setExpandedSquads((prev) => {
      const next = new Set(prev);
      if (next.has(squadId)) {
        next.delete(squadId);
      } else {
        next.add(squadId);
      }
      return next;
    });
  };

  const { profile } = useAuth();
  const upsertContacts = useUpsertUserContacts();

  const handleInviteToApp = async (phone: string, name?: string) => {
    // Smart Merge: persist contact before opening SMS
    if (name || phone) {
      upsertContacts.mutate([{ name, phone, source: 'invite' }]);
    }
    const referralParam = profile?.id ? `?r=${profile.id}` : '';
    const inviteLink = `${PUBLIC_APP_URL}${referralParam}`;
    const message = encodeURIComponent(
      `Yo! I'm getting the squad together on R@lly. Use my link to join the inner circle: ${inviteLink}`
    );
    window.open(`sms:${phone}?body=${message}`, '_blank');
  };

  const handleFriendAction = async (targetProfileId: string) => {
    const state = getFriendshipState(targetProfileId, friendships, profile?.id);
    try {
      if (state.state === 'none') {
        await requestFriend.mutateAsync(targetProfileId);
        toast.success('Friend request sent.');
      } else if (state.state === 'pending_incoming' && state.friendship) {
        await respondToFriendRequest.mutateAsync({ friendshipId: state.friendship.id, response: 'accepted' });
        toast.success('R@lly Friend added.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Could not update friend request');
    }
  };

  // Alphabetical grouping for cloud contacts
  const groupedCloudContacts = useMemo(() => {
    const groups: Record<string, typeof filteredCloudContacts> = {};
    filteredCloudContacts.forEach((c) => {
      const letter = (c.name?.charAt(0) || '#').toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(c);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCloudContacts]);

  return (
    <div className="space-y-4">
      {/* Search bar + Add People */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80 backdrop-blur-sm border-0 shadow-sm rounded-xl"
          />
        </div>
        <AddPeopleSheet />
      </div>

      {/* iOS web app note */}
      <p className="text-xs text-muted-foreground px-1">
        Search by handle/name, phone contact, or synced contact.
      </p>

      {searchQuery.trim().length >= 2 && (
        <Card className="bg-card/90 backdrop-blur-sm shadow-sm rounded-2xl border-primary/10 overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground font-montserrat">R@lly Search</h3>
              {loadingRallySearch && <span className="text-xs text-muted-foreground">Searching…</span>}
            </div>
            {rallySearchResults.length > 0 ? (
              <div className="space-y-2">
                {rallySearchResults.map((result) => {
                  const state = getFriendshipState(result.id, friendships, profile?.id);
                  return (
                    <div key={result.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={result.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary font-bold">
                            {result.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{result.display_name || 'R@lly Member'}</p>
                          {result.bio && <p className="text-xs text-muted-foreground line-clamp-1">{result.bio}</p>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className={cn(
                          'h-9 rounded-full shrink-0',
                          state.state === 'accepted' || state.state === 'pending_outgoing'
                            ? 'bg-muted text-muted-foreground hover:bg-muted'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        )}
                        disabled={state.state === 'accepted' || state.state === 'pending_outgoing' || requestFriend.isPending || respondToFriendRequest.isPending}
                        onClick={() => handleFriendAction(result.id)}
                      >
                        {state.label}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : !loadingRallySearch ? (
              <p className="text-sm text-muted-foreground">No public R@lly profiles found.</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Quick Add row — shown when search has no matches */}
      {(() => {
        const trimmed = searchQuery.trim();
        const hasMatches =
          filteredFriends.length > 0 ||
          filteredSquads.length > 0 ||
          filteredPhoneContacts.length > 0 ||
          filteredCloudContacts.length > 0;
        if (!trimmed || hasMatches) return null;

        const digitsOnly = trimmed.replace(/\D/g, '');
        const isPhone = digitsOnly.length >= 10;
        const displayLabel = isPhone
          ? `R@lly ${trimmed}`
          : `Invite '${trimmed}' via Text`;

        return (
          <button
            onClick={() => handleInviteToApp(isPhone ? digitsOnly : '', isPhone ? undefined : trimmed)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border-l-4 border-[#F47A19] bg-[#F47A19]/10 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#F47A19] flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm font-montserrat text-foreground">{displayLabel}</p>
              <p className="text-xs text-muted-foreground">Tap to open SMS with your R@lly invite link</p>
            </div>
          </button>
        );
      })()}

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-4 pr-4">
          {/* R@lly Friends Section */}
          <Collapsible open={friendsExpanded} onOpenChange={setFriendsExpanded}>
            <Card className="bg-white/90 backdrop-blur-sm shadow-sm rounded-2xl border-0 overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-foreground font-montserrat">
                        R@lly Friends
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {filteredFriends.length} connected
                      </p>
                    </div>
                  </div>
                  {friendsExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4">
                  {loadingFriends ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-14 bg-muted/50 rounded-xl animate-pulse"
                        />
                      ))}
                    </div>
                  ) : filteredFriends.length > 0 ? (
                    <div className="space-y-2">
                      {filteredFriends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={friend.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                  {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              {friend.isSquadMate && (
                                <div className="absolute -bottom-1 -right-1 flex -space-x-1">
                                  {friend.squadSymbols.slice(0, 2).map((sq, i) => (
                                    <SquadSymbolBadge
                                      key={sq.squadId}
                                      symbol={sq.symbol}
                                      size="xs"
                                      className={cn(
                                        'ring-2 ring-white',
                                        i > 0 && 'ml-[-4px]'
                                      )}
                                    />
                                  ))}
                                  {friend.squadSymbols.length > 2 && (
                                    <div className="h-4 w-4 rounded-full bg-muted text-[10px] flex items-center justify-center ring-2 ring-white font-bold">
                                      +{friend.squadSymbols.length - 2}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm inline-flex items-center">
                                {friend.display_name || 'Anonymous'}
                                <MiniFounderGem profileId={friend.id} />
                              </p>
                              {friend.isSquadMate && (
                                <p className="text-xs text-muted-foreground">
                                  In {friend.squadSymbols.length} squad
                                  {friend.squadSymbols.length > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {onAddToSquad && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => onAddToSquad(friend.id)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}
                            {onInviteToRally && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-primary"
                                onClick={() => onInviteToRally(friend.id)}
                              >
                                <Zap className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No R@lly friends yet. Attend events to connect!
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Squad Members Section */}
          <Collapsible
            open={squadMembersExpanded}
            onOpenChange={setSquadMembersExpanded}
          >
            <Card className="bg-white/90 backdrop-blur-sm shadow-sm rounded-2xl border-0 overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-foreground font-montserrat">
                        Squad Members
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {filteredSquads.length} squads
                      </p>
                    </div>
                  </div>
                  {squadMembersExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4">
                  {loadingSquads ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-14 bg-muted/50 rounded-xl animate-pulse"
                        />
                      ))}
                    </div>
                  ) : filteredSquads.length > 0 ? (
                    <div className="space-y-2">
                      {filteredSquads.map((squad) => (
                        <SquadMemberGroup
                          key={squad.id}
                          squad={squad}
                          expanded={expandedSquads.has(squad.id)}
                          onToggle={() => toggleSquadExpanded(squad.id)}
                          searchQuery={searchQuery}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No squads yet. Create one to organize your friends!
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Phone Contacts Section */}
          <Collapsible
            open={phoneContactsExpanded}
            onOpenChange={setPhoneContactsExpanded}
          >
            <Card className="bg-white/90 backdrop-blur-sm shadow-sm rounded-2xl border-0 overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-foreground font-montserrat">
                        Phone Contacts
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {filteredPhoneContacts.length} synced
                      </p>
                    </div>
                  </div>
                  {phoneContactsExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4">
                  {loadingContacts ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-14 bg-muted/50 rounded-xl animate-pulse"
                        />
                      ))}
                    </div>
                  ) : filteredPhoneContacts.length > 0 ? (
                    <div className="space-y-2">
                      {filteredPhoneContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-green-500/20 text-green-600 font-bold">
                                {contact.display_name?.charAt(0)?.toUpperCase() || '#'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {contact.display_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {contact.phone_number}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="rounded-full text-xs bg-[#F47A19] hover:bg-[#F47A19]/90 text-white border-0"
                            onClick={() => handleInviteToApp(contact.phone_number, contact.display_name || undefined)}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            R@lly Them
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nobody to r@lly? Try syncing your contacts.
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Cloud Contacts Section (Google, CSV, Paste imports) */}
          {filteredCloudContacts.length > 0 && (
            <Collapsible
              open={cloudContactsExpanded}
              onOpenChange={setCloudContactsExpanded}
            >
              <Card className="bg-white/90 backdrop-blur-sm shadow-sm rounded-2xl border-0 overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Cloud className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-foreground font-montserrat">
                          Imported Contacts
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {filteredCloudContacts.length} saved
                        </p>
                      </div>
                    </div>
                    {cloudContactsExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4">
                    <div className="space-y-1">
                      {groupedCloudContacts.map(([letter, contacts]) => (
                        <div key={letter}>
                          <p className="text-xs font-bold font-montserrat text-muted-foreground uppercase px-1 pt-2 pb-1">
                            {letter}
                          </p>
                          {contacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-blue-500/20 text-blue-600 font-bold">
                                    {contact.name?.charAt(0)?.toUpperCase() || '#'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {contact.name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {contact.phone || contact.email || ''}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="rounded-full text-xs bg-[#F47A19] hover:bg-[#F47A19]/90 text-white border-0"
                                onClick={() => {
                                  if (contact.phone) handleInviteToApp(contact.phone, contact.name || undefined);
                                  else if (contact.email) {
                                    const referralParam = profile?.id ? `?r=${profile.id}` : '';
                                    const inviteLink = `${PUBLIC_APP_URL}${referralParam}`;
                                    window.open(`mailto:${contact.email}?subject=${encodeURIComponent("Join me on R@lly!")}&body=${encodeURIComponent(`Yo! I'm getting the squad together on R@lly. Use my link to join the inner circle: ${inviteLink}`)}`, '_blank');
                                  }
                                }}
                              >
                                <MessageCircle className="h-3 w-3 mr-1" />
                                R@lly Them
                              </Button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Sub-component for squad member groups
interface SquadMemberGroupProps {
  squad: Squad;
  expanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}

function SquadMemberGroup({
  squad,
  expanded,
  onToggle,
  searchQuery,
}: SquadMemberGroupProps) {
  const Icon = getSquadIcon(squad.symbol || 'shield');
  const members = squad.members || [];
  
  // Filter members by search if there's a query
  const filteredMembers = searchQuery
    ? members.filter((m) =>
        m.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : members;

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm flex items-center gap-2">
                {squad.name}
                {!squad.isOwned && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Member
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-11 pr-3 py-2 space-y-1">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-2 rounded-lg"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {member.profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm inline-flex items-center">
                {member.profile?.display_name || 'Anonymous'}
                <MiniFounderGem profileId={member.profile_id} />
              </span>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              No members match your search
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
