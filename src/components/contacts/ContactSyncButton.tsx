import { useState } from 'react';
import { Users, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSyncContacts } from '@/hooks/usePhoneContacts';
import { toast } from 'sonner';
import { Contacts, PermissionStatus } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';

interface DeviceContact {
  phone: string;
  name: string;
}

async function requestContactsPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  // Check if running on native platform
  if (!Capacitor.isNativePlatform()) {
    // For web, check if Contact Picker API is available
    if ('contacts' in navigator && 'ContactsManager' in window) {
      return 'granted';
    }
    return 'prompt';
  }

  // Use Capacitor Contacts plugin for native
  try {
    const permissionStatus = await Contacts.requestPermissions();
    if (permissionStatus.contacts === 'granted') {
      return 'granted';
    } else if (permissionStatus.contacts === 'denied') {
      return 'denied';
    }
    return 'prompt';
  } catch (error) {
    console.error('Permission request error:', error);
    return 'denied';
  }
}

async function getDeviceContacts(): Promise<DeviceContact[]> {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    // Use Capacitor Contacts plugin for native iOS/Android
    try {
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
        },
      });

      const contacts: DeviceContact[] = [];
      
      for (const contact of result.contacts) {
        if (contact.phones && contact.phones.length > 0) {
          // Get the first phone number
          const phone = contact.phones[0].number;
          if (phone) {
            contacts.push({
              name: contact.name?.display || contact.name?.given || 'Unknown',
              phone: phone,
            });
          }
        }
      }
      
      return contacts;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw new Error('Failed to access contacts');
    }
  }
  
  // For web, check if Contact Picker API is available
  if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const contacts = await (navigator as any).contacts.select(props, opts);
      
      return contacts
        .map((c: any) => ({
          name: c.name?.[0] || 'Unknown',
          phone: c.tel?.[0] || '',
        }))
        .filter((c: DeviceContact) => c.phone);
    } catch (err) {
      throw new Error('Contact selection cancelled');
    }
  }
  
  throw new Error('Contact sync is only available on mobile. Download the R@lly app for full access!');
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
        toast.error('Contact access denied. Please enable in your device settings.');
        setSyncStatus('error');
        setIsSyncing(false);
        return;
      }

      const contacts = await getDeviceContacts();
      
      if (contacts.length === 0) {
        toast.info('No contacts with phone numbers found');
        setIsSyncing(false);
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
