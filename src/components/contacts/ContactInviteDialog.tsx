import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Check, Send, Users, ShieldCheck } from 'lucide-react';
import { usePhoneContacts, PhoneContact } from '@/hooks/usePhoneContacts';
import { ContactSyncButton } from './ContactSyncButton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface ContactInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactInviteDialog({ open, onOpenChange }: ContactInviteDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const { data: contacts = [], isLoading } = usePhoneContacts();
  const { profile } = useAuth();

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.display_name?.toLowerCase().includes(q) ||
        c.phone_number?.includes(searchQuery)
    );
  }, [contacts, searchQuery]);

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendInvites = async () => {
    const selected = contacts.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;

    setIsSending(true);

    // Build the referral link
    const referralParam = profile?.id ? `?r=${profile.id}` : '';
    const inviteLink = `https://rallyboyz.lovable.app${referralParam}`;
    const message = `Hey! Join me on R@lly — the app for coordinating epic nights out with your squad. No more messy group chats. 🟠\n\n${inviteLink}`;

    // Try native share for multi-contact, fallback to SMS
    const phones = selected.map((c) => c.phone_number).join(',');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join R@lly',
          text: message,
        });
      } catch {
        // User cancelled share — that's fine
      }
    } else {
      const encoded = encodeURIComponent(message);
      window.open(`sms:${phones}?body=${encoded}`, '_blank');
    }

    setIsSending(false);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const selectedCount = selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold font-montserrat">
            <Users className="h-5 w-5 text-primary" />
            Invite to R@lly
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Select contacts to invite — no spam, ever.
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 rounded-xl"
            />
          </div>
        </div>

        {/* Contact List */}
        <ScrollArea className="flex-1 px-5">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2 font-montserrat">
                No contacts synced yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
                Sync your contacts to invite friends to R@lly in seconds.
              </p>
              <ContactSyncButton />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No contacts match "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {filteredContacts.map((contact) => {
                const isSelected = selectedIds.has(contact.id);
                return (
                  <button
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                      isSelected
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
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
                            contact.display_name?.charAt(0)?.toUpperCase() || '#'
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-sm truncate">
                        {contact.display_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.phone_number}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Privacy Notice + Send */}
        <div className="px-5 py-4 border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
            <span>We only use contacts to help you invite friends. No auto-invites.</span>
          </div>
          <Button
            className="w-full btn-rally rounded-xl h-12 text-base font-bold"
            disabled={selectedCount === 0 || isSending}
            onClick={handleSendInvites}
          >
            <Send className="h-4 w-4 mr-2" />
            {selectedCount > 0
              ? `Invite ${selectedCount} Contact${selectedCount > 1 ? 's' : ''}`
              : 'Select Contacts to Invite'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
