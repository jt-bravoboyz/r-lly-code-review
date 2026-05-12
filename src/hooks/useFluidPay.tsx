import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FluidPayConfig {
  configured: boolean;
  publicKey: string | null;
  env: 'sandbox' | 'live';
  tokenizerScriptUrl: string | null;
}

declare global {
  interface Window {
    FluidPayTokenizer?: any;
  }
}

let cachedConfig: FluidPayConfig | null = null;
let scriptLoaded = false;

export function useFluidPay() {
  const [config, setConfig] = useState<FluidPayConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);

  useEffect(() => {
    if (cachedConfig) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke('get-fluid-pay-config');
      if (cancelled) return;
      if (error || !data) {
        setConfig({ configured: false, publicKey: null, env: 'sandbox', tokenizerScriptUrl: null });
      } else {
        cachedConfig = data as FluidPayConfig;
        setConfig(cachedConfig);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const loadTokenizer = useCallback(async () => {
    if (!config?.tokenizerScriptUrl) return false;
    if (scriptLoaded) return true;
    return new Promise<boolean>((resolve) => {
      const s = document.createElement('script');
      s.src = config.tokenizerScriptUrl!;
      s.async = true;
      s.onload = () => { scriptLoaded = true; resolve(true); };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }, [config]);

  const isSimulated = () => {
    try { return localStorage.getItem('rally.simulatePayments') === 'true'; }
    catch { return false; }
  };

  return { config, loading, loadTokenizer, isSimulated };
}
