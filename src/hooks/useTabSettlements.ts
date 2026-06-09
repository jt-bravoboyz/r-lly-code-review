import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TabSettlement {
  id: string;
  split_target_id: string | null;
  split_request_id: string | null;
  event_id: string | null;
  payer_id: string;
  payee_id: string;
  amount_cents: number;
  method: string;
  status: 'pending' | 'link_opened' | 'sent' | 'confirmed' | 'disputed';
  link_opened_at: string | null;
  app_returned_at: string | null;
  marked_sent_at: string | null;
  auto_confirm_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  dispute_note: string | null;
  created_at: string;
  payer?: { id: string; display_name: string | null; avatar_url: string | null } | null;
  payee?: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

export function useTabSettlements(splitRequestId: string | null | undefined) {
  const [settlements, setSettlements] = useState<TabSettlement[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!splitRequestId) {
      setSettlements([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('tab_settlements')
      .select('*')
      .eq('split_request_id', splitRequestId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[useTabSettlements] fetch failed', error);
      setSettlements([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as TabSettlement[];
    const profileIds = Array.from(
      new Set(rows.flatMap((r) => [r.payer_id, r.payee_id]))
    );

    let profileMap = new Map<string, { id: string; display_name: string | null; avatar_url: string | null }>();
    if (profileIds.length) {
      const { data: profiles } = await supabase
        .from('safe_profiles')
        .select('id, display_name, avatar_url')
        .in('id', profileIds);
      profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    }

    setSettlements(
      rows.map((r) => ({
        ...r,
        payer: profileMap.get(r.payer_id) ?? null,
        payee: profileMap.get(r.payee_id) ?? null,
      }))
    );
    setLoading(false);
  }, [splitRequestId]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);

  // Realtime subscription scoped to this split request
  useEffect(() => {
    if (!splitRequestId) return;
    const channel = supabase
      .channel(`tab-settlements-${splitRequestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tab_settlements',
          filter: `split_request_id=eq.${splitRequestId}`,
        },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [splitRequestId, refetch]);

  const disputeSettlement = useCallback(
    async (settlementId: string, note: string) => {
      const { error } = await supabase
        .from('tab_settlements')
        .update({
          status: 'disputed',
          disputed_at: new Date().toISOString(),
          dispute_note: note || null,
        })
        .eq('id', settlementId);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  const confirmSettlement = useCallback(
    async (settlementId: string) => {
      const { error } = await supabase
        .from('tab_settlements')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', settlementId);
      if (error) throw error;
      await refetch();
    },
    [refetch]
  );

  return { settlements, loading, refetch, disputeSettlement, confirmSettlement };
}
