import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSplitCheck(eventId: string | null | undefined) {
  const [requests, setRequests] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!eventId) { setLoading(false); return; }
    const { data: reqs } = await supabase
      .from('split_check_requests').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    setRequests(reqs ?? []);
    const reqIds = (reqs ?? []).map((r: any) => r.id);
    if (reqIds.length) {
      const [t, i, pay] = await Promise.all([
        supabase.from('split_check_targets').select('*').in('request_id', reqIds),
        supabase.from('split_check_items').select('*').in('request_id', reqIds).order('line_no'),
        // J: pull authoritative payments ledger for these requests — host_net_cents is
        // populated server-side by process-fluid-pay so the host sees real numbers.
        supabase.from('payments')
          .select('id, split_request_id, kind, status, amount_cents, host_net_cents, platform_fee_cents')
          .in('split_request_id', reqIds),
      ]);
      setTargets(t.data ?? []);
      setItems(i.data ?? []);
      setPayments(pay.data ?? []);
      const itemIds = (i.data ?? []).map((it: any) => it.id);
      if (itemIds.length) {
        const { data: c } = await supabase.from('split_check_item_claims').select('*').in('item_id', itemIds);
        setClaims(c ?? []);
      } else setClaims([]);
    } else { setTargets([]); setItems([]); setClaims([]); setPayments([]); }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel(`split-check-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_targets' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_item_claims' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId, refetch]);

  return { requests, targets, items, claims, payments, loading, refetch };
}
