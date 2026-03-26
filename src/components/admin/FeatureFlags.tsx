import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Feature Flags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {flags.map(flag => (
            <div key={flag.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="text-sm font-medium font-mono">{flag.key}</div>
                {flag.description && (
                  <div className="text-xs text-muted-foreground">{flag.description}</div>
                )}
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={(checked) => toggleFlag(flag.key, checked)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
