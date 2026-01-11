import { useState } from 'react';
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
  MessageSquare,
} from 'lucide-react';
import { useRallyFriends } from '@/hooks/useRallyFriends';
import { useAllMySquads, Squad } from '@/hooks/useSquads';
import { usePhoneContacts } from '@/hooks/usePhoneContacts';
import { SquadSymbolBadge, getSquadIcon } from './SquadSymbolPicker';
import { cn } from '@/lib/utils';

interface ContactsTabProps {
  onInviteToRally?: (profileId: string) => void;
  onAddToSquad?: (profileId: string) => void;
}

export function ContactsTab({ onInviteToRally, onAddToSquad }: ContactsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsExpanded, setFriendsExpanded] = useState(true);
  const [squadMembersExpanded, setSquadMembersExpanded] = useState(true);
  const [phoneContactsExpanded, setPhoneContactsExpanded] = useState(true);
  const [expandedSquads, setExpandedSquads] = useState<Set<string>>(new Set());

  const { data: rallyFriends = [], isLoading: loadingFriends } = useRallyFriends();
  const { data: allSquads = [], isLoading: loadingSquads } = useAllMySquads();
  const { data: phoneContacts = [], isLoading: loadingContacts } = usePhoneContacts();

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

  const handleInviteToApp = (phone: string) => {
    const message = encodeURIComponent(
      "Hey! Join me on R@lly - the app for coordinating nights out with friends. Download it here: https://rally.app"
    );
    window.open(`sms:${phone}?body=${message}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/80 backdrop-blur-sm border-0 shadow-sm rounded-xl"
        />
      </div>

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
                              <p className="font-medium text-sm">
                                {friend.display_name || 'Anonymous'}
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
                            variant="outline"
                            className="rounded-full text-xs"
                            onClick={() => handleInviteToApp(contact.phone_number)}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Invite
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No phone contacts synced yet.
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
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
              <span className="text-sm">
                {member.profile?.display_name || 'Anonymous'}
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
