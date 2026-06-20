import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Minus, Plus, Users, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useHaptics } from '@/hooks/useHaptics';
import { Capacitor } from '@capacitor/core';
import { openExternalLink } from '@/lib/nativeLinks';

interface Props {
  requestId: string;
  profileId: string;
  taxCents?: number;
  tipCents?: number;
  receiptImageUrl?: string | null;
  onChange?: () => void;
  onTotalsChange?: (myCents: number) => void;
  onSubmit?: () => void;
}

interface Claimant {
  profile_id: string;
  qty: number;
  name: string;
  avatar: string | null;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
}

export function ClaimItemsView({ requestId, profileId, taxCents = 0, tipCents = 0, receiptImageUrl = null, onChange, onTotalsChange, onSubmit }: Props) {
  const [showReceipt, setShowReceipt] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [claimsByItem, setClaimsByItem] = useState<Record<string, Claimant[]>>({});
  const [profileCache, setProfileCache] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { triggerHaptic } = useHaptics();

  useEffect(() => {
    (async () => {
      const { data: req } = await supabase.from('split_check_requests').select('host_id').eq('id', requestId).maybeSingle();
      const { data: tgts } = await supabase.from('split_check_targets').select('profile_id, status').eq('request_id', requestId);
      const ids = new Set<string>();
      if (req?.host_id) ids.add(req.host_id);
      (tgts ?? []).forEach((t: any) => { if (t.status !== 'canceled' && t.profile_id) ids.add(t.profile_id); });
      setParticipantIds(Array.from(ids));
    })();
  }, [requestId]);

  const refresh = async () => {
    const { data: it } = await supabase.from('split_check_items').select('*').eq('request_id', requestId).order('line_no');
    setItems(it ?? []);
    const itemIds = (it ?? []).map((i: any) => i.id);
    if (!itemIds.length) { setClaimsByItem({}); return; }
    const { data: cls } = await supabase.from('split_check_item_claims').select('*').in('item_id', itemIds);
    const rows = cls ?? [];

    const needed = Array.from(new Set(rows.map((r: any) => r.profile_id))).filter(id => !profileCache[id]);
    let newCache = profileCache;
    if (needed.length) {
      const { data: profs } = await supabase.from('safe_profiles').select('id, display_name, avatar_url').in('id', needed);
      newCache = { ...profileCache };
      (profs ?? []).forEach((p: any) => {
        newCache[p.id] = { name: p.display_name ?? 'Someone', avatar: p.avatar_url ?? null };
      });
      setProfileCache(newCache);
    }

    const grouped: Record<string, Claimant[]> = {};
    rows.forEach((c: any) => {
      const meta = newCache[c.profile_id] ?? { name: 'Someone', avatar: null };
      (grouped[c.item_id] ||= []).push({
        profile_id: c.profile_id,
        qty: c.quantity_claimed,
        name: meta.name,
        avatar: meta.avatar,
      });
    });
    setClaimsByItem(grouped);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [requestId, profileId]);

  useEffect(() => {
    const ch = supabase.channel(`claim-items-${requestId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_item_claims' }, () => { refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const change = async (itemId: string, delta: number) => {
    const mineRow = (claimsByItem[itemId] ?? []).find(c => c.profile_id === profileId);
    const current = mineRow?.qty ?? 0;
    const next = Math.max(0, current + delta);
    if (next === current) return;
    triggerHaptic('selection');
    if (next === 0) {
      await supabase.from('split_check_item_claims').delete().eq('item_id', itemId).eq('profile_id', profileId);
    } else {
      await supabase.from('split_check_item_claims').upsert({ item_id: itemId, profile_id: profileId, quantity_claimed: next }, { onConflict: 'item_id,profile_id' });
    }
    refresh();
  };

  const shareAll = async (itemId: string, currentlyShared: boolean) => {
    triggerHaptic('selection');
    const { error } = await supabase.rpc('share_split_item', { _item_id: itemId, _share: !currentlyShared });
    if (error) console.error('share_split_item failed', error);
    refresh();
  };


  const { mySubtotalC, grandSubtotalC, claimedSubtotalC, unclaimedSubtotalC, myTaxC, myTipC, myTotalC } = useMemo(() => {
    let mine = 0;
    let grand = 0;
    let claimed = 0;
    items.forEach(it => {
      const lineTotal = it.unit_price_cents * it.quantity;
      grand += lineTotal;
      const claimants = claimsByItem[it.id] ?? [];
      const totalClaimed = claimants.reduce((s, c) => s + c.qty, 0);
      const myQty = claimants.find(c => c.profile_id === profileId)?.qty ?? 0;
      if (totalClaimed > 0 && myQty > 0) {
        mine += Math.round(lineTotal * (myQty / totalClaimed));
      }
      if (totalClaimed > 0 && it.quantity > 0) {
        const coveredQty = Math.min(totalClaimed, it.quantity);
        claimed += Math.round(lineTotal * (coveredQty / it.quantity));
      }
    });
    const tax = grand > 0 ? Math.round(taxCents * (mine / grand)) : 0;
    const tip = participantIds.length > 0 ? Math.round(tipCents / participantIds.length) : 0;
    const unclaimed = Math.max(0, grand - claimed);
    return { mySubtotalC: mine, grandSubtotalC: grand, claimedSubtotalC: claimed, unclaimedSubtotalC: unclaimed, myTaxC: tax, myTipC: tip, myTotalC: mine + tax + tip };
  }, [items, claimsByItem, profileId, taxCents, tipCents, participantIds]);


  useEffect(() => { onTotalsChange?.(myTotalC); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [myTotalC]);

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="space-y-3 pb-28">
      {receiptImageUrl && (
        <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowReceipt(v => !v)}
            className="w-full px-3 py-2 flex items-center justify-between text-[12px] font-medium text-foreground/80 hover:bg-muted/40 transition-colors"
          >
            <span>Receipt photo</span>
            <span className="text-[11px] text-muted-foreground">{showReceipt ? 'Hide' : 'View'}</span>
          </button>
          {showReceipt && (
            <a
              href={receiptImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (Capacitor.isNativePlatform()) {
                  e.preventDefault();
                  void openExternalLink(receiptImageUrl);
                }
              }}
              className="block"
            >
              <img src={receiptImageUrl} alt="Receipt" className="w-full max-h-72 object-contain bg-muted" />
            </a>
          )}
        </div>
      )}
      <p className="text-[13px] font-medium text-foreground/80 tracking-tight">Claim what you ordered</p>


      <div className="rounded-2xl border border-border/60 bg-card/60 divide-y divide-border/40 overflow-hidden">
        {items.map(it => {
          const claimants = claimsByItem[it.id] ?? [];
          const totalClaimed = claimants.reduce((s, c) => s + c.qty, 0);
          const mine = claimants.find(c => c.profile_id === profileId)?.qty ?? 0;
          const unclaimed = totalClaimed < it.quantity;
          const lineTotal = it.unit_price_cents * it.quantity;
          const myShareC = totalClaimed > 0 && mine > 0 ? Math.round(lineTotal * (mine / totalClaimed)) : 0;
          const isSharedAll = participantIds.length > 0
            && claimants.length === participantIds.length
            && claimants.every(c => c.qty === 1 && participantIds.includes(c.profile_id));

          return (
            <div
              key={it.id}
              className={[
                'relative flex items-center gap-3 px-3 py-3 transition-colors duration-300',
                unclaimed
                  ? 'bg-primary/[0.015] before:content-[""] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:border-l-2 before:border-dashed before:border-primary/25 animate-pulse [animation-duration:4s]'
                  : '',
              ].join(' ')}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-medium tracking-tight truncate">{it.description}</p>
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                  {fmt(it.unit_price_cents)} · qty {it.quantity}
                  {mine > 0 && <span className="text-primary font-medium"> · you {fmt(myShareC)}</span>}
                </p>
                <button
                  type="button"
                  onClick={() => shareAll(it.id, isSharedAll)}
                  disabled={participantIds.length === 0}
                  className={[
                    'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-tight transition-colors',
                    'border active:scale-95',
                    isSharedAll
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-muted/40 border-border/60 text-foreground/70 hover:bg-muted/60',
                  ].join(' ')}
                >
                  <Users className="h-3 w-3" />
                  {isSharedAll ? `Shared · ${participantIds.length} people` : 'Share with all'}
                </button>
                {claimants.length > 0 && (
                  <div className="flex items-center mt-2">
                    {claimants.slice(0, 6).map(c => (
                      <Avatar
                        key={c.profile_id}
                        className={[
                          'h-6 w-6 -ml-1.5 first:ml-0 ring-2 ring-background',
                          'animate-in fade-in zoom-in-75 duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                          c.profile_id === profileId ? '!ring-primary' : '',
                        ].join(' ')}
                        title={`${c.name}${c.qty > 1 ? ` ×${c.qty}` : ''}`}
                      >
                        {c.avatar && <AvatarImage src={c.avatar} alt={c.name} />}
                        <AvatarFallback className="text-[9px] font-medium">{initials(c.name)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {claimants.length > 6 && (
                      <span className="text-[10px] text-muted-foreground ml-2 tabular-nums">+{claimants.length - 6}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-full active:scale-95 transition-transform"
                  onClick={() => change(it.id, -1)}
                  disabled={mine === 0}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-5 text-center text-[14px] font-semibold tabular-nums">{mine}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-full active:scale-95 transition-transform"
                  onClick={() => change(it.id, +1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}

        {!items.length && <p className="text-sm text-muted-foreground p-4 text-center">No items.</p>}
      </div>

      {items.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 -mx-6 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md bg-background/75 border-t border-border/40 z-10">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-1.5">Live Summary</p>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Your items subtotal</span>
            <span className="font-medium tabular-nums">{fmt(mySubtotalC)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px] mt-0.5">
            <span className="text-muted-foreground">Your share of tax</span>
            <span className="font-medium tabular-nums">+ {fmt(myTaxC)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px] mt-0.5">
            <span className="text-muted-foreground">Tip (split evenly{participantIds.length > 0 ? ` · ${participantIds.length} people` : ''})</span>
            <span className="font-medium tabular-nums">+ {fmt(myTipC)}</span>
          </div>
          <div className="h-px bg-border/40 my-2" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium tracking-tight">Estimated final charge</span>
            <span
              key={myTotalC}
              className="text-[19px] font-semibold font-montserrat text-primary tabular-nums inline-block animate-in zoom-in-95 duration-200 ease-out"
            >
              {fmt(myTotalC)}
            </span>
          </div>
          {grandSubtotalC > 0 && mySubtotalC === 0 && (
            <p className="text-[11px] text-muted-foreground pt-1.5">Tap + on items above to start your tab.</p>
          )}
          <Button
            className="w-full mt-3 h-11 rounded-full font-montserrat font-bold uppercase tracking-wider text-[13px] shadow-[0_0_16px_rgba(244,122,25,0.35)]"
            disabled={mySubtotalC === 0 || submitting}
            onClick={async () => {
              if (mySubtotalC === 0) return;
              setSubmitting(true);
              triggerHaptic('success');
              try {
                const { error } = await supabase.functions.invoke('nudge-claim-items', { body: { request_id: requestId } });
                if (error) console.error('nudge failed', error);
                toast.success('Submitted · crew nudged');
              } catch (e) {
                console.error(e);
                toast.success('Submitted');
              } finally {
                setSubmitting(false);
                onSubmit?.();
              }
            }}
          >
            <Check className="h-4 w-4 mr-1.5" />
            {mySubtotalC === 0 ? 'Pick at least one item' : `Submit my items · ${fmt(myTotalC)}`}
          </Button>
        </div>
      )}
    </div>
  );
}
