import { useState, useMemo, useEffect, useRef } from 'react';
import { PUBLIC_APP_URL } from '@/lib/appUrl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Check, MessageCircle, Users, ShieldCheck, Smartphone, Cloud, ChevronDown } from 'lucide-react';
import { usePhoneContacts, PhoneContact } from '@/hooks/usePhoneContacts';
import { useUserContacts, UserContact } from '@/hooks/useUserContacts';
import { ContactSyncButton } from './ContactSyncButton';
import { CSVContactImport } from './CSVContactImport';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ContactInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UnifiedContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  source: 'device' | 'google' | 'csv';
}

export function ContactInviteDialog({ open, onOpenChange }: ContactInviteDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { data: deviceContacts = [], isLoading: deviceLoading } = usePhoneContacts();
  const { data: cloudContacts = [], isLoading: cloudLoading } = useUserContacts();
  const { profile } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);

  const isLoading = deviceLoading || cloudLoading;

  // Auto-focus search input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open]);

  // Merge device + cloud contacts, dedup by phone
  const allContacts = useMemo(() => {
    const map = new Map<string, UnifiedContact>();

    deviceContacts.forEach((c: PhoneContact) => {
      const key = c.phone_number;
      map.set(key, {
        id: `device-${c.id}`,
        name: c.display_name || c.phone_number,
        phone: c.phone_number,
        source: 'device',
      });
    });

    cloudContacts.forEach((c: UserContact) => {
      const key = c.phone || c.email || c.id;
      if (!map.has(key)) {
        map.set(key, {
          id: `cloud-${c.id}`,
          name: c.name || c.phone || c.email || 'Unknown',
          phone: c.phone || undefined,
          email: c.email || undefined,
          source: c.source === 'google' ? 'google' : 'csv',
        });
      }
    });

    return Array.from(map.values());
  }, [deviceContacts, cloudContacts]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return allContacts;
    const q = searchQuery.toLowerCase();
    return allContacts.filter(
      c => c.name.toLowerCase().includes(q) ||
           c.phone?.includes(searchQuery) ||
           c.email?.toLowerCase().includes(q)
    );
  }, [allContacts, searchQuery]);

  const toggleContact = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const referralParam = profile?.id ? `?r=${profile.id}` : '';
  const inviteLink = `${PUBLIC_APP_URL}${referralParam}`;
  const smsBody = `Yo! I'm getting the squad together on R@lly. Use my link to join the inner circle: ${inviteLink}`;

  const handleSendInvites = async () => {
    const selected = allContacts.filter(c => selectedIds.has(c.id));
    if (selected.length === 0) return;

    setIsSending(true);

    const phones = selected.map(c => c.phone).filter(Boolean).join(',');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join R@lly', text: smsBody });
      } catch { /* cancelled */ }
    } else {
      const encoded = encodeURIComponent(smsBody);
      window.location.href = `sms:${phones}?body=${encoded}`;
    }

    setIsSending(false);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  // Quick Add for manual invite when no results match
  const handleQuickAdd = () => {
    const trimmed = searchQuery.trim();
    const digitsOnly = trimmed.replace(/\D/g, '');
    const isPhone = digitsOnly.length >= 10;
    const target = isPhone ? digitsOnly : trimmed;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const sep = isIOS ? '&' : '?';
    const encoded = encodeURIComponent(smsBody);

    if (isPhone) {
      window.location.href = `sms:${target}${sep}body=${encoded}`;
    } else {
      if (navigator.share) {
        navigator.share({ title: 'Join R@lly', text: smsBody }).catch(() => {});
      } else {
        window.location.href = `sms:${sep}body=${encoded}`;
      }
    }
    toast(`Invite sent for ${trimmed}!`);
  };

  const sourceIcon = (source: UnifiedContact['source']) => {
    switch (source) {
      case 'device': return <Smartphone className="h-3 w-3" />;
      case 'google': return <Cloud className="h-3 w-3" />;
      case 'csv': return <Cloud className="h-3 w-3" />;
    }
  };

  const sourceLabel = (source: UnifiedContact['source']) => {
    switch (source) {
      case 'device': return 'Phone';
      case 'google': return 'Google';
      case 'csv': return 'CSV';
    }
  };

  const selectedCount = selectedIds.size;
  const trimmed = searchQuery.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  const isPhoneQuery = digitsOnly.length >= 10;
  const showQuickAdd = trimmed.length > 0 && filteredContacts.length === 0 && !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold font-montserrat">
            <Users className="h-5 w-5 text-primary" />
            Invite to R@lly
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Search or type a name/number to invite anyone.
          </p>
        </DialogHeader>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 rounded-xl"
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Apple limits contact syncing on web apps. Type any name or number above to send an invite link manually.
          </p>
        </div>

        {/* Quick Add row pinned above scroll */}
        {showQuickAdd && (
          <div className="px-5 pb-2">
            <button
              onClick={handleQuickAdd}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-l-4 border-[#F47A19] bg-[#F47A19]/10 animate-in fade-in duration-500 hover:scale-[1.01] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#F47A19] flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold font-montserrat text-sm text-foreground">
                  {isPhoneQuery ? `R@lly ${trimmed}` : `Invite '${trimmed}' via Text`}
                </p>
                <p className="text-xs text-muted-foreground">Tap to send an invite link</p>
              </div>
            </button>
          </div>
        )}

        <ScrollArea className="flex-1 px-5">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : allContacts.length === 0 && trimmed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2 font-montserrat">Nobody to r@lly?</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-[240px]">
                Type a name or number above, or import your contacts below.
              </p>
              <Collapsible open={importOpen} onOpenChange={setImportOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-xl text-sm text-muted-foreground">
                    Import Options
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${importOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-3 w-full max-w-[200px] mx-auto">
                  <ContactSyncButton />
                  <CSVContactImport />
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : filteredContacts.length === 0 && !showQuickAdd ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Nobody to r@lly matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-1 py-1">
              {filteredContacts.map(contact => {
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
                            contact.name?.charAt(0)?.toUpperCase() || '#'
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-sm truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.phone || contact.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] gap-1 flex-shrink-0">
                      {sourceIcon(contact.source)}
                      {sourceLabel(contact.source)}
                    </Badge>
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

        <div className="px-5 py-4 border-t border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Contacts are only used to help you invite friends. No auto-invites.</span>
          </div>
          <Button
            className="w-full rounded-xl h-12 text-base font-bold bg-[#F47A19] hover:bg-[#F47A19]/90 text-white"
            disabled={selectedCount === 0 || isSending}
            onClick={handleSendInvites}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {selectedCount > 0
              ? `R@lly ${selectedCount} Contact${selectedCount > 1 ? 's' : ''}`
              : 'Select Contacts to R@lly'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
