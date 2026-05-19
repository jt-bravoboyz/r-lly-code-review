import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, X, Mail, Phone, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

interface GuestTarget {
  id: string;
  display_name: string;
  email?: string;
  phone?: string;
}

interface FriendPick { profile_id: string; display_name: string; avatar_url?: string | null; }

export function StartTabDialog({ open, onOpenChange, onCreated }: Props) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [totalDollars, setTotalDollars] = useState('');
  const [note, setNote] = useState('');
  const [friends, setFriends] = useState<FriendPick[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [guests, setGuests] = useState<GuestTarget[]>([]);
  const [busy, setBusy] = useState(false);
  const [createdLinks, setCreatedLinks] = useState<{ display_name: string; url: string; amount_cents: number }[] | null>(null);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setTitle(''); setTotalDollars(''); setNote('');
      setSelectedFriendIds(new Set()); setGuests([]);
      setBusy(false); setCreatedLinks(null);
      lockRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !profile?.id) return;
    // Pull accepted friends
    supabase.rpc('get_recently_friended', { p_profile_id: profile.id, p_limit: 25 })
      .then(({ data }) => {
        setFriends((data ?? []).map((f: any) => ({
          profile_id: f.profile_id, display_name: f.display_name, avatar_url: f.avatar_url,
        })));
      });
  }, [open, profile?.id]);

  const totalCents = Math.round((parseFloat(totalDollars) || 0) * 100);
  const totalParticipants = selectedFriendIds.size + guests.length;
  const perShareCents = totalParticipants > 0 ? Math.ceil(totalCents / totalParticipants) : 0;

  const toggleFriend = (id: string) => {
    const next = new Set(selectedFriendIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedFriendIds(next);
  };

  const addGuest = () => {
    setGuests((g) => [...g, { id: crypto.randomUUID(), display_name: '', email: '', phone: '' }]);
  };
  const updateGuest = (id: string, patch: Partial<GuestTarget>) => {
    setGuests((g) => g.map((x) => x.id === id ? { ...x, ...patch } : x));
  };
  const removeGuest = (id: string) => setGuests((g) => g.filter((x) => x.id !== id));

  const submit = async () => {
    if (lockRef.current) return;
    if (!title.trim()) return toast.error('Give your tab a title');
    if (totalCents <= 0) return toast.error('Enter a total');
    if (totalParticipants < 1) return toast.error('Add at least one person');
    const cleanGuests = guests
      .map((g) => ({ ...g, display_name: g.display_name.trim(), email: g.email?.trim() || undefined, phone: g.phone?.trim() || undefined }))
      .filter((g) => g.display_name.length > 0);
    if (cleanGuests.length !== guests.length) {
      return toast.error('Every guest needs a name');
    }
    for (const g of cleanGuests) {
      if (!g.email && !g.phone) {
        return toast.error(`Add email or phone for ${g.display_name}`);
      }
    }

    lockRef.current = true; setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-split-check', {
        body: {
          context: 'standalone',
          event_id: null,
          title: title.trim(),
          mode: 'quick',
          total_cents: totalCents,
          target_profile_ids: Array.from(selectedFriendIds),
          guest_targets: cleanGuests.map((g) => ({ display_name: g.display_name, email: g.email, phone: g.phone })),
          note: note.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === 'payouts_not_enabled') {
          toast.error('Enable payouts first', { description: 'Connect your payout account from Profile → Payments.' });
          return;
        }
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to start tab');
      }
      toast.success('Tab started');
      const links = (data?.guest_links ?? []) as { display_name: string; url: string; amount_cents: number }[];
      if (links.length) {
        setCreatedLinks(links);
      } else {
        onCreated?.();
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to start tab');
    } finally {
      setBusy(false); lockRef.current = false;
    }
  };

  const copyLink = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast.success('Link copied'); }
    catch { toast.error('Copy failed'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a R@lly Tab</DialogTitle>
          <DialogDescription>Split a check with friends — no event needed.</DialogDescription>
        </DialogHeader>

        {createdLinks ? (
          <div className="space-y-3 py-2">
            <div className="text-sm text-muted-foreground">Send these pay links to your guests:</div>
            {createdLinks.map((l) => (
              <div key={l.url} className="rounded-xl border border-border/60 p-3 bg-card/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold">{l.display_name}</div>
                  <div className="text-sm font-bold tabular-nums">${(l.amount_cents / 100).toFixed(2)}</div>
                </div>
                <div className="text-xs text-muted-foreground truncate mb-2">{l.url}</div>
                <Button size="sm" variant="outline" className="w-full rounded-full" onClick={() => copyLink(l.url)}>
                  Copy link
                </Button>
              </div>
            ))}
            <Button onClick={() => { onCreated?.(); onOpenChange(false); }} className="w-full rounded-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="tab-title">Tab name</Label>
              <Input id="tab-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sushi night" maxLength={120} />
            </div>
            <div>
              <Label htmlFor="tab-total">Total ($)</Label>
              <Input id="tab-total" type="number" inputMode="decimal" step="0.01" min="0"
                value={totalDollars} onChange={(e) => setTotalDollars(e.target.value)} placeholder="0.00" />
              {totalParticipants > 0 && totalCents > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  ${((totalCents / 100) / totalParticipants).toFixed(2)} per person · {totalParticipants} {totalParticipants === 1 ? 'person' : 'people'}
                </div>
              )}
            </div>

            <div>
              <Label>Friends on R@lly</Label>
              <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/40">
                {friends.length === 0 && (
                  <div className="text-xs text-muted-foreground p-3">No friends yet — add guests below.</div>
                )}
                {friends.map((f) => (
                  <button key={f.profile_id} type="button" onClick={() => toggleFriend(f.profile_id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition">
                    <span className="text-sm font-medium">{f.display_name}</span>
                    <span className={`h-5 w-5 rounded-full border-2 ${selectedFriendIds.has(f.profile_id) ? 'bg-primary border-primary' : 'border-border'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Guests (no R@lly account)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addGuest} className="h-7 px-2">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {guests.map((g) => (
                  <div key={g.id} className="rounded-xl border border-border/60 p-2.5 space-y-2 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Input value={g.display_name} onChange={(e) => updateGuest(g.id, { display_name: e.target.value })}
                        placeholder="Name" className="h-9" maxLength={80} />
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeGuest(g.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={g.email ?? ''} onChange={(e) => updateGuest(g.id, { email: e.target.value })}
                          type="email" placeholder="email" className="h-9 pl-8 text-sm" />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={g.phone ?? ''} onChange={(e) => updateGuest(g.id, { phone: e.target.value })}
                          type="tel" placeholder="phone" className="h-9 pl-8 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="tab-note">Note (optional)</Label>
              <Textarea id="tab-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={400} />
            </div>

            <Button onClick={submit} disabled={busy} className="w-full rounded-full h-11 font-semibold">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start tab'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
