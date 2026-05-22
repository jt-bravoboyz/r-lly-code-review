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
        <button
          type="button"
          className="h-12 px-5 bg-[#F47A19] rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#F47A19]/30 active:scale-95 transition-transform inline-flex items-center gap-2 shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Add
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-[3rem] h-[92dvh] bg-white/80 dark:bg-[#121214] backdrop-blur-2xl border-t border-black/[0.08] dark:border-white/15 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.8)] p-0 flex flex-col"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-800 rounded-full" />
        </div>

        {/* Header */}
        <SheetHeader className="px-7 pt-[max(env(safe-area-inset-top),0.5rem)] pb-6 text-left shrink-0">
          <SheetTitle className="font-montserrat text-zinc-900 dark:text-white font-black text-3xl tracking-tighter">
            Add People
          </SheetTitle>
          <p className="text-[#F47A19] font-bold text-sm mt-1 font-montserrat">
            Pull your crew into the night
          </p>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-7 pb-8 space-y-9">
          {/* ─────────── Section 1 · R@LLY NETWORK ─────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F47A19] shadow-[0_0_8px_#F47A19]" />
              <h3 className="text-zinc-600 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] font-montserrat">
                R@lly Network
              </h3>
            </div>

            {/* Search Bar 1 — friends & members */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              <Input
                placeholder="Search friends & members…"
                value={networkQuery}
                onChange={(e) => setNetworkQuery(e.target.value)}
                style={noZoomInputStyle}
                className="pl-11 pr-10 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/10 text-base text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-600 font-bold focus-visible:ring-1 focus-visible:ring-[#F47A19]/50 focus-visible:border-[#F47A19]/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#F47A19] shadow-[0_0_8px_#F47A19] animate-pulse" />
            </div>

            {/* Two-column grid: Friends + Discover triggers */}
            <div className="grid grid-cols-2 gap-3">
              <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full h-16 bg-black/[0.04] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 rounded-[1.25rem] flex items-center justify-between px-4 transition-all active:scale-[0.98] active:bg-black/[0.06] dark:active:bg-white/[0.06]">
                    <div className="text-left min-w-0">
                      <p className="text-zinc-900 dark:text-white font-black text-sm tracking-tight">
                        Friends
                      </p>
                      <p className="text-[#F47A19] font-black text-[9px] uppercase tracking-tight mt-0.5">
                        {filteredFriends.length} Active
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-zinc-500 transition-transform duration-200 shrink-0 ${friendsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </CollapsibleTrigger>
              </Collapsible>

              <Collapsible open={discoverOpen} onOpenChange={setDiscoverOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full h-16 bg-black/[0.04] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/10 rounded-[1.25rem] flex items-center justify-between px-4 transition-all active:scale-[0.98] active:bg-black/[0.06] dark:active:bg-white/[0.06]">
                    <div className="text-left min-w-0 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#F47A19] shrink-0" />
                      <div>
                        <p className="text-zinc-900 dark:text-white font-black text-sm tracking-tight">
                          Discover
                        </p>
                        <p className="text-zinc-500 font-black text-[9px] uppercase tracking-tight mt-0.5">
                          Explore
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-zinc-500 transition-transform duration-200 shrink-0 ${discoverOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>

            {/* Full-width expanded content for Friends */}
            <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
              <CollapsibleContent className="space-y-1.5 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                {filteredFriends.length === 0 ? (
                  <p className="text-xs text-zinc-500 px-3 py-4 text-center font-semibold">
                    No friends match that search.
                  </p>
                ) : (
                  filteredFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => toast.success(`Selected ${friend.display_name}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="w-11 h-11 rounded-full bg-[#F47A19]/15 ring-1 ring-black/10 dark:ring-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="h-4 w-4 text-[#F47A19]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-bold font-montserrat text-sm text-zinc-900 dark:text-white truncate">
                          {friend.display_name || 'R@lly User'}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
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

            {/* Full-width expanded content for Discover */}
            <Collapsible open={discoverOpen} onOpenChange={setDiscoverOpen}>
              <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
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
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-[#F47A19]/15 to-transparent border border-[#F47A19]/30 shadow-[0_4px_24px_-8px_rgba(244,122,25,0.4)] animate-in fade-in duration-300 active:scale-[0.99] transition-transform"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#F47A19] flex items-center justify-center shrink-0 shadow-lg shadow-[#F47A19]/30">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-black font-montserrat text-sm text-zinc-900 dark:text-white truncate">
                    {isNetworkPhoneQuery ? `R@lly ${trimmedNetwork}` : `Invite '${trimmedNetwork}' via Text`}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-semibold">Tap to send an invite link</p>
                </div>
              </button>
            )}
          </section>

          {/* ─────────── Section 2 · YOUR PHONE ─────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
              <h3 className="text-zinc-600 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] font-montserrat">
                Your Phone
              </h3>
            </div>

            {/* Search Bar 2 — phone book */}
            <div className="relative">
              <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
              <Input
                placeholder="Search phone contacts…"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                style={noZoomInputStyle}
                className="pl-11 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/10 text-base text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-600 font-bold focus-visible:ring-1 focus-visible:ring-[#F47A19]/50 focus-visible:border-[#F47A19]/50"
              />
            </div>

            {/* Premium Sync Hero */}
            <button
              onClick={handleNativeContacts}
              disabled={isSyncing}
              className="group w-full p-5 bg-gradient-to-br from-[#F47A19]/10 to-transparent border border-[#F47A19]/20 rounded-[2rem] flex items-center gap-5 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <div className="w-14 h-14 bg-[#F47A19] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#F47A19]/30 shrink-0 transition-transform group-hover:rotate-6">
                <Smartphone className="h-7 w-7" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-white font-black text-lg tracking-tight font-montserrat">
                  {isNative ? 'Sync iPhone' : 'Sync Contacts'}
                </p>
                <p className="text-zinc-500 text-xs font-semibold tracking-tight truncate">
                  {isSyncing
                    ? 'Syncing…'
                    : cloudContacts.length > 0
                    ? `${cloudContacts.length} ready to invite`
                    : 'Bring your phone book into R@lly'}
                </p>
              </div>
              <div className="bg-white/10 rounded-full p-2 shrink-0">
                <ChevronDown className="w-4 h-4 text-white -rotate-90" />
              </div>
            </button>

            {/* Collapsible · From Your Phone */}
            <Collapsible open={phoneListOpen} onOpenChange={setPhoneListOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full h-14 px-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors flex items-center gap-3">
                  <Users className="h-4 w-4 text-[#F47A19]" />
                  <span className="text-sm font-bold font-montserrat text-white flex-1 text-left">
                    From Your Phone
                  </span>
                  <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-[#F47A19]/15 text-[#F47A19] uppercase tracking-wider">
                    {filteredPhoneContacts.length}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${phoneListOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-1.5 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                {filteredPhoneContacts.length === 0 ? (
                  <p className="text-xs text-zinc-500 px-3 py-4 text-center font-semibold">
                    {cloudContacts.length === 0
                      ? 'No contacts synced yet. Tap "Sync Contacts" above.'
                      : 'No contacts match that search.'}
                  </p>
                ) : (
                  filteredPhoneContacts.slice(0, 100).map((c) => {
                    const selected = selectedPhoneIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => togglePhoneSelection(c.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-[0.99] ${
                          selected
                            ? 'bg-[#F47A19]/10 border-[#F47A19]/40 ring-1 ring-[#F47A19]/40 shadow-[0_4px_20px_-8px_rgba(244,122,25,0.5)]'
                            : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]'
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black ${
                            selected
                              ? 'bg-[#F47A19] text-white shadow-lg shadow-[#F47A19]/30'
                              : 'bg-white/5 text-zinc-400 border border-white/10'
                          }`}
                        >
                          {selected ? (
                            <UserPlus className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-montserrat">
                              {(c.name || c.phone || '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-bold font-montserrat text-sm text-white truncate">
                            {c.name || c.phone || c.email}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate">
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
                  <button className="w-full h-14 px-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors flex items-center gap-3">
                    <FileUp className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-bold font-montserrat text-zinc-300 flex-1 text-left">
                      Web Import
                    </span>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest hidden sm:inline">
                      VCF · Paste · CSV
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${importOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <Tabs defaultValue="vcf" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 bg-white/[0.03] border border-white/10">
                      <TabsTrigger value="vcf" className="gap-1 text-xs font-bold data-[state=active]:bg-[#F47A19] data-[state=active]:text-white">
                        <FileUp className="h-3.5 w-3.5" />
                        Card
                      </TabsTrigger>
                      <TabsTrigger value="paste" className="gap-1 text-xs font-bold data-[state=active]:bg-[#F47A19] data-[state=active]:text-white">
                        <ClipboardPaste className="h-3.5 w-3.5" />
                        Paste
                      </TabsTrigger>
                      <TabsTrigger value="csv" className="gap-1 text-xs font-bold data-[state=active]:bg-[#F47A19] data-[state=active]:text-white">
                        <Upload className="h-3.5 w-3.5" />
                        CSV
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="vcf" className="mt-3">
                      <VCFContactImport onComplete={() => setOpen(false)} />
                      <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                        <strong className="text-zinc-300">iPhone tip:</strong> Open Contacts → tap a contact → Share → save as .vcf → upload here.
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
          <div className="sticky bottom-0 px-7 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] bg-[#121214]/95 backdrop-blur-xl border-t border-white/10 animate-in slide-in-from-bottom duration-200">
            <Button
              onClick={handleBatchInvite}
              className="w-full h-12 rounded-2xl gap-2 font-black font-montserrat uppercase tracking-wider text-sm bg-[#F47A19] hover:bg-[#F47A19]/90 text-white shadow-xl shadow-[#F47A19]/30"
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
