import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';
import { useMerchantAccount } from '@/hooks/useMerchantAccount';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PoweredByFluidPay } from '@/components/payments/PoweredByFluidPay';

export function PayoutSettingsSection() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setProfileId(data?.id ?? null));
  }, [user]);

  const { account, loading, start, refresh } = useMerchantAccount(profileId);
  const [busy, setBusy] = useState(false);

  if (loading) return <Card className="p-4"><Loader2 className="h-4 w-4 animate-spin" /></Card>;

  const handleStart = async () => {
    setBusy(true);
    const { data, error } = await start();
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? 'Could not start onboarding');
      return;
    }
    if ((data as any)?.onboarding_url) {
      window.open((data as any).onboarding_url, '_blank');
    } else {
      toast.success('Onboarding started');
    }
  };

  const handleRefresh = async () => {
    setBusy(true);
    await refresh();
    setBusy(false);
  };

  const status = account?.status ?? 'not_started';

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Payouts</h3>
          <p className="text-xs text-muted-foreground">Receive event funds directly</p>
        </div>
        <Badge variant={status === 'active' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'}>{status.replace('_', ' ')}</Badge>
      </div>

      {status === 'not_started' && (
        <Button className="w-full" onClick={handleStart} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Set up payouts
        </Button>
      )}

      {status === 'pending' && (
        <div className="space-y-2">
          <p className="text-sm">Onboarding in progress.</p>
          {Array.isArray(account?.requirements_due) && account!.requirements_due.length > 0 && (
            <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
              {(account!.requirements_due as any[]).map((r: any, i: number) => (
                <li key={i}>{typeof r === 'string' ? r : r.field ?? JSON.stringify(r)}</li>
              ))}
            </ul>
          )}
          <Button variant="outline" size="sm" className="w-full" onClick={handleRefresh} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />} Refresh status
          </Button>
        </div>
      )}

      {status === 'active' && (
        <div className="space-y-2">
          <p className="text-sm text-emerald-600">Payouts active — funds route directly to your account.</p>
          {account?.legal_name && <p className="text-xs text-muted-foreground">{account.legal_name}</p>}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={busy}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh status
          </Button>
        </div>
      )}

      {(status === 'rejected' || status === 'disabled') && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">Payout setup is blocked. Contact support to resolve.</p>
          <Button variant="outline" size="sm" onClick={handleStart} disabled={busy}>Retry</Button>
        </div>
      )}

      <PoweredByFluidPay />
    </Card>
  );
}
