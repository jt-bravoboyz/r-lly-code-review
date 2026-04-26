import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import { BentoCard } from './BentoCard';

interface Flag {
  key: string;
  enabled: boolean;
  description: string | null;
}

export const FeatureFlags = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [flags, setFlags] = useState<Flag[]>([]);

  useEffect(() => {
    supabase
      .from('feature_flags')
      .select('key, enabled, description')
      .then(({ data }) => {
        if (data) setFlags(data);
      });
  }, []);

  const toggleFlag = async (key: string, enabled: boolean) => {
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      toast.error('Failed to update flag');
      return;
    }

    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled } : f));
    toast.success(`${key} ${enabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div ref={ref}>
      <BentoCard span={12}>
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Feature Flags
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            {flags.length} flag{flags.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="space-y-2">
          {flags.map(flag => (
            <div
              key={flag.key}
              className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-background/40 hover:bg-background/70 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium font-mono truncate">{flag.key}</div>
                {flag.description && (
                  <div className="text-xs text-muted-foreground truncate">{flag.description}</div>
                )}
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={(checked) => toggleFlag(flag.key, checked)}
              />
            </div>
          ))}
        </div>
      </BentoCard>
    </div>
  );
});
FeatureFlags.displayName = 'FeatureFlags';
