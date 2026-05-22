import { useState, useMemo } from 'react';
import { shareContent } from '@/lib/nativeShare';
import { PUBLIC_APP_URL } from '@/lib/appUrl';
import { UserPlus, Smartphone, ClipboardPaste, Upload, FileUp, MessageCircle, ChevronDown, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SmartPasteContacts } from './SmartPasteContacts';
import { CSVContactImport } from './CSVContactImport';
import { VCFContactImport } from './VCFContactImport';
import { ContactSmartSearch } from './ContactSmartSearch';
import { useUserContacts } from '@/hooks/useUserContacts';
import { useAuth } from '@/hooks/useAuth';
import { useRallyFriends } from '@/hooks/useRallyFriends';
import { Capacitor } from '@capacitor/core';
import { openSms, openMailto } from '@/lib/nativeLinks';
import { Contacts } from '@capacitor-community/contacts';
import { toast } from 'sonner';
import { useUpsertUserContacts } from '@/hooks/useUserContacts';

export function AddPeopleSheet() {
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const upsertContacts = useUpsertUserContacts();
  const { profile } = useAuth();
  const { data: cloudContacts = [] } = useUserContacts();
  const { data: rallyFriends = [] } = useRallyFriends();
  const isNative = Capacitor.isNativePlatform();

  const referralParam = profile?.id ? `?r=${profile.id}` : '';
  const inviteLink = `${PUBLIC_APP_URL}${referralParam}`;
  const smsBody = `Yo! I'm getting the squad together on R@lly. Use my link to join the inner circle: ${inviteLink}`;

  // Quick Add logic
  const trimmed = searchQuery.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  const isPhoneQuery = digitsOnly.length >= 10;

  const hasMatches = useMemo(() => {
    if (!trimmed) return true;
    const q = trimmed.toLowerCase();
    const contactMatch = cloudContacts.some(
      c => c.name?.toLowerCase().includes(q) || c.phone?.includes(trimmed) || c.email?.toLowerCase().includes(q)
    );
    const friendMatch = rallyFriends.some(
      f => f.display_name?.toLowerCase().includes(q)
    );
    return contactMatch || friendMatch;
  }, [cloudContacts, rallyFriends, trimmed]);

  // Filter R@lly Friends by search query
  const filteredFriends = useMemo(() => {
    if (!trimmed) return rallyFriends;
    const q = trimmed.toLowerCase();
    return rallyFriends.filter(f => f.display_name?.toLowerCase().includes(q));
  }, [rallyFriends, trimmed]);

  const showQuickAdd = trimmed.length > 0 && !hasMatches;

  const handleQuickAdd = () => {
    const target = isPhoneQuery ? digitsOnly : '';

    // Smart merge: save contact before opening SMS
    if (trimmed) {
      const contactData = isPhoneQuery
        ? { name: undefined, phone: digitsOnly, source: 'manual' }
        : { name: trimmed, phone: undefined, source: 'manual' };
      upsertContacts.mutate([contactData]);
    }

    if (isPhoneQuery) {
      openSms(target, smsBody);
    } else {
      shareContent({ title: 'Join R@lly', text: smsBody }).catch(() => {});
    }
    toast(`Invite sent for ${trimmed}!`);
  };

  const handleNativeContacts = async () => {
    setIsSyncing(true);
    try {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        const perm = await Contacts.requestPermissions();
        if (perm.contacts !== 'granted') {
          toast.error('Contact access denied. Enable in your device settings.');
          setIsSyncing(false);
          return;
        }

        const result = await Contacts.getContacts({
          projection: { name: true, phones: true, emails: true },
        });

        const contacts = result.contacts
          .filter(c => c.phones?.length || c.emails?.length)
          .map(c => ({
            name: c.name?.display || c.name?.given || undefined,
            phone: c.phones?.[0]?.number || undefined,
            email: c.emails?.[0]?.address || undefined,
            source: 'device',
          }));

        if (contacts.length === 0) {
          toast.info('No contacts with phone numbers or emails found');
          setIsSyncing(false);
          return;
        }

        await upsertContacts.mutateAsync(contacts);
        toast.success(`Synced ${contacts.length} contacts!`);
        setOpen(false);
        return;
      }

      if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
        const props = ['name', 'tel', 'email'];
        const opts = { multiple: true };
        const selected = await (navigator as any).contacts.select(props, opts);

        const contacts = selected
          .filter((c: any) => c.tel?.[0] || c.email?.[0])
          .map((c: any) => ({
            name: c.name?.[0] || undefined,
            phone: c.tel?.[0] || undefined,
            email: c.email?.[0] || undefined,
            source: 'device',
          }));

        if (contacts.length === 0) {
          toast.info('No contacts selected');
          setIsSyncing(false);
          return;
        }

        await upsertContacts.mutateAsync(contacts);
        toast.success(`Added ${contacts.length} contacts!`);
        setOpen(false);
        return;
      }

      // Web fallback: no direct contact API — user can still use the
      // Import Options (VCF / Quick Paste / CSV) shown below.

    } catch (err: any) {
      if (err.message?.includes('cancelled')) {
        // User cancelled — no error
      } else {
        toast.error(err.message || 'Failed to sync contacts');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-2 rounded-full">
          <UserPlus className="h-4 w-4" />
          Add People
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh]">
        <SheetHeader className="pb-2">
          <SheetTitle className="font-montserrat text-lg">Add People</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-80px)] pb-6">
          {/* Local search input — matches ContactSmartSearch styling */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Input
              autoFocus
              placeholder="Search your contacts…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* R@lly Friends section */}
          {filteredFriends.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-montserrat font-semibold text-muted-foreground uppercase tracking-wider px-1">
                R@lly Friends
              </p>
              {filteredFriends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => {
                    toast.success(`Selected ${friend.display_name}`);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <Users className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium font-montserrat text-sm text-foreground truncate">
                      {friend.display_name || 'R@lly User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {friend.isSquadMate && friend.isReferral
                        ? 'Squad Mate · Referred'
                        : friend.isSquadMate
                        ? `Squad Mate${friend.squadSymbols.length > 0 ? ' · ' + friend.squadSymbols[0].squadName : ''}`
                        : friend.isReferral
                        ? 'Referred Friend'
                        : 'R@lly Friend'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick Add row */}
          {showQuickAdd && (
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
          )}




          {/* Collapsed Import Options */}
          <Collapsible open={importOpen} onOpenChange={setImportOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between gap-2 rounded-xl text-sm text-muted-foreground">
                Import Options
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${importOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Cloud contact search */}
              <ContactSmartSearch
                onSelect={(c) => {
                  toast.success(`Selected ${c.name || c.phone || c.email}`);
                }}
                onInvite={(c) => {
                  if (c.phone) {
                    openSms(c.phone, smsBody);
                  } else if (c.email) {
                    openMailto(c.email, { subject: 'Join me on R@lly!', body: smsBody });
                  }
                  toast.success(`Invite opened for ${c.name || c.phone || c.email}!`);
                }}
              />

              {/* Device contacts */}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 rounded-xl"
                onClick={handleNativeContacts}
                disabled={isSyncing}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{isNative ? 'Sync iPhone Contacts' : 'Phone / Computer Contacts'}</p>
                  <p className="text-xs text-muted-foreground">
                    {isSyncing ? 'Syncing…' : 'Pull from your device'}
                  </p>
                </div>
              </Button>

              {/* Web-only import paths: hidden on native (native has direct device sync above) */}
              {!isNative && (
                <Tabs defaultValue="vcf" className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="vcf" className="gap-1 text-xs">
                      <FileUp className="h-3.5 w-3.5" />
                      Contact Card
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="gap-1 text-xs">
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      Quick Paste
                    </TabsTrigger>
                    <TabsTrigger value="csv" className="gap-1 text-xs">
                      <Upload className="h-3.5 w-3.5" />
                      CSV
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="vcf" className="mt-3">
                    <VCFContactImport onComplete={() => setOpen(false)} />
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      <strong>iPhone tip:</strong> Open Contacts → tap a contact → Share → save as .vcf → upload here.
                    </p>
                  </TabsContent>
                  <TabsContent value="paste" className="mt-3">
                    <SmartPasteContacts onComplete={() => setOpen(false)} />
                  </TabsContent>
                  <TabsContent value="csv" className="mt-3">
                    <CSVContactImport />
                  </TabsContent>
                </Tabs>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}
