import { useState, useMemo } from 'react';
import { Search, User, Phone, UserPlus, Check, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { usePhoneContacts } from '@/hooks/usePhoneContacts';
import { useInviteHistory, InviteHistoryEntry } from '@/hooks/useInviteHistory';

interface ContactSelectorProps {
  onSelectContact: (contact: { 
    phone?: string; 
    profileId?: string; 
    name: string;
    isAppUser: boolean;
  }) => void;
  existingInvitedPhones?: string[];
  existingInvitedProfileIds?: string[];
}

export function ContactSelector({ 
  onSelectContact, 
  existingInvitedPhones = [],
  existingInvitedProfileIds = []
}: ContactSelectorProps) {
  const [search, setSearch] = useState('');
  const { data: phoneContacts } = usePhoneContacts();
  const { data: inviteHistory } = useInviteHistory();

  // Combine and deduplicate contacts
  const allContacts = useMemo(() => {
    const contactMap = new Map<string, {
      id: string;
      name: string;
      phone?: string;
      profileId?: string;
      avatarUrl?: string;
      isAppUser: boolean;
      lastInvited?: string;
      inviteCount?: number;
    }>();

    // Add from invite history (prioritize these as they're recent)
    inviteHistory?.forEach((entry: InviteHistoryEntry) => {
      const key = entry.invited_profile_id || entry.invited_phone || entry.id;
      contactMap.set(key, {
        id: entry.id,
        name: entry.profile?.display_name || entry.invited_name || 'Unknown',
        phone: entry.invited_phone || undefined,
        profileId: entry.invited_profile_id || undefined,
        avatarUrl: entry.profile?.avatar_url || undefined,
        isAppUser: !!entry.invited_profile_id,
        lastInvited: entry.last_invited_at,
        inviteCount: entry.invite_count,
      });
    });

    // Add from phone contacts
    phoneContacts?.forEach(contact => {
      if (!contactMap.has(contact.phone_number)) {
        contactMap.set(contact.phone_number, {
          id: contact.id,
          name: contact.display_name || contact.phone_number,
          phone: contact.phone_number,
          isAppUser: false,
        });
      }
    });

    return Array.from(contactMap.values());
  }, [phoneContacts, inviteHistory]);

  // Filter by search
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return allContacts;
    
    const searchLower = search.toLowerCase();
    return allContacts.filter(c => 
      c.name.toLowerCase().includes(searchLower) ||
      c.phone?.includes(search)
    );
  }, [allContacts, search]);

  // Separate recent and other contacts
  const { recentContacts, otherContacts } = useMemo(() => {
    const recent = filteredContacts.filter(c => c.lastInvited);
    const other = filteredContacts.filter(c => !c.lastInvited);
    return { recentContacts: recent, otherContacts: other };
  }, [filteredContacts]);

  const isAlreadyInvited = (contact: typeof allContacts[0]) => {
    if (contact.profileId && existingInvitedProfileIds.includes(contact.profileId)) return true;
    if (contact.phone && existingInvitedPhones.includes(contact.phone)) return true;
    return false;
  };

  const renderContact = (contact: typeof allContacts[0]) => {
    const alreadyInvited = isAlreadyInvited(contact);

    return (
      <div
        key={contact.id}
        className={`flex items-center justify-between p-3 rounded-lg border bg-card ${
          alreadyInvited ? 'opacity-50' : 'hover:bg-muted/50 cursor-pointer'
        }`}
        onClick={() => !alreadyInvited && onSelectContact({
          phone: contact.phone,
          profileId: contact.profileId,
          name: contact.name,
          isAppUser: contact.isAppUser,
        })}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contact.avatarUrl} />
            <AvatarFallback className="bg-primary/10">
              {contact.isAppUser ? (
                <User className="h-4 w-4 text-primary" />
              ) : (
                <Phone className="h-4 w-4 text-muted-foreground" />
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{contact.name}</p>
            <div className="flex items-center gap-2">
              {contact.phone && (
                <p className="text-xs text-muted-foreground">{contact.phone}</p>
              )}
              {contact.isAppUser && (
                <Badge variant="secondary" className="text-xs py-0">
                  R@lly User
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {contact.inviteCount && contact.inviteCount > 1 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              {contact.inviteCount}x
            </Badge>
          )}
          {alreadyInvited ? (
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              Invited
            </Badge>
          ) : (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-4 pr-4">
          {recentContacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recently Invited
              </p>
              <div className="space-y-2">
                {recentContacts.map(renderContact)}
              </div>
            </div>
          )}

          {otherContacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {recentContacts.length > 0 ? 'Other Contacts' : 'Contacts'}
              </p>
              <div className="space-y-2">
                {otherContacts.map(renderContact)}
              </div>
            </div>
          )}

          {filteredContacts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No contacts found</p>
              <p className="text-xs mt-1">Sync your contacts or enter a phone number</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
