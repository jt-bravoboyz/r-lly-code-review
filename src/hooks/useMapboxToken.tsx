import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        // First, try to get the token from environment variables (preferred - no network call)
        const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
        if (envToken) {
          setToken(envToken);
          setIsLoading(false);
          return;
        }

        // Fallback: fetch from edge function if env var not set
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          throw error;
        }
        
        if (data?.token) {
          setToken(data.token);
        } else {
          setError('Mapbox token not available');
        }
      } catch (err: any) {
        console.error('Failed to fetch Mapbox token:', err);
        setError(err.message || 'Failed to fetch Mapbox token');
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, []);

  return { token, isLoading, error };
}