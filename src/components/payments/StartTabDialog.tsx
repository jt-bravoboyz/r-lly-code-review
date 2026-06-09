import { useEffect, useMemo, useRef, useState } from 'react';
import { copyToClipboard } from '@/lib/nativeShare';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Camera, ImageIcon, X, Mail, Phone, UserPlus, ArrowLeft, Plus, Trash2, ReceiptText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

interface GuestTarget { id: string; display_name: string; email?: string; phone?: string; }
interface FriendPick { profile_id: string; display_name: string; avatar_url?: string | null; }
interface LineItem { id: string; description: string; quantity: number; unit_price_cents: number; parsed_confidence?: number; }

type Step = 'capture' | 'parsing' | 'review' | 'people' | 'links' | 'manual';

const dollarsToCents = (s: string) => Math.round((parseFloat(s) || 0) * 100);
const centsToDollars = (c: number) => (c / 100).toFixed(2);

export function StartTabDialog({ open, onOpenChange, onCreated }: Props) {
  const { profile } = useAuth();
  const [step, setStep] = useState<Step>('capture');

  // Photo
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptSignedUrl, setReceiptSignedUrl] = useState<string | null>(null);
  const [receiptStoragePath, setReceiptStoragePath] = useState<string | null>(null);

  // Review (itemized)
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [taxDollars, setTaxDollars] = useState('');
  const [tipDollars, setTipDollars] = useState('');
  const [note, setNote] = useState('');

  // Manual fallback (quick mode)
  const [manualTotal, setManualTotal] = useState('');

  // People
  const [friends, setFriends] = useState<FriendPick[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [guests, setGuests] = useState<GuestTarget[]>([]);

  const [busy, setBusy] = useState(false);
  const [createdLinks, setCreatedLinks] = useState<{ display_name: string; url: string; amount_cents: number }[] | null>(null);
  const lockRef = useRef(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    setStep('capture');
    setReceiptPreviewUrl(null); setReceiptSignedUrl(null); setReceiptStoragePath(null);
    setTitle(''); setItems([]); setTaxDollars(''); setTipDollars(''); setNote('');
    setManualTotal('');
    setSelectedFriendIds(new Set()); setGuests([]);
    setBusy(false); setCreatedLinks(null);
    lockRef.current = false;
  };

  useEffect(() => { if (!open) resetAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);

  useEffect(() => {
    if (!open || !profile?.id) return;
    supabase.rpc('get_recently_friended', { p_profile_id: profile.id, p_limit: 50 })
      .then(({ data }) => {
        setFriends((data ?? []).map((f: any) => ({
          profile_id: f.profile_id, display_name: f.display_name, avatar_url: f.avatar_url,
        })));
      });
  }, [open, profile?.id]);

  const subtotalCents = useMemo(
    () => items.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0),
    [items]
  );
  const taxCents = dollarsToCents(taxDollars);
  const tipCents = dollarsToCents(tipDollars);
  const itemizedTotalCents = subtotalCents + taxCents + tipCents;
  const totalParticipants = selectedFriendIds.size + guests.length;

  // ===== Photo handling =====
  const handleFile = async (file: File) => {
    if (!profile?.id) return;
    if (!file.type.startsWith('image/')) return toast.error('Please pick an image');
    if (file.size > 10 * 1024 * 1024) return toast.error('Image must be under 10MB');

    if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    const preview = URL.createObjectURL(file);
    setReceiptPreviewUrl(preview);
    setStep('parsing');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to upload a receipt');
        setStep('capture');
        return;
      }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/tabs/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      setReceiptStoragePath(path);

      const { data: signed, error: signErr } = await supabase.storage
        .from('receipts').createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signErr || !signed) throw signErr ?? new Error('sign_failed');
      setReceiptSignedUrl(signed.signedUrl);

      const { data, error } = await supabase.functions.invoke('parse-receipt', {
        body: { image_url: signed.signedUrl },
      });
      if (error) throw error;
      const parsedItems = (data?.items ?? []) as Array<{ description: string; quantity: number; unit_price_cents: number; confidence?: number }>;
      const parsedTaxCents: number = data?.tax_cents ?? 0;
      const parsedTipCents: number = data?.tip_cents ?? 0;
      const parsedMerchant: string | undefined = data?.merchant;

      setItems(parsedItems.map((it) => ({
        id: crypto.randomUUID(),
        description: it.description || 'Item',
        quantity: Math.max(1, it.quantity || 1),
        unit_price_cents: Math.max(0, it.unit_price_cents || 0),
        parsed_confidence: it.confidence,
      })));
      if (parsedTaxCents > 0) setTaxDollars((parsedTaxCents / 100).toFixed(2));
      if (parsedTipCents > 0) setTipDollars((parsedTipCents / 100).toFixed(2));
      if (parsedMerchant && !title) setTitle(parsedMerchant);
      setStep('review');
    } catch (e: any) {
      console.error('parse-receipt failed', e);
      toast.error('Could not read receipt', { description: 'You can still add items manually.' });
      setStep('review');
    }
  };

  // ===== Item editing =====
  const addItem = () => setItems((xs) => [...xs, { id: crypto.randomUUID(), description: '', quantity: 1, unit_price_cents: 0 }]);
  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems((xs) => xs.map((x) => x.id === id ? { ...x, ...patch } : x));
  const removeItem = (id: string) => setItems((xs) => xs.filter((x) => x.id !== id));

  // ===== Guests/friends =====
  const toggleFriend = (id: string) => {
    const next = new Set(selectedFriendIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedFriendIds(next);
  };
  const addGuest = () => setGuests((g) => [...g, { id: crypto.randomUUID(), display_name: '', email: '', phone: '' }]);
  const updateGuest = (id: string, patch: Partial<GuestTarget>) =>
    setGuests((g) => g.map((x) => x.id === id ? { ...x, ...patch } : x));
  const removeGuest = (id: string) => setGuests((g) => g.filter((x) => x.id !== id));

  // ===== Submit =====
  const submitItemized = async () => {
    if (lockRef.current) return;
    if (!title.trim()) return toast.error('Give your tab a title');
    if (items.length === 0) return toast.error('Add at least one item');
    if (subtotalCents <= 0) return toast.error('Items must total more than $0');
    if (selectedFriendIds.size < 1) return toast.error('Add at least one R@lly friend');

    lockRef.current = true; setBusy(true);
    try {
      const cleanItems = items
        .map((it) => ({ description: it.description.trim() || 'Item', quantity: it.quantity, unit_price_cents: it.unit_price_cents, parsed_confidence: it.parsed_confidence }))
        .filter((it) => it.quantity > 0 && it.unit_price_cents >= 0);
      const { data, error } = await supabase.functions.invoke('request-split-check', {
        body: {
          context: 'standalone',
          event_id: null,
          title: title.trim(),
          mode: 'itemized',
          target_profile_ids: Array.from(selectedFriendIds),
          guest_targets: [],
          note: note.trim() || undefined,
          items: cleanItems,
          subtotal_cents: subtotalCents,
          tax_cents: taxCents,
          tip_cents: tipCents,
          receipt_image_url: receiptSignedUrl ?? undefined,
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
      toast.success('Tab started — your crew can claim their items');
      onCreated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to start tab');
    } finally {
      setBusy(false); lockRef.current = false;
    }
  };

  const submitManual = async () => {
    if (lockRef.current) return;
    const totalCents = dollarsToCents(manualTotal);
    if (!title.trim()) return toast.error('Give your tab a title');
    if (totalCents <= 0) return toast.error('Enter a total');
    if (totalParticipants < 1) return toast.error('Add at least one person');
    const cleanGuests = guests
      .map((g) => ({ ...g, display_name: g.display_name.trim(), email: g.email?.trim() || undefined, phone: g.phone?.trim() || undefined }))
      .filter((g) => g.display_name.length > 0);
    if (cleanGuests.length !== guests.length) return toast.error('Every guest needs a name');
    for (const g of cleanGuests) {
      if (!g.email && !g.phone) return toast.error(`Add email or phone for ${g.display_name}`);
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
        setCreatedLinks(links); setStep('links');
      } else {
        onCreated?.(); onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to start tab');
    } finally {
      setBusy(false); lockRef.current = false;
    }
  };

  const copyLink = async (url: string) => {
    try { await copyToClipboard(url); toast.success('Link copied'); }
    catch { toast.error('Copy failed'); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-3xl border-t border-border/60 bg-background max-h-[92dvh] flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-2 text-left">
          <SheetTitle className="flex items-center gap-2 font-montserrat">
            {(step === 'review' || step === 'people' || step === 'manual') && (
              <button onClick={() => setStep('capture')} className="-ml-1 p-1 rounded-full hover:bg-muted">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            Start a R<span className="text-primary" style={{ display: 'inline-block' }}>@</span>lly Tab
          </SheetTitle>
          <SheetDescription>
            {step === 'capture' && 'Snap your receipt — we split it line by line.'}
            {step === 'parsing' && 'Reading your receipt…'}
            {step === 'review' && 'Confirm the line items, tax and tip.'}
            {step === 'people' && 'Pick who claims items from this tab.'}
            {step === 'manual' && 'Quick split — divide a total evenly.'}
            {step === 'links' && 'Send these pay links to your guests:'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">


        {step === 'capture' && (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 backdrop-blur-xl p-6 flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-3">
                <ReceiptText className="h-8 w-8 text-primary" />
              </div>
              <div className="font-bold text-base mb-1">Snap the receipt</div>
              <div className="text-xs text-muted-foreground mb-4">We'll auto-extract every line so your crew claims exactly what they ordered.</div>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button onClick={() => cameraInputRef.current?.click()} className="h-12 rounded-xl font-semibold">
                  <Camera className="h-4 w-4 mr-1.5" /> Snap
                </Button>
                <Button variant="outline" onClick={() => galleryInputRef.current?.click()} className="h-12 rounded-xl font-semibold">
                  <ImageIcon className="h-4 w-4 mr-1.5" /> Upload
                </Button>
              </div>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <button
              type="button"
              onClick={() => setStep('manual')}
              className="block w-full text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground py-2"
            >
              Skip photo and split equally instead
            </button>
          </div>
        )}

        {step === 'parsing' && (
          <div className="py-10 flex flex-col items-center text-center space-y-3">
            {receiptPreviewUrl && (
              <img src={receiptPreviewUrl} alt="Receipt" className="h-32 w-32 object-cover rounded-xl border border-border/60" />
            )}
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">Reading your receipt…</div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 py-2">
            {receiptPreviewUrl && (
              <div className="flex items-center gap-3 p-2 rounded-xl border border-border/60 bg-card/50">
                <img src={receiptPreviewUrl} alt="Receipt" className="h-14 w-14 object-cover rounded-lg" />
                <div className="text-xs text-muted-foreground flex-1">Receipt attached. Edit anything below.</div>
                <Button size="sm" variant="ghost" onClick={() => { setStep('capture'); setItems([]); setReceiptSignedUrl(null); }}>
                  Retake
                </Button>
              </div>
            )}

            <div>
              <Label htmlFor="tab-title">Tab name</Label>
              <Input id="tab-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sushi night" maxLength={120} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Line items</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-7 px-2">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-1.5">
                {items.length === 0 && (
                  <div className="text-xs text-muted-foreground rounded-xl border border-dashed border-border/60 p-3 text-center">
                    No items yet — tap "Add" to enter one.
                  </div>
                )}
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-1.5 rounded-xl border border-border/60 p-2 bg-muted/20">
                    <Input value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })}
                      placeholder="Item" className="h-9 flex-1 text-sm" maxLength={80} />
                    <Input value={String(it.quantity)} onChange={(e) => updateItem(it.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      type="number" inputMode="numeric" min="1" className="h-9 w-12 text-sm text-center" />
                    <Input value={(it.unit_price_cents / 100).toFixed(2)}
                      onChange={(e) => updateItem(it.id, { unit_price_cents: dollarsToCents(e.target.value) })}
                      type="number" inputMode="decimal" step="0.01" min="0" className="h-9 w-20 text-sm text-right" />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeItem(it.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tax">Tax ($)</Label>
                <Input id="tax" value={taxDollars} onChange={(e) => setTaxDollars(e.target.value)}
                  type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" className="h-10" />
              </div>
              <div>
                <Label htmlFor="tip">Tip ($)</Label>
                <Input id="tip" value={tipDollars} onChange={(e) => setTipDollars(e.target.value)}
                  type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" className="h-10" />
              </div>
            </div>

            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">${centsToDollars(subtotalCents)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax (prorated by items)</span><span className="tabular-nums">${centsToDollars(taxCents)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tip (even by headcount)</span><span className="tabular-nums">${centsToDollars(tipCents)}</span></div>
              <div className="flex justify-between font-bold pt-1 border-t border-primary/20"><span>Total</span><span className="tabular-nums">${centsToDollars(itemizedTotalCents)}</span></div>
            </div>

            <Button onClick={() => setStep('people')} disabled={items.length === 0 || subtotalCents <= 0 || !title.trim()}
              className="w-full rounded-full h-11 font-semibold">
              Next — pick who's on this tab
            </Button>
          </div>
        )}

        {step === 'people' && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
              Itemized tabs require R@lly friends so they can claim line items. For non-R@lly guests, use <button className="underline" onClick={() => setStep('manual')}>quick split</button>.
            </div>

            <div>
              <Label>Friends on R@lly</Label>
              <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/40">
                {friends.length === 0 && (
                  <div className="text-xs text-muted-foreground p-3">No friends yet — add some, then start a tab.</div>
                )}
                {friends.map((f) => (
                  <button key={f.profile_id} type="button" onClick={() => toggleFriend(f.profile_id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition min-h-[44px]">
                    <span className="text-sm font-medium">{f.display_name}</span>
                    <span className={`h-5 w-5 rounded-full border-2 ${selectedFriendIds.has(f.profile_id) ? 'bg-primary border-primary' : 'border-border'}`} />
                  </button>
                ))}
              </div>
              {selectedFriendIds.size > 0 && tipCents > 0 && (
                <div className="text-xs text-muted-foreground mt-1.5">
                  Headcount: {selectedFriendIds.size} · Even tip share ≈ ${centsToDollars(Math.round(tipCents / selectedFriendIds.size))} each
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="tab-note">Note (optional)</Label>
              <Textarea id="tab-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={400} />
            </div>

            <Button onClick={submitItemized} disabled={busy || selectedFriendIds.size === 0}
              className="w-full rounded-full h-11 font-semibold">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start tab'}
            </Button>
          </div>
        )}

        {step === 'manual' && (
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="m-title">Tab name</Label>
              <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sushi night" maxLength={120} />
            </div>
            <div>
              <Label htmlFor="m-total">Total ($)</Label>
              <Input id="m-total" type="number" inputMode="decimal" step="0.01" min="0"
                value={manualTotal} onChange={(e) => setManualTotal(e.target.value)} placeholder="0.00" />
              {totalParticipants > 0 && dollarsToCents(manualTotal) > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  ${centsToDollars(dollarsToCents(manualTotal) / totalParticipants)} per person · {totalParticipants} {totalParticipants === 1 ? 'person' : 'people'}
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
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition min-h-[44px]">
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
              <Label htmlFor="m-note">Note (optional)</Label>
              <Textarea id="m-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={400} />
            </div>

            <Button onClick={submitManual} disabled={busy} className="w-full rounded-full h-11 font-semibold">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start tab'}
            </Button>
            <button type="button" onClick={() => setStep('capture')}
              className="block w-full text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Actually, let me snap the receipt
            </button>
          </div>
        )}

        {step === 'links' && createdLinks && (
          <div className="space-y-3 py-2">
            {createdLinks.map((l) => (
              <div key={l.url} className="rounded-xl border border-border/60 p-3 bg-card/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold">{l.display_name}</div>
                  <div className="text-sm font-bold tabular-nums">${centsToDollars(l.amount_cents)}</div>
                </div>
                <div className="text-xs text-muted-foreground truncate mb-2">{l.url}</div>
                <Button size="sm" variant="outline" className="w-full rounded-full" onClick={() => copyLink(l.url)}>
                  Copy link
                </Button>
              </div>
            ))}
            <Button onClick={() => { onCreated?.(); onOpenChange(false); }} className="w-full rounded-full">Done</Button>
          </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
