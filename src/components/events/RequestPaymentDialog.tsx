import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Trash2, AlertCircle, CheckCircle2, Search, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReceiptUploader } from './ReceiptUploader';

interface Attendee { id: string; profile_id: string; display_name?: string; }
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  attendees: Attendee[];
  onSent?: () => void;
}

interface Item { description: string; quantity: number; unit_price_cents: number; confidence?: number; }

export function RequestPaymentDialog({ open, onOpenChange, eventId, attendees, onSent }: Props) {
  const [tab, setTab] = useState<'quick' | 'itemized'>('quick');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [profileMeta, setProfileMeta] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const sendLockRef = useRef(false);
  const lastSendRef = useRef(0);

  // Quick
  const [totalDollars, setTotalDollars] = useState('');

  // Itemized
  const [draftId] = useState(() => crypto.randomUUID());
  const [items, setItems] = useState<Item[]>([]);
  const [subtotal, setSubtotal] = useState('');
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(new Set()); setNote(''); setTotalDollars('');
      setItems([]); setSubtotal(''); setTax(''); setTip(''); setReceiptUrl(null);
      setReviewConfirmed(false); setSearch('');
      setTab('quick');
      sendLockRef.current = false;
    }
  }, [open]);

  // Hydrate avatars + canonical names for attendees from safe_profiles
  useEffect(() => {
    if (!open) return;
    const ids = Array.from(new Set(attendees.map((a) => a.profile_id)));
    if (!ids.length) return;
    supabase.from('safe_profiles').select('id, display_name, avatar_url').in('id', ids)
      .then(({ data }) => {
        setProfileMeta(Object.fromEntries(
          (data ?? []).map((p: any) => [p.id, { name: p.display_name ?? 'Someone', avatar: p.avatar_url ?? null }])
        ));
      });
  }, [open, attendees]);

  const totalCentsQuick = Math.round((parseFloat(totalDollars) || 0) * 100);
  // Host is always counted in the even split (matches backend `splitHeadcount = N + 1`).
  const quickHeadcount = selected.size + 1;
  const perShareQuick = selected.size > 0 ? Math.ceil(totalCentsQuick / quickHeadcount) : 0;

  const itemizedSubtotalCents = useMemo(() => {
    return Math.round((parseFloat(subtotal) || items.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0) / 100) * 100);
  }, [subtotal, items]);

  const toggle = (pid: string) => {
    const next = new Set(selected);
    next.has(pid) ? next.delete(pid) : next.add(pid);
    setSelected(next);
  };

  const handleParsed = (r: any) => {
    setItems(r.items.map((i: any) => ({ ...i, confidence: i.confidence })));
    setSubtotal(((r.subtotal_cents ?? 0) / 100).toString());
    setTax(((r.tax_cents ?? 0) / 100).toString());
    setTip(((r.tip_cents ?? 0) / 100).toString());
    setReceiptUrl(r.image_url);
    setReviewConfirmed(false);
  };

  // Itemized review math — drives the mandatory confirm gate.
  const itemizedTotals = useMemo(() => {
    const sumItems = items.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0);
    const subC = itemizedSubtotalCents || sumItems;
    const taxC = Math.round((parseFloat(tax) || 0) * 100);
    const tipC = Math.round((parseFloat(tip) || 0) * 100);
    const grand = subC + taxC + tipC;
    const itemsVsSubtotalDelta = subC - sumItems;
    return { sumItems, subC, taxC, tipC, grand, itemsVsSubtotalDelta };
  }, [items, itemizedSubtotalCents, tax, tip]);

  const guardedSend = async (fn: () => Promise<void>) => {
    if (sendLockRef.current) return;
    // 4s cooldown against rapid double-tap & accidental re-fires
    const now = Date.now();
    if (now - lastSendRef.current < 4000) return;
    sendLockRef.current = true;
    lastSendRef.current = now;
    setBusy(true);
    try { await fn(); }
    finally { setBusy(false); sendLockRef.current = false; }
  };

  const sendQuick = () => guardedSend(async () => {
    if (selected.size === 0 || totalCentsQuick === 0) { toast.error('Pick attendees and enter a total'); return; }
    const { data, error } = await supabase.functions.invoke('request-split-check', {
      body: {
        event_id: eventId, mode: 'quick',
        target_profile_ids: Array.from(selected),
        total_cents: totalCentsQuick, note: note || undefined,
      },
    });
    if (error || !data?.ok) { toast.error((data as any)?.error ?? 'Failed'); return; }
    toast.success('Split-check sent');
    onSent?.(); onOpenChange(false);
  });

  const sendItemized = () => guardedSend(async () => {
    if (selected.size === 0 || items.length === 0) { toast.error('Pick attendees and add items'); return; }
    if (!reviewConfirmed) { toast.error('Confirm the receipt totals first'); return; }
    const { data, error } = await supabase.functions.invoke('request-split-check', {
      body: {
        event_id: eventId, mode: 'itemized',
        target_profile_ids: Array.from(selected),
        items, subtotal_cents: itemizedSubtotalCents,
        tax_cents: itemizedTotals.taxC,
        tip_cents: itemizedTotals.tipC,
        receipt_image_url: receiptUrl ?? undefined,
        note: note || undefined,
      },
    });
    if (error || !data?.ok) { toast.error((data as any)?.error ?? 'Failed'); return; }
    toast.success('Itemized request sent');
    onSent?.(); onOpenChange(false);
  });

  // Apple-grade attendee picker — avatars, instant search, select all/none.
  const filteredAttendees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter((a) => {
      const meta = profileMeta[a.profile_id];
      const name = (meta?.name ?? a.display_name ?? '').toLowerCase();
      return name.includes(q);
    });
  }, [attendees, profileMeta, search]);

  const allFilteredSelected = filteredAttendees.length > 0 && filteredAttendees.every((a) => selected.has(a.profile_id));
  const toggleAllFiltered = () => {
    const next = new Set(selected);
    if (allFilteredSelected) filteredAttendees.forEach((a) => next.delete(a.profile_id));
    else filteredAttendees.forEach((a) => next.add(a.profile_id));
    setSelected(next);
  };
  const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

  const AttendeePicker = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[12px] font-semibold tracking-tight uppercase text-foreground/80">
          Split with {selected.size > 0 && <span className="text-primary normal-case font-medium">· {selected.size} selected</span>}
        </Label>
        {attendees.length > 0 && (
          <button
            type="button"
            onClick={toggleAllFiltered}
            className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {allFilteredSelected ? 'Select None' : 'Select All'}
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search attendees"
          className="pl-9 h-9 rounded-xl bg-card/60 border-border/60"
        />
      </div>

      <ScrollArea className="h-44 rounded-2xl border border-border/60 bg-card/40 p-1">
        {filteredAttendees.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">
            {attendees.length === 0 ? 'No attendees yet.' : 'No matches.'}
          </p>
        ) : (
          filteredAttendees.map((a) => {
            const meta = profileMeta[a.profile_id];
            const name = meta?.name ?? a.display_name ?? a.profile_id.slice(0, 8);
            const isSel = selected.has(a.profile_id);
            return (
              <button
                key={a.profile_id}
                type="button"
                onClick={() => toggle(a.profile_id)}
                className={[
                  'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all duration-150 min-h-[44px]',
                  'active:scale-[0.99]',
                  isSel ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/40',
                ].join(' ')}
              >
                <Avatar className={['h-9 w-9 shrink-0 ring-2', isSel ? 'ring-primary' : 'ring-background'].join(' ')}>
                  {meta?.avatar && <AvatarImage src={meta.avatar} alt={name} />}
                  <AvatarFallback className="text-[11px] font-semibold">{initials(name)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 min-w-0 truncate text-[14px] font-medium tracking-tight">{name}</span>
                <span
                  className={[
                    'h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all',
                    isSel ? 'bg-primary text-primary-foreground scale-100' : 'border-2 border-border scale-90',
                  ].join(' ')}
                >
                  {isSel && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Request payment</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="quick">Quick Split</TabsTrigger>
            <TabsTrigger value="itemized">Itemized</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-3 mt-3">
            <div>
              <Label htmlFor="total">Total amount</Label>
              <Input id="total" type="number" step="0.01" placeholder="0.00"
                value={totalDollars} onChange={e => setTotalDollars(e.target.value)} />
            </div>
            {AttendeePicker}
            {selected.size > 0 && totalCentsQuick > 0 && (
              <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm">
                Split <strong>${(totalCentsQuick/100).toFixed(2)}</strong> equally between <strong>{selected.size}</strong> {selected.size === 1 ? 'person' : 'people'} = <strong>${(perShareQuick/100).toFixed(2)}</strong> each
              </div>
            )}
            <Textarea placeholder="Note (optional)" rows={2} value={note} onChange={e => setNote(e.target.value)} />
            <Button className="w-full" onClick={sendQuick} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Send Request
            </Button>
          </TabsContent>

          <TabsContent value="itemized" className="space-y-3 mt-3">
            <ReceiptUploader eventId={eventId} draftId={draftId} currentImageUrl={receiptUrl} onParsed={handleParsed} rescan={!!receiptUrl} />
            {items.length > 0 && (() => {
              const lowItems = items.filter((it) => (it.confidence ?? 1) < 0.6);
              if (lowItems.length === 0) return null;
              const avg = items.reduce((s, it) => s + (it.confidence ?? 1), 0) / items.length;
              return (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold tracking-tight text-amber-700 dark:text-amber-400">
                        Low scan confidence on {lowItems.length} item{lowItems.length === 1 ? '' : 's'}
                      </p>
                      <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-snug mt-0.5">
                        Receipt clarity was {Math.round(avg * 100)}%. Retake the photo or edit the flagged rows below before sending.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
            {items.length > 0 && (
              <div className="space-y-1.5">
                <Label>Items</Label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${(it.confidence ?? 1) < 0.6 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <Input className="flex-1" value={it.description} onChange={e => { const n=[...items]; n[idx]={...it,description:e.target.value}; setItems(n); }} />
                      <Input type="number" className="w-14" value={it.quantity}
                        onChange={e => { const n=[...items]; n[idx]={...it,quantity:Math.max(1,parseInt(e.target.value)||1)}; setItems(n); }} />
                      <Input type="number" step="0.01" className="w-20" placeholder="$"
                        value={(it.unit_price_cents/100).toString()}
                        onChange={e => { const n=[...items]; n[idx]={...it,unit_price_cents:Math.round((parseFloat(e.target.value)||0)*100)}; setItems(n); }} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setItems(items.filter((_,i)=>i!==idx))}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Subtotal</Label><Input type="number" step="0.01" value={subtotal} onChange={e => setSubtotal(e.target.value)} /></div>
              <div><Label className="text-xs">Tax</Label><Input type="number" step="0.01" value={tax} onChange={e => setTax(e.target.value)} /></div>
              <div><Label className="text-xs">Tip</Label><Input type="number" step="0.01" value={tip} onChange={e => setTip(e.target.value)} /></div>
            </div>
            {AttendeePicker}
            <Textarea placeholder="Note (optional)" rows={2} value={note} onChange={e => setNote(e.target.value)} />

            {/* Mandatory OCR Review & Confirm gate */}
            {items.length > 0 && (() => {
              const t = itemizedTotals;
              const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
              const itemsMatch = Math.abs(t.itemsVsSubtotalDelta) <= 1; // 1¢ rounding leeway
              return (
                <div className="rounded-2xl border border-border/60 bg-card/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold tracking-tight uppercase text-foreground/80">Review &amp; Confirm</p>
                    {itemsMatch ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Items match subtotal</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600"><AlertCircle className="h-3 w-3" /> {fmt(Math.abs(t.itemsVsSubtotalDelta))} off</span>
                    )}
                  </div>
                  <div className="text-[13px] space-y-0.5 tabular-nums">
                    <div className="flex justify-between"><span className="text-muted-foreground">Items sum</span><span>{fmt(t.sumItems)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal entered</span><span>{fmt(t.subC)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{fmt(t.taxC)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tip</span><span>{fmt(t.tipC)}</span></div>
                    <div className="h-px bg-border/40 my-1" />
                    <div className="flex justify-between font-semibold"><span>Total being requested</span><span className="text-primary">{fmt(t.grand)}</span></div>
                  </div>
                  <label className="flex items-start gap-2 pt-1 cursor-pointer">
                    <Checkbox checked={reviewConfirmed} onCheckedChange={(v) => setReviewConfirmed(!!v)} />
                    <span className="text-[12px] leading-snug text-foreground/80">
                      I've reviewed the line items, subtotal, tax, and tip — these numbers are correct.
                    </span>
                  </label>
                </div>
              );
            })()}

            <Button
              className="w-full"
              onClick={sendItemized}
              disabled={busy || items.length === 0 || !reviewConfirmed || selected.size === 0}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {reviewConfirmed ? 'Send Itemized Request' : 'Confirm review to send'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
