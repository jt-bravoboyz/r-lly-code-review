import { useState, useMemo } from 'react';
import { shareContent } from '@/lib/nativeShare';
import { PUBLIC_APP_URL } from '@/lib/appUrl';
import {
  UserPlus,
  Smartphone,
  ClipboardPaste,
  Upload,
  FileUp,
  MessageCircle,
  ChevronDown,
  Search,
  Users,
  Sparkles,
  Phone as PhoneIcon,
} from 'lucide-react';
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

/**
 * Inputs render with a forced 16px font-size to suppress iOS Safari/WKWebView
 * viewport auto-zoom on focus. Applied as inline style as a belt-and-braces
 * guard on top of `text-base`.
 */
const noZoomInputStyle = { fontSize: '16px' } as const;

export function AddPeopleSheet() {
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Two independent search states — one per section.
  const [networkQuery, setNetworkQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');

  // Collapsible open states — default closed for a clean entry surface.
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [phoneListOpen, setPhoneListOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Multi-select tray for phone contacts → batch invite.
  const [selectedPhoneIds, setSelectedPhoneIds] = useState<Set<string>>(new Set());

  const upsertContacts = useUpsertUserContacts();
  const { profile } = useAuth();
  const { data: cloudContacts = [] } = useUserContacts();
  const { data: rallyFriends = [] } = useRallyFriends();
  const isNative = Capacitor.isNativePlatform();

  const referralParam = profile?.id ? `?r=${profile.id}` : '';
  const inviteLink = `${PUBLIC_APP_URL}${referralParam}`;
  const smsBody = `Yo! I'm getting the squad together on R@lly. Use my link to join the inner circle: ${inviteLink}`;

  // --- Network search (R@lly Friends) ---
  const trimmedNetwork = networkQuery.trim();
  const filteredFriends = useMemo(() => {
    if (!trimmedNetwork) return rallyFriends;
    const q = trimmedNetwork.toLowerCase();
    return rallyFriends.filter((f) => f.display_name?.toLowerCase().includes(q));
  }, [rallyFriends, trimmedNetwork]);

  // Quick-Add appears below the network bar when there are no matches at all.
  const networkDigits = trimmedNetwork.replace(/\D/g, '');
  const isNetworkPhoneQuery = networkDigits.length >= 10;
  const networkHasMatch = useMemo(() => {
    if (!trimmedNetwork) return true;
    return filteredFriends.length > 0;
  }, [trimmedNetwork, filteredFriends.length]);
  const showQuickAdd = trimmedNetwork.length > 0 && !networkHasMatch;

  // --- Phone contacts (device + cloud, deduped) ---
  const filteredPhoneContacts = useMemo(() => {
    if (!phoneQuery.trim()) return cloudContacts;
    const q = phoneQuery.trim().toLowerCase();
    return cloudContacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(phoneQuery.trim()) ||
        c.email?.toLowerCase().includes(q),
    );
  }, [cloudContacts, phoneQuery]);

  const handleQuickAdd = () => {
    const target = isNetworkPhoneQuery ? networkDigits : '';
    if (trimmedNetwork) {
      const contactData = isNetworkPhoneQuery
        ? { name: undefined, phone: networkDigits, source: 'manual' }
        : { name: trimmedNetwork, phone: undefined, source: 'manual' };
      upsertContacts.mutate([contactData]);
    }
    if (isNetworkPhoneQuery) {
      openSms(target, smsBody);
    } else {
      shareContent({ title: 'Join R@lly', text: smsBody }).catch(() => {});
    }
    toast(`Invite sent for ${trimmedNetwork}!`);
  };

  const togglePhoneSelection = (id: string) => {
    setSelectedPhoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchInvite = () => {
    const selected = filteredPhoneContacts.filter((c) => selectedPhoneIds.has(c.id));
    if (selected.length === 0) return;
    // Open SMS for first selected (multi-recipient SMS is unreliable across platforms);
    // share-sheet handles bulk on native better.
    const phones = selected.map((c) => c.phone).filter(Boolean) as string[];
    if (phones.length > 0) {
      openSms(phones.join(','), smsBody);
    } else {
      shareContent({ title: 'Join R@lly', text: smsBody }).catch(() => {});
    }
    toast.success(`Invite opened for ${selected.length} contact${selected.length === 1 ? '' : 's'}`);
    setSelectedPhoneIds(new Set());
  };

  const handleNativeContacts = async () => {
    setIsSyncing(true);
    try {
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
          .filter((c) => c.phones?.length || c.emails?.length)
          .map((c) => ({
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
        setPhoneListOpen(true);
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
        setPhoneListOpen(true);
        return;
      }
    } catch (err: any) {
      if (!err.message?.includes('cancelled')) {
        toast.error(err.message || 'Failed to sync contacts');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedCount = selectedPhoneIds.size;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-2 rounded-full">
          <UserPlus className="h-4 w-4" />
          Add People
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-3xl h-[92dvh] bg-background/95 backdrop-blur-2xl border-t border-white/10 p-0 flex flex-col"
      >
        {/* Header — sits below the status bar via safe-top padding */}
        <SheetHeader className="px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3 text-left">
          <SheetTitle className="font-montserrat text-xl tracking-tight">Add People</SheetTitle>
          <p className="text-xs text-muted-foreground font-montserrat">
            Pull your crew into the night
          </p>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 space-y-6">
          {/* ─────────── Section 1 · R@LLY NETWORK ─────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-white/10" />
              <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/70 font-montserrat uppercase">
                R@lly Network
              </p>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {/* Search Bar 1 — friends & members */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search friends & R@lly members…"
                value={networkQuery}
                onChange={(e) => setNetworkQuery(e.target.value)}
                style={noZoomInputStyle}
                className="pl-10 h-12 rounded-2xl bg-white/[0.03] border-white/10 text-base focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/40"
              />
            </div>

            {/* Collapsible · R@lly Friends */}
            <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full h-12 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] active:bg-white/[0.09] transition-colors flex items-center gap-3 group">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium font-montserrat text-foreground flex-1 text-left">
                    R@lly Friends
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                    {filteredFriends.length}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${friendsOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-1.5 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                {filteredFriends.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                    No friends match that search.
                  </p>
                ) : (
                  filteredFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => toast.success(`Selected ${friend.display_name}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold font-montserrat text-sm text-foreground truncate">
                          {friend.display_name || 'R@lly User'}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
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
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Collapsible · Discover on R@lly (DB autocomplete) */}
            <Collapsible open={discoverOpen} onOpenChange={setDiscoverOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full h-12 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] active:bg-white/[0.09] transition-colors flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium font-montserrat text-foreground flex-1 text-left">
                    Discover on R@lly
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${discoverOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <ContactSmartSearch
                  onSelect={(c) => toast.success(`Selected ${c.name || c.phone || c.email}`)}
                  onInvite={(c) => {
                    if (c.phone) openSms(c.phone, smsBody);
                    else if (c.email) openMailto(c.email, { subject: 'Join me on R@lly!', body: smsBody });
                    toast.success(`Invite opened for ${c.name || c.phone || c.email}!`);
                  }}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Quick-Add row — appears only when network search yields nothing */}
            {showQuickAdd && (
              <button
                onClick={handleQuickAdd}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary/12 border border-primary/30 ring-1 ring-primary/20 shadow-[0_4px_24px_-8px_hsl(var(--primary)/0.4)] animate-in fade-in duration-300 active:scale-[0.99] transition-transform"
              >
                <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold font-montserrat text-sm text-foreground truncate">
                    {isNetworkPhoneQuery ? `R@lly ${trimmedNetwork}` : `Invite '${trimmedNetwork}' via Text`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Tap to send an invite link</p>
                </div>
              </button>
            )}
          </section>

          {/* ─────────── Section 2 · YOUR PHONE ─────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-white/10" />
              <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/70 font-montserrat uppercase">
                Your Phone
              </p>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {/* Search Bar 2 — phone book */}
            <div className="relative">
              <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search phone contacts…"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                style={noZoomInputStyle}
                className="pl-10 h-12 rounded-2xl bg-white/[0.03] border-white/10 text-base focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/40"
              />
            </div>

            {/* Sync CTA — primary action for this section */}
            <button
              onClick={handleNativeContacts}
              disabled={isSyncing}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] active:bg-white/[0.09] border border-white/10 transition-colors disabled:opacity-60"
            >
              <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-semibold font-montserrat text-sm text-foreground">
                  {isNative ? 'Sync iPhone Contacts' : 'Pull from Device'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isSyncing ? 'Syncing…' : 'Bring your phone book into R@lly'}
                </p>
              </div>
            </button>

            {/* Collapsible · From Your Phone */}
            <Collapsible open={phoneListOpen} onOpenChange={setPhoneListOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full h-12 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] active:bg-white/[0.09] transition-colors flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium font-montserrat text-foreground flex-1 text-left">
                    From Your Phone
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                    {filteredPhoneContacts.length}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${phoneListOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-1.5 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                {filteredPhoneContacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                    {cloudContacts.length === 0
                      ? 'No contacts synced yet. Tap "Sync iPhone Contacts" above.'
                      : 'No contacts match that search.'}
                  </p>
                ) : (
                  filteredPhoneContacts.slice(0, 100).map((c) => {
                    const selected = selectedPhoneIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => togglePhoneSelection(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                          selected
                            ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30'
                            : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05]'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            selected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {selected ? (
                            <UserPlus className="h-4 w-4" />
                          ) : (
                            <span className="text-sm font-semibold font-montserrat">
                              {(c.name || c.phone || '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-semibold font-montserrat text-sm text-foreground truncate">
                            {c.name || c.phone || c.email}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {c.phone || c.email || ''}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Web-only import paths — entirely hidden on native */}
            {!isNative && (
              <Collapsible open={importOpen} onOpenChange={setImportOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full h-11 px-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors flex items-center gap-3 text-muted-foreground">
                    <FileUp className="h-4 w-4" />
                    <span className="text-xs font-medium font-montserrat flex-1 text-left">
                      Web Import (VCF · Paste · CSV)
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${importOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <Tabs defaultValue="vcf" className="w-full">
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="vcf" className="gap-1 text-xs">
                        <FileUp className="h-3.5 w-3.5" />
                        Card
                      </TabsTrigger>
                      <TabsTrigger value="paste" className="gap-1 text-xs">
                        <ClipboardPaste className="h-3.5 w-3.5" />
                        Paste
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
                </CollapsibleContent>
              </Collapsible>
            )}
          </section>
        </div>

        {/* Sticky batch-invite action bar */}
        {selectedCount > 0 && (
          <div className="sticky bottom-0 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-background/90 backdrop-blur-xl border-t border-white/10 animate-in slide-in-from-bottom duration-200">
            <Button
              onClick={handleBatchInvite}
              className="w-full h-12 rounded-2xl gap-2 font-semibold font-montserrat"
            >
              <MessageCircle className="h-4 w-4" />
              R@lly {selectedCount} {selectedCount === 1 ? 'Contact' : 'Contacts'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
