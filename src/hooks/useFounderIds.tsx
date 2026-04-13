import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFounderIds() {
  return useQuery({
    queryKey: ['founder-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safe_profiles')
        .select('id')
        .eq('founding_member', true);

      if (error) throw error;
      return new Set((data || []).map((p) => p.id));
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60,
  });
}
