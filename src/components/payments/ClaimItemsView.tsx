import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Minus, Plus } from 'lucide-react';

interface Props {
  requestId: string;
  profileId: string;
  taxCents?: number;
  tipCents?: number;
  onChange?: () => void;
  onTotalsChange?: (myCents: number) => void;
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

export function ClaimItemsView({ requestId, profileId, taxCents = 0, tipCents = 0, onChange, onTotalsChange }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [claimsByItem, setClaimsByItem] = useState<Record<string, Claimant[]>>({});
  const [profileCache, setProfileCache] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [pulseTotal, setPulseTotal] = useState(false);

  const refresh = async () => {
    const { data: it } = await supabase.from('split_check_items').select('*').eq('request_id', requestId).order('line_no');
    setItems(it ?? []);
    const itemIds = (it ?? []).map((i: any) => i.id);
    if (!itemIds.length) { setClaimsByItem({}); return; }
    const { data: cls } = await supabase.from('split_check_item_claims').select('*').in('item_id', itemIds);
    const rows = cls ?? [];

    const needed = Array.from(new Set(rows.map((r: any) => r.profile_id))).filter(id => !profileCache[id]);
    let cache = profileCache;
    if (needed.length) {
      const { data: profs } = await supabase.from('safe_profiles').select('id, display_name, avatar_url').in('id', needed);
      cache = { ...profileCache };
      (profs ?? []).forEach((p: any) => {
        cache[p.id] = { name: p.display_name ?? 'Someone', avatar: p.avatar_url ?? null };
      });
      setProfileCache(cache);
    }

    const grouped: Record<string, Claimant[]> = {};
    rows.forEach((c: any) => {
      const meta = cache[c.profile_id] ?? { name: 'Someone', avatar: null };
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_item_claims' }, () => { refresh(); onChange?.(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const change = async (itemId: string, delta: number) => {
    const mineRow = (claimsByItem[itemId] ?? []).find(c => c.profile_id === profileId);
    const current = mineRow?.qty ?? 0;
    const next = Math.max(0, current + delta);
    if (next === current) return;
    if (next === 0) {
      await supabase.from('split_check_item_claims').delete().eq('item_id', itemId).eq('profile_id', profileId);
    } else {
      await supabase.from('split_check_item_claims').upsert({ item_id: itemId, profile_id: profileId, quantity_claimed: next }, { onConflict: 'item_id,profile_id' });
    }
    refresh(); onChange?.();
  };

  const { mySubtotalC, myTaxTipC, myTotalC } = useMemo(() => {
    let mine = 0;
    let grand = 0;
    items.forEach(it => {
      const lineTotal = it.unit_price_cents * it.quantity;
      grand += lineTotal;
      const claimants = claimsByItem[it.id] ?? [];
      const totalClaimed = claimants.reduce((s, c) => s + c.qty, 0);
      const myQty = claimants.find(c => c.profile_id === profileId)?.qty ?? 0;
      if (totalClaimed > 0 && myQty > 0) {
        mine += Math.round(lineTotal * (myQty / totalClaimed));
      }
    });
    const pool = taxCents + tipCents;
    const tt = grand > 0 ? Math.round(pool * (mine / grand)) : 0;
    return { mySubtotalC: mine, myTaxTipC: tt, myTotalC: mine + tt };
  }, [items, claimsByItem, profileId, taxCents, tipCents]);

  useEffect(() => { onTotalsChange?.(myTotalC); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [myTotalC]);

  // Haptic-style scale pulse on total change
  useEffect(() => {
    setPulseTotal(true);
    const t = setTimeout(() => setPulseTotal(false), 150);
    return () => clearTimeout(t);
  }, [myTotalC]);

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="flex flex-col max-h-[60vh] -mx-6">
      <div className="px-6 pb-2 shrink-0">
        <p className="text-sm font-medium">Claim what you ordered</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 divide-y divide-border/40">
        {items.map(it => {
          const claimants = claimsByItem[it.id] ?? [];
          const totalClaimed = claimants.reduce((s, c) => s + c.qty, 0);
          const mine = claimants.find(c => c.profile_id === profileId)?.qty ?? 0;
          const unclaimed = totalClaimed < it.quantity;
          const lineTotal = it.unit_price_cents * it.quantity;
          const myShareC = totalClaimed > 0 && mine > 0 ? Math.round(lineTotal * (mine / totalClaimed)) : 0;

          return (
            <div
              key={it.id}
              className={[
                'flex items-center gap-3 py-3 px-1 rounded-xl transition-colors',
                unclaimed
                  ? 'border border-dashed border-primary/20 bg-primary/[0.01] animate-pulse [animation-duration:4s] px-3'
                  : 'border border-transparent',
              ].join(' ')}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-medium truncate tracking-tight">{it.description}</p>
                  <span
                    className={[
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      unclaimed ? 'bg-primary/40' : 'bg-muted-foreground/20',
                    ].join(' ')}
                    aria-label={unclaimed ? 'Unclaimed' : 'Claimed'}
                  />
                </div>
                <p className="text-[12px] text-muted-foreground tabular-nums mt-0.5">
                  {fmt(it.unit_price_cents)} · qty {it.quantity}
                  {mine > 0 && <span className="text-primary font-medium"> · you {fmt(myShareC)}</span>}
                </p>
                {claimants.length > 0 && (
                  <div className="flex items-center mt-2">
                    {claimants.slice(0, 6).map(c => (
                      <Avatar
                        key={c.profile_id}
                        className={[
                          'h-6 w-6 -ml-2 first:ml-0 ring-2 ring-background animate-avatar-pop',
                          c.profile_id === profileId ? 'ring-[1.5px] ring-primary' : '',
                        ].join(' ')}
                        title={`${c.name}${c.qty > 1 ? ` ×${c.qty}` : ''}`}
                      >
                        {c.avatar && <AvatarImage src={c.avatar} alt={c.name} />}
                        <AvatarFallback className="text-[10px]">{initials(c.name)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {claimants.length > 6 && (
                      <span className="text-[10px] text-muted-foreground -ml-1 pl-2">+{claimants.length - 6}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-full border border-border/60 active:scale-95 transition-transform disabled:opacity-40"
                  onClick={() => change(it.id, -1)}
                  disabled={mine === 0}
                  aria-label="Remove one"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-5 text-center text-[15px] font-medium tabular-nums">{mine}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-full border border-border/60 active:scale-95 transition-transform"
                  onClick={() => change(it.id, +1)}
                  aria-label="Add one"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}

        {!items.length && <p className="text-sm text-muted-foreground py-4">No items.</p>}
      </div>

      {items.length > 0 && (
        <div className="sticky bottom-0 backdrop-blur-md bg-background/75 border-t border-border/40 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[13px] leading-tight">
              <span className="text-muted-foreground">Your Items Subtotal</span>
              <span className="font-medium tabular-nums">{fmt(mySubtotalC)}</span>
            </div>
            <div className="flex items-center justify-between text-[13px] leading-tight">
              <span className="text-muted-foreground">Your Prorated Tax &amp; Tip</span>
              <span className="font-medium tabular-nums">+ {fmt(myTaxTipC)}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-[13px] font-semibold tracking-tight">Your Estimated Final Charge</span>
              <span
                className={[
                  'text-[17px] font-semibold font-montserrat text-primary tabular-nums transition-transform duration-150 ease-out',
                  pulseTotal ? 'scale-[1.02]' : 'scale-100',
                ].join(' ')}
              >
                {fmt(myTotalC)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
