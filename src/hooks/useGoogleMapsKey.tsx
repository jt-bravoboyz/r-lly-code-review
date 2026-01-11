import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGoogleMapsKey() {
  return useQuery({
    queryKey: ['google-maps-key'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-google-maps-key');
      
      if (error) {
        console.error('Failed to get Google Maps key:', error);
        throw error;
      }
      
      return data.key as string;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  });
}
