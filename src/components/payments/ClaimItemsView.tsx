import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface Props {
  requestId: string;
  profileId: string;
  onChange?: () => void;
}

export function ClaimItemsView({ requestId, profileId, onChange }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [claims, setClaims] = useState<Record<string, number>>({}); // item_id -> qty by me
  const [taken, setTaken] = useState<Record<string, number>>({}); // item_id -> total qty claimed (by anyone)

  const refresh = async () => {
    const { data: it } = await supabase.from('split_check_items').select('*').eq('request_id', requestId).order('line_no');
    setItems(it ?? []);
    const itemIds = (it ?? []).map((i: any) => i.id);
    if (!itemIds.length) return;
    const { data: cls } = await supabase.from('split_check_item_claims').select('*').in('item_id', itemIds);
    const my: Record<string, number> = {};
    const all: Record<string, number> = {};
    (cls ?? []).forEach((c: any) => {
      all[c.item_id] = (all[c.item_id] ?? 0) + c.quantity_claimed;
      if (c.profile_id === profileId) my[c.item_id] = c.quantity_claimed;
    });
    setClaims(my); setTaken(all);
  };

  useEffect(() => { refresh(); }, [requestId, profileId]);

  useEffect(() => {
    const ch = supabase.channel(`claim-items-${requestId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_item_claims' }, () => { refresh(); onChange?.(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [requestId]);

  const change = async (itemId: string, delta: number, max: number) => {
    const current = claims[itemId] ?? 0;
    const next = Math.max(0, Math.min(max, current + delta));
    if (next === current) return;
    if (next === 0) {
      await supabase.from('split_check_item_claims').delete().eq('item_id', itemId).eq('profile_id', profileId);
    } else {
      await supabase.from('split_check_item_claims').upsert({ item_id: itemId, profile_id: profileId, quantity_claimed: next }, { onConflict: 'item_id,profile_id' });
    }
    refresh(); onChange?.();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Claim what you ordered</p>
      {items.map(it => {
        const otherTaken = (taken[it.id] ?? 0) - (claims[it.id] ?? 0);
        const remaining = it.quantity - otherTaken;
        const mine = claims[it.id] ?? 0;
        return (
          <div key={it.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{it.description}</p>
              <p className="text-xs text-muted-foreground">${(it.unit_price_cents/100).toFixed(2)} · {remaining - mine} of {it.quantity} left</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => change(it.id, -1, remaining)} disabled={mine === 0}><Minus className="h-3 w-3" /></Button>
              <span className="w-6 text-center text-sm font-medium">{mine}</span>
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => change(it.id, +1, remaining)} disabled={mine >= remaining}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>
        );
      })}
      {!items.length && <p className="text-sm text-muted-foreground">No items.</p>}
    </div>
  );
}
