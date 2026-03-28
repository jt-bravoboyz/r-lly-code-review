import { useState, useRef } from 'react';
import { FileUp, User, Phone, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUpsertUserContacts } from '@/hooks/useUserContacts';
import { toast } from 'sonner';

interface ParsedVCFContact {
  name?: string;
  phone?: string;
  email?: string;
}

function parseVCF(vcfText: string): ParsedVCFContact[] {
  const contacts: ParsedVCFContact[] = [];
  const cards = vcfText.split('BEGIN:VCARD');

  for (const card of cards) {
    if (!card.includes('END:VCARD')) continue;

    let name: string | undefined;
    let phone: string | undefined;
    let email: string | undefined;

    const lines = card.split(/\r?\n/);
    for (const line of lines) {
      const upper = line.toUpperCase();

      // Full Name
      if (upper.startsWith('FN:') || upper.startsWith('FN;')) {
        const val = line.substring(line.indexOf(':') + 1).trim();
        if (val) name = val;
      }

      // Phone
      if (upper.startsWith('TEL') && !phone) {
        const val = line.substring(line.indexOf(':') + 1).trim();
        if (val) {
          const digits = val.replace(/\D/g, '');
          phone = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith('1') ? `+${digits}` : val;
        }
      }

      // Email
      if (upper.startsWith('EMAIL') && !email) {
        const val = line.substring(line.indexOf(':') + 1).trim();
        if (val && val.includes('@')) email = val.toLowerCase();
      }
    }

    if (phone || email) {
      contacts.push({ name, phone, email });
    }
  }

  return contacts;
}

interface VCFContactImportProps {
  onComplete?: () => void;
}

export function VCFContactImport({ onComplete }: VCFContactImportProps) {
  const [parsed, setParsed] = useState<ParsedVCFContact[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upsertContacts = useUpsertUserContacts();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.vcf') && !file.type.includes('vcard')) {
      toast.error('Please select a .vcf contact card file');
      return;
    }

    try {
      const text = await file.text();
      const contacts = parseVCF(text);
      if (contacts.length === 0) {
        toast.info('No contacts found in this file');
        return;
      }
      setParsed(contacts);
      toast.success(`Found ${contacts.length} contact${contacts.length > 1 ? 's' : ''}!`);
    } catch {
      toast.error('Failed to read contact card');
    }

    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    if (parsed.length === 0) return;
    setIsSaving(true);
    try {
      await upsertContacts.mutateAsync(
        parsed.map(c => ({ name: c.name, phone: c.phone, email: c.email, source: 'vcf' }))
      );
      toast.success(`Added ${parsed.length} contact${parsed.length > 1 ? 's' : ''}!`);
      setParsed([]);
      onComplete?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save contacts');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept=".vcf,text/vcard,text/x-vcard"
        onChange={handleFile}
        className="hidden"
      />

      <Button
        variant="outline"
        className="w-full justify-start gap-3 h-14 rounded-xl"
        onClick={() => fileRef.current?.click()}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <FileUp className="h-5 w-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="font-medium text-sm">Import Contact Card (.vcf)</p>
          <p className="text-xs text-muted-foreground">
            Share a contact from iPhone → upload the .vcf file
          </p>
        </div>
      </Button>

      {parsed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Found {parsed.length} contact{parsed.length > 1 ? 's' : ''}:
          </p>
          <ScrollArea className="max-h-[180px]">
            <div className="space-y-1.5 pr-2">
              {parsed.map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{c.name || 'Unknown'}</span>
                  {c.phone && (
                    <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0">
                      <Phone className="h-2.5 w-2.5" />
                      {c.phone}
                    </Badge>
                  )}
                  {c.email && (
                    <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0">
                      <Mail className="h-2.5 w-2.5" />
                      {c.email}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <Button onClick={handleSave} disabled={isSaving} className="w-full" size="sm">
            <Check className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : `Add ${parsed.length} Contact${parsed.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}
