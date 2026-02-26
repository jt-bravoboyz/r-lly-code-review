import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * MED-1: Session-wide Mapbox token caching via React Query.
 * Token is fetched once per session (staleTime: Infinity).
 */
export function useMapboxToken() {
  const { data: token, isLoading, error } = useQuery({
    queryKey: ['mapbox-token'],
    queryFn: async (): Promise<string | null> => {
      // First, try to get the token from environment variables (preferred - no network call)
      const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
      if (envToken) {
        return envToken;
      }

      // Fallback: fetch from edge function if env var not set
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      
      if (error) {
        throw error;
      }
      
      if (data?.token) {
        return data.token;
      }

      throw new Error('Mapbox token not available');
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });

  return {
    token: token ?? null,
    isLoading,
    error: error ? (error as Error).message : null,
  };
}
