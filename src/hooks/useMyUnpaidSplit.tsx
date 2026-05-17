import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UnpaidShare {
  requestId: string;
  mode: 'quick' | 'itemized';
  amountCents: number;
}

/**
 * Returns the viewer's outstanding split-check shares for a given event.
 * Subscribes to realtime so the CTA disappears the instant the row flips to paid.
 */
export function useMyUnpaidSplit(eventId: string | null | undefined, profileId: string | null | undefined) {
  const [unpaid, setUnpaid] = useState<UnpaidShare[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!eventId || !profileId) { setUnpaid([]); setLoading(false); return; }
    const { data: reqs } = await supabase
      .from('split_check_requests')
      .select('id, mode')
      .eq('event_id', eventId);
    const ids = (reqs ?? []).map((r: any) => r.id);
    if (!ids.length) { setUnpaid([]); setLoading(false); return; }
    const { data: targets } = await supabase
      .from('split_check_targets')
      .select('request_id, share_cents, status')
      .in('request_id', ids)
      .eq('profile_id', profileId)
      .eq('status', 'pending');

    const byReq = new Map<string, 'quick' | 'itemized'>(
      (reqs ?? []).map((r: any) => [r.id, r.mode]),
    );

    const rows: UnpaidShare[] = [];
    for (const t of targets ?? []) {
      const mode = byReq.get((t as any).request_id) ?? 'quick';
      let amount = (t as any).share_cents ?? 0;
      if (mode === 'itemized') {
        const { data: computed } = await supabase.rpc('compute_itemized_share', {
          p_request_id: (t as any).request_id,
          p_profile_id: profileId,
        });
        const row = Array.isArray(computed) ? computed[0] : computed;
        amount = row?.total_cents ?? 0;
      }
      rows.push({ requestId: (t as any).request_id, mode, amountCents: amount });
    }
    setUnpaid(rows);
    setLoading(false);
  }, [eventId, profileId]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel(`split-check-unpaid-${eventId}-${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_targets' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_requests' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_item_claims' }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId, profileId, refetch]);

  const total = unpaid.reduce((s, u) => s + u.amountCents, 0);
  const hasItemized = unpaid.some((u) => u.mode === 'itemized');

  return { unpaid, total, hasItemized, loading, refetch };
}
