import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSplitCheck(eventId: string | null | undefined) {
  const [requests, setRequests] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!eventId) { setLoading(false); return; }
    const { data: reqs } = await supabase
      .from('split_check_requests').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    setRequests(reqs ?? []);
    const reqIds = (reqs ?? []).map((r: any) => r.id);
    if (reqIds.length) {
      const [t, i] = await Promise.all([
        supabase.from('split_check_targets').select('*').in('request_id', reqIds),
        supabase.from('split_check_items').select('*').in('request_id', reqIds).order('line_no'),
      ]);
      setTargets(t.data ?? []);
      setItems(i.data ?? []);
      const itemIds = (i.data ?? []).map((it: any) => it.id);
      if (itemIds.length) {
        const { data: c } = await supabase.from('split_check_item_claims').select('*').in('item_id', itemIds);
        setClaims(c ?? []);
      } else setClaims([]);
    } else { setTargets([]); setItems([]); setClaims([]); }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!eventId) return;
    const ch = supabase
      .channel(`split-check-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_targets' }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_item_claims' }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId, refetch]);

  return { requests, targets, items, claims, loading, refetch };
}
