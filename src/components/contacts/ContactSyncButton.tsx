import { useState } from 'react';
import { Users, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSyncContacts } from '@/hooks/usePhoneContacts';
import { toast } from 'sonner';

// Mock function for web - in real native app this would use Capacitor Contacts plugin
async function requestContactsPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  // Check if Contacts API is available (only in some browsers with proper permissions)
  if ('contacts' in navigator && 'ContactsManager' in window) {
    return 'granted';
  }
  return 'prompt';
}

async function getDeviceContacts(): Promise<{ phone: string; name: string }[]> {
  // Check if we're running in a Capacitor native environment
  const isNative = typeof (window as any).Capacitor !== 'undefined';
  
  if (isNative) {
    // In native app, we'd use @capacitor-community/contacts
    // For now, show a message about native-only feature
    throw new Error('Contact sync requires the mobile app');
  }
  
  // For web, check if Contact Picker API is available
  if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const contacts = await (navigator as any).contacts.select(props, opts);
      
      return contacts.map((c: any) => ({
        name: c.name?.[0] || 'Unknown',
        phone: c.tel?.[0] || '',
      })).filter((c: any) => c.phone);
    } catch (err) {
      throw new Error('Contact selection cancelled');
    }
  }
  
  throw new Error('Contact sync is not available in this browser. Try using the mobile app.');
}

export function ContactSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const syncContacts = useSyncContacts();

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      const permission = await requestContactsPermission();
      
      if (permission === 'denied') {
        toast.error('Contact access denied. Please enable in settings.');
        setSyncStatus('error');
        return;
      }

      const contacts = await getDeviceContacts();
      
      if (contacts.length === 0) {
        toast.info('No contacts with phone numbers found');
        return;
      }

      await syncContacts.mutateAsync(contacts);
      setSyncStatus('success');
      toast.success(`Synced ${contacts.length} contacts!`);
    } catch (error: any) {
      console.error('Contact sync error:', error);
      setSyncStatus('error');
      toast.error(error.message || 'Failed to sync contacts');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
      className="gap-2"
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : syncStatus === 'success' ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          Synced
        </>
      ) : syncStatus === 'error' ? (
        <>
          <AlertCircle className="h-4 w-4 text-destructive" />
          Retry Sync
        </>
      ) : (
        <>
          <Users className="h-4 w-4" />
          Sync Contacts
        </>
      )}
    </Button>
  );
}
