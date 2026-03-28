import { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpsertUserContacts } from '@/hooks/useUserContacts';
import { toast } from 'sonner';

interface ParsedContact {
  name?: string;
  phone?: string;
  email?: string;
}

function parseCSV(text: string): ParsedContact[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

  const nameIdx = header.findIndex(h => ['name', 'display_name', 'full name', 'fullname'].includes(h));
  const phoneIdx = header.findIndex(h => ['phone', 'phone_number', 'tel', 'mobile', 'phone number'].includes(h));
  const emailIdx = header.findIndex(h => ['email', 'e-mail', 'email address'].includes(h));

  if (phoneIdx === -1 && emailIdx === -1) return [];

  const contacts: ParsedContact[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
    const contact: ParsedContact = {};
    if (nameIdx >= 0 && cols[nameIdx]) contact.name = cols[nameIdx];
    if (phoneIdx >= 0 && cols[phoneIdx]) contact.phone = cols[phoneIdx];
    if (emailIdx >= 0 && cols[emailIdx]) contact.email = cols[emailIdx];
    if (contact.phone || contact.email) contacts.push(contact);
  }
  return contacts;
}

export function CSVContactImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const upsertContacts = useUpsertUserContacts();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('importing');
    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast.error('No valid contacts found. Ensure your CSV has Name, Phone, or Email columns.');
        setStatus('error');
        return;
      }

      await upsertContacts.mutateAsync(
        parsed.map(c => ({ ...c, source: 'csv' }))
      );

      setStatus('success');
      toast.success(`Imported ${parsed.length} contacts from CSV!`);
    } catch (err: any) {
      setStatus('error');
      toast.error(err.message || 'Failed to import CSV');
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        size="sm"
        className="gap-2 w-full"
        disabled={status === 'importing'}
        onClick={() => fileRef.current?.click()}
      >
        {status === 'importing' ? (
          <>
            <Upload className="h-4 w-4 animate-pulse" />
            Importing...
          </>
        ) : status === 'success' ? (
          <>
            <Check className="h-4 w-4 text-green-500" />
            Imported
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Upload Contacts (.csv)
          </>
        )}
      </Button>
    </>
  );
}
