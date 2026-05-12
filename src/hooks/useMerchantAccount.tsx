import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MerchantAccount {
  id: string;
  profile_id: string;
  fluid_pay_sub_merchant_id: string | null;
  status: 'not_started' | 'pending' | 'active' | 'rejected' | 'disabled';
  legal_name: string | null;
  email: string | null;
  country: string | null;
  requirements_due: any;
  payouts_enabled: boolean;
  last_synced_at: string | null;
}

export function useMerchantAccount(profileId: string | null | undefined) {
  const [account, setAccount] = useState<MerchantAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!profileId) { setLoading(false); return; }
    const { data } = await supabase
      .from('merchant_accounts')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    setAccount((data as any) ?? null);
    setLoading(false);
  }, [profileId]);

  useEffect(() => { refetch(); }, [refetch]);

  const start = useCallback(async (legal_name?: string, country?: string) => {
    const { data, error } = await supabase.functions.invoke('fluid-pay-onboarding', {
      body: { action: 'start', legal_name, country },
    });
    await refetch();
    return { data, error };
  }, [refetch]);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('fluid-pay-onboarding', {
      body: { action: 'refresh' },
    });
    await refetch();
    return { data, error };
  }, [refetch]);

  const submitField = useCallback(async (field: string, value: unknown) => {
    return supabase.functions.invoke('fluid-pay-onboarding', {
      body: { action: 'submit_field', field, value },
    });
  }, []);

  return { account, loading, refetch, start, refresh, submitField };
}
