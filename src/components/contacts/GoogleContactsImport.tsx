import { useState } from 'react';
import { Chrome, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpsertUserContacts } from '@/hooks/useUserContacts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function GoogleContactsImport() {
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const upsertContacts = useUpsertUserContacts();

  const handleImport = async () => {
    setStatus('importing');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in first');
        setStatus('error');
        return;
      }

      const { data, error } = await supabase.functions.invoke('import-google-contacts', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const contacts = (data?.contacts || []).map((c: any) => ({
        name: c.name || undefined,
        phone: c.phone || undefined,
        email: c.email || undefined,
        source: 'google',
      }));

      if (contacts.length === 0) {
        toast.info('No contacts found in your Google account');
        setStatus('idle');
        return;
      }

      await upsertContacts.mutateAsync(contacts);
      setStatus('success');
      toast.success(`Imported ${contacts.length} contacts from Google!`);
    } catch (err: any) {
      console.error('Google import error:', err);
      setStatus('error');
      toast.error(err.message || 'Failed to import Google contacts. Ensure your Google account is connected.');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 w-full"
      disabled={status === 'importing'}
      onClick={handleImport}
    >
      {status === 'importing' ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Importing...
        </>
      ) : status === 'success' ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          Imported
        </>
      ) : status === 'error' ? (
        <>
          <AlertCircle className="h-4 w-4 text-destructive" />
          Retry Google
        </>
      ) : (
        <>
          <Chrome className="h-4 w-4" />
          Import from Google
        </>
      )}
    </Button>
  );
}
