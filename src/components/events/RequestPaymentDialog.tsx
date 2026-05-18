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
      setReviewConfirmed(false);
      setTab('quick');
      sendLockRef.current = false;
    }
  }, [open]);

  const totalCentsQuick = Math.round((parseFloat(totalDollars) || 0) * 100);
  const perShareQuick = selected.size > 0 ? Math.ceil(totalCentsQuick / selected.size) : 0;

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

  const AttendeePicker = (
    <div className="space-y-1.5">
      <Label>Split with</Label>
      <ScrollArea className="h-32 rounded-md border p-2">
        {attendees.map(a => (
          <label key={a.profile_id} className="flex items-center gap-2 py-1 text-sm">
            <Checkbox checked={selected.has(a.profile_id)} onCheckedChange={() => toggle(a.profile_id)} />
            {a.display_name ?? a.profile_id.slice(0, 8)}
          </label>
        ))}
        {!attendees.length && <p className="text-xs text-muted-foreground">No attendees yet.</p>}
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
