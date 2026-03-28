import { useState, useMemo } from 'react';
import { Search, User, Phone, Mail, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserContacts, UserContact } from '@/hooks/useUserContacts';

interface ContactSmartSearchProps {
  onSelect?: (contact: UserContact) => void;
  onInvite?: (contact: UserContact) => void;
}

export function ContactSmartSearch({ onSelect, onInvite }: ContactSmartSearchProps) {
  const [query, setQuery] = useState('');
  const { data: contacts = [] } = useUserContacts();

  const filtered = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return contacts
      .filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, contacts]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your contacts…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length > 0 && (
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-1 pr-2">
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left group"
                onClick={() => onSelect?.(c)}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name || 'Unknown'}</p>
                  <div className="flex items-center gap-1.5">
                    {c.phone && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Phone className="h-2.5 w-2.5" />
                        {c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Mail className="h-2.5 w-2.5" />
                        {c.email}
                      </span>
                    )}
                  </div>
                </div>
                {onInvite && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInvite(c);
                    }}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Invite
                  </Button>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {query.length >= 2 && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">
          No matching contacts found
        </p>
      )}
    </div>
  );
}
