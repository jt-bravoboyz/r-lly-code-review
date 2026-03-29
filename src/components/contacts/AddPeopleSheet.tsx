import { useState } from 'react';
import { PUBLIC_APP_URL } from '@/lib/appUrl';
import { UserPlus, Smartphone, ClipboardPaste, Upload, FileUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartPasteContacts } from './SmartPasteContacts';
import { CSVContactImport } from './CSVContactImport';
import { VCFContactImport } from './VCFContactImport';
import { ContactSmartSearch } from './ContactSmartSearch';
import { useUpsertUserContacts } from '@/hooks/useUserContacts';
import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';
import { toast } from 'sonner';

export function AddPeopleSheet() {
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const upsertContacts = useUpsertUserContacts();

  const handleNativeContacts = async () => {
    setIsSyncing(true);
    try {
      const isNative = Capacitor.isNativePlatform();

      // Tier 1: Capacitor native shell → real contact picker
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

      // Web: try Contact Picker API (Chrome on Android, some desktop browsers)
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

      // Fallback for iOS Safari / unsupported browsers
      toast.info(
        'Apple restricts direct contact access in browsers. Use Contact Card import, Quick Paste, or CSV below!',
        { duration: 5000 }
      );
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
          {/* Smart Search — autofill from existing contacts */}
          <ContactSmartSearch
            onSelect={(c) => {
              toast.success(`Selected ${c.name || c.phone || c.email}`);
            }}
            onInvite={(c) => {
              const contact = c.phone || c.email || '';
              if (c.phone) {
                const message = encodeURIComponent(`Join me on R@lly! 🎉 Download at ${PUBLIC_APP_URL}`);
                window.open(`sms:${c.phone}?body=${message}`, '_blank');
              } else if (c.email) {
                const subject = encodeURIComponent('Join me on R@lly!');
                const body = encodeURIComponent(`Hey!\n\nJoin me on R@lly — the app for planning nights out with friends.\n\n${PUBLIC_APP_URL}\n\nSee you there! 🎉`);
                window.open(`mailto:${c.email}?subject=${subject}&body=${body}`, '_blank');
              }
              toast.success(`Invite opened for ${c.name || contact}!`);
            }}
          />

          {/* Quick action: device contacts */}
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
              <p className="font-medium text-sm">Phone / Computer Contacts</p>
              <p className="text-xs text-muted-foreground">
                {isSyncing ? 'Syncing…' : 'Pull from your device'}
              </p>
            </div>
          </Button>

          {/* Tabs for VCF, paste, and CSV */}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
