import { useState } from 'react';
import { UserPlus, Smartphone, ClipboardPaste, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartPasteContacts } from './SmartPasteContacts';
import { CSVContactImport } from './CSVContactImport';
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

      // Fallback: device picker not available
      toast.info('Device contact picker not available on this browser. Use Quick Paste or CSV instead!');
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
      <SheetContent side="bottom" className="rounded-t-3xl h-[75vh]">
        <SheetHeader className="pb-2">
          <SheetTitle className="font-montserrat text-lg">Add People</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
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

          {/* Tabs for paste and CSV */}
          <Tabs defaultValue="paste" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="paste" className="gap-1.5 text-xs">
                <ClipboardPaste className="h-3.5 w-3.5" />
                Quick Paste
              </TabsTrigger>
              <TabsTrigger value="csv" className="gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" />
                CSV Upload
              </TabsTrigger>
            </TabsList>
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
