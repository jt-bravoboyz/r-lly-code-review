import { useState, useMemo } from 'react';
import { ClipboardPaste, Check, X, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUpsertUserContacts } from '@/hooks/useUserContacts';
import { toast } from 'sonner';

interface ParsedContact {
  name?: string;
  phone?: string;
  email?: string;
}

function parseContacts(text: string): ParsedContact[] {
  const contacts: ParsedContact[] = [];
  const seen = new Set<string>();

  // Regex patterns
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  // Name-like pattern: 2+ capitalized words before a phone/email, or standalone lines
  const nameRegex = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gm;

  // Extract all emails
  const emails = text.match(emailRegex) || [];
  emails.forEach(email => {
    const key = email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      contacts.push({ email });
    }
  });

  // Extract all phone numbers
  const phones = text.match(phoneRegex) || [];
  phones.forEach(rawPhone => {
    const digits = rawPhone.replace(/\D/g, '');
    const normalized = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith('1') ? `+${digits}` : rawPhone;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      contacts.push({ phone: normalized });
    }
  });

  // Try line-by-line parsing for structured data (e.g. "John Doe, 555-123-4567, john@x.com")
  const lines = text.split(/\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return;

    const lineEmails = trimmed.match(emailRegex) || [];
    const linePhones = trimmed.match(phoneRegex) || [];

    if (lineEmails.length === 0 && linePhones.length === 0) return;

    // Try to extract a name: text before the first phone/email
    let name: string | undefined;
    const firstMatch = trimmed.search(emailRegex) !== -1 || trimmed.search(phoneRegex) !== -1
      ? Math.min(
          trimmed.search(emailRegex) === -1 ? Infinity : trimmed.search(emailRegex),
          trimmed.search(phoneRegex) === -1 ? Infinity : trimmed.search(phoneRegex)
        )
      : -1;

    if (firstMatch > 2) {
      const candidate = trimmed.substring(0, firstMatch).replace(/[,;:\-|]+$/, '').trim();
      if (candidate.length >= 2 && candidate.length <= 60 && !/^\d/.test(candidate)) {
        name = candidate;
      }
    }

    const email = lineEmails[0]?.toLowerCase();
    const phone = linePhones[0]?.replace(/\D/g, '');
    const phoneNorm = phone ? (phone.length === 10 ? `+1${phone}` : phone.length === 11 && phone.startsWith('1') ? `+${phone}` : linePhones[0]) : undefined;

    // Check if we already have this contact; if so, enrich it
    const existingByEmail = email ? contacts.find(c => c.email?.toLowerCase() === email) : undefined;
    const existingByPhone = phoneNorm ? contacts.find(c => c.phone === phoneNorm) : undefined;

    if (existingByEmail) {
      if (name && !existingByEmail.name) existingByEmail.name = name;
      if (phoneNorm && !existingByEmail.phone) existingByEmail.phone = phoneNorm;
    } else if (existingByPhone) {
      if (name && !existingByPhone.name) existingByPhone.name = name;
      if (email && !existingByPhone.email) existingByPhone.email = email;
    } else if (name && (email || phoneNorm)) {
      // Brand-new contact with a name
      const newContact: ParsedContact = { name };
      if (email) { newContact.email = email; seen.add(email); }
      if (phoneNorm) { newContact.phone = phoneNorm; seen.add(phoneNorm); }
      contacts.push(newContact);
    }
  });

  // De-duplicate by phone+email combo
  const deduped = new Map<string, ParsedContact>();
  contacts.forEach(c => {
    const key = `${c.phone || ''}_${c.email || ''}`;
    const existing = deduped.get(key);
    if (existing) {
      if (c.name && !existing.name) existing.name = c.name;
    } else {
      deduped.set(key, { ...c });
    }
  });

  return Array.from(deduped.values()).filter(c => c.phone || c.email);
}

interface SmartPasteContactsProps {
  onComplete?: () => void;
}

export function SmartPasteContacts({ onComplete }: SmartPasteContactsProps) {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const upsertContacts = useUpsertUserContacts();

  const parsed = useMemo(() => parseContacts(text), [text]);

  const handleSave = async () => {
    if (parsed.length === 0) return;
    setIsSaving(true);
    try {
      await upsertContacts.mutateAsync(
        parsed.map(c => ({ name: c.name, phone: c.phone, email: c.email, source: 'paste' }))
      );
      toast.success(`Added ${parsed.length} contact${parsed.length > 1 ? 's' : ''}!`);
      setText('');
      onComplete?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save contacts');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder={"Paste a list of contacts here…\n\nExamples:\nJohn Doe, 555-123-4567, john@email.com\njane@email.com\n(555) 987-6543"}
        value={text}
        onChange={e => setText(e.target.value)}
        className="min-h-[120px] text-sm"
      />

      {parsed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Found {parsed.length} contact{parsed.length > 1 ? 's' : ''}:
          </p>
          <ScrollArea className="max-h-[200px]">
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

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
            size="sm"
          >
            {isSaving ? 'Saving...' : `Add ${parsed.length} Contact${parsed.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}
