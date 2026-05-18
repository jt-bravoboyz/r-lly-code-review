import { useEffect, useMemo, useState } from 'react';
import { useSplitCheck } from '@/hooks/useSplitCheck';
import { useMerchantAccount } from '@/hooks/useMerchantAccount';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, RefreshCw, Loader2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { RefundConfirmDialog } from '@/components/payments/RefundConfirmDialog';

interface Props {
  eventId: string;
  hostProfileId: string;
  onOpenPayoutSetup?: () => void;
}

export function SplitCheckSettlementPanel({ eventId, hostProfileId, onOpenPayoutSetup }: Props) {
  const { requests, targets, items, claims, refetch } = useSplitCheck(eventId);
  const { account } = useMerchantAccount(hostProfileId);
  const [profileMap, setProfileMap] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [refundFor, setRefundFor] = useState<{ paymentId: string; amount: number } | null>(null);
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    const ids = Array.from(new Set([
      ...targets.map((t: any) => t.profile_id),
      ...claims.map((c: any) => c.profile_id),
    ]));
    if (!ids.length) return;
    supabase.from('safe_profiles').select('id, display_name, avatar_url').in('id', ids)
      .then(({ data }) => setProfileMap(Object.fromEntries(
        (data ?? []).map((p: any) => [p.id, { name: p.display_name ?? 'Someone', avatar: p.avatar_url ?? null }])
      )));
  }, [targets, claims]);

  if (!requests.length) return null;

  const nudge = async (requestId: string, profileId: string) => {
    setNudgingId(profileId);
    const { error } = await supabase.functions.invoke('nudge-split-share', {
      body: { request_id: requestId, target_profile_ids: [profileId] },
    });
    setNudgingId(null);
    if (error) toast.error('Could not nudge');
    else toast.success('Nudged');
  };

  const nudgeAll = async (requestId: string, ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase.functions.invoke('nudge-split-share', {
      body: { request_id: requestId, target_profile_ids: ids },
    });
    if (error) toast.error('Could not nudge'); else toast.success(`Nudged ${ids.length}`);
  };

  const payoutsActive = account?.status === 'active' && account.payouts_enabled;

  return (
    <div className="space-y-3">
      {requests.map((r: any) => {
        const reqTargets = targets.filter((t: any) => t.request_id === r.id);
        const collected = reqTargets.filter((t: any) => t.status === 'paid').reduce((s: number, t: any) => s + (t.share_cents ?? 0), 0);
        const outstanding = r.total_cents - collected;
        const reqItems = items.filter((i: any) => i.request_id === r.id);
        const reqClaims = claims.filter((c: any) => reqItems.some((i: any) => i.id === c.item_id));
        const platformFee = Math.round(collected * 0.05); // visual estimate; server is source of truth
        const yourNet = collected - platformFee;
        const pendingIds = reqTargets.filter((t: any) => t.status === 'pending').map((t: any) => t.profile_id);

        return (
          <Card key={r.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{r.mode === 'quick' ? 'Quick Split' : 'Itemized Split'}</p>
                <p className="text-xs text-muted-foreground">${(r.total_cents/100).toFixed(2)} total</p>
              </div>
              <Badge variant={r.status === 'settled' ? 'default' : 'secondary'}>{r.status}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><p className="font-bold text-base">${(collected/100).toFixed(2)}</p><p className="text-muted-foreground">Collected</p></div>
              <div><p className="font-bold text-base">${(outstanding/100).toFixed(2)}</p><p className="text-muted-foreground">Outstanding</p></div>
              <div><p className="font-bold text-base">${(yourNet/100).toFixed(2)}</p><p className="text-muted-foreground">Your net</p></div>
            </div>

            {!payoutsActive && collected > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex gap-2 items-start">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs">Set up payouts to withdraw <strong>${(yourNet/100).toFixed(2)}</strong> — funds are being held in R@lly until you onboard.</p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={onOpenPayoutSetup}>Set up payouts</Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {reqTargets.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm py-1">
                  <span className="truncate">{profileNames[t.profile_id] ?? t.profile_id.slice(0, 8)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">${((t.share_cents ?? 0)/100).toFixed(2)}</span>
                    <Badge variant={t.status === 'paid' ? 'default' : t.status === 'refunded' ? 'destructive' : 'secondary'} className="text-[10px]">{t.status}</Badge>
                    {t.status === 'pending' && (
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => nudge(r.id, t.profile_id)} disabled={nudgingId === t.profile_id}>
                        {nudgingId === t.profile_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                      </Button>
                    )}
                    {t.status === 'paid' && t.payment_id && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        onClick={() => setRefundFor({ paymentId: t.payment_id, amount: t.share_cents })}>
                        Refund
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pendingIds.length > 1 && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => nudgeAll(r.id, pendingIds)}>
                <RefreshCw className="h-3 w-3 mr-1" /> Re-request all ({pendingIds.length})
              </Button>
            )}

            {r.mode === 'itemized' && reqItems.length > 0 && (() => {
              const unclaimed = reqItems.map((it: any) => {
                const taken = reqClaims.filter((c: any) => c.item_id === it.id).reduce((s: number, c: any) => s + c.quantity_claimed, 0);
                const left = it.quantity - taken;
                return left > 0 ? { ...it, left, uncovered_cents: left * it.unit_price_cents } : null;
              }).filter(Boolean);
              if (!unclaimed.length) return null;
              return (
                <div className="border-t pt-2">
                  <p className="text-xs font-medium mb-1">Unclaimed items</p>
                  {unclaimed.map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between text-xs py-0.5">
                      <span className="truncate">{it.description} ×{it.left}</span>
                      <span className="text-muted-foreground">${(it.uncovered_cents/100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        );
      })}
      {refundFor && (
        <RefundConfirmDialog open={!!refundFor} onOpenChange={(v) => !v && setRefundFor(null)}
          paymentId={refundFor.paymentId} originalAmountCents={refundFor.amount} onRefunded={refetch} />
      )}
    </div>
  );
}
