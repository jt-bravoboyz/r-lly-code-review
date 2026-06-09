import { useEffect, useState } from 'react';
import { useSplitCheck } from '@/hooks/useSplitCheck';
import { useMerchantAccount } from '@/hooks/useMerchantAccount';
import { useAuth } from '@/hooks/useAuth';
import { useTabSettlements, type TabSettlement } from '@/hooks/useTabSettlements';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bell, RefreshCw, Loader2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { RefundConfirmDialog } from '@/components/payments/RefundConfirmDialog';
import { SettlementConfirmCard } from '@/components/payments/SettlementConfirmCard';

const METHOD_LABEL: Record<string, string> = {
  venmo: 'Venmo',
  cashapp: 'CashApp',
  paypal: 'PayPal',
  card: 'Card',
  other: 'Other',
};

function P2PStatusBadge({ s }: { s: TabSettlement }) {
  if (s.status === 'sent') {
    return (
      <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border border-amber-500/30 hover:bg-amber-500/15">
        Sent via {METHOD_LABEL[s.method] ?? s.method} · Confirming
      </Badge>
    );
  }
  if (s.status === 'confirmed') {
    return (
      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/15">
        Confirmed via {METHOD_LABEL[s.method] ?? s.method} ✓
      </Badge>
    );
  }
  if (s.status === 'disputed') {
    return (
      <Badge className="text-[10px] bg-red-500/15 text-red-600 border border-red-500/30 hover:bg-red-500/15">
        Disputed · Follow up
      </Badge>
    );
  }
  return null;
}

interface Props {
  eventId: string;
  hostProfileId: string;
  onOpenPayoutSetup?: () => void;
}

export function SplitCheckSettlementPanel({ eventId, hostProfileId, onOpenPayoutSetup }: Props) {
  const { requests, targets, items, claims, payments, refetch } = useSplitCheck(eventId);
  const { account } = useMerchantAccount(hostProfileId);
  const [profileMap, setProfileMap] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [refundFor, setRefundFor] = useState<{ paymentId: string; amount: number } | null>(null);
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

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

  // Surface cooldown info cleanly when the edge function returns 429 nudge_cooldown.
  const handleNudgeResponse = (data: any, error: any) => {
    if (error) { toast.error('Could not nudge'); return; }
    if (data?.error === 'nudge_cooldown') {
      const maxSecs = (data.cooling ?? []).reduce((m: number, c: any) => Math.max(m, c.seconds_remaining ?? 0), 0);
      const mins = Math.max(1, Math.ceil(maxSecs / 60));
      toast.error(`Cool down — try again in ${mins} min`);
      return;
    }
    if (data?.nudged > 0 && data?.skipped > 0) {
      toast.success(`Nudged ${data.nudged} · skipped ${data.skipped} (recently nudged)`);
    } else if (data?.nudged > 0) {
      toast.success(data.nudged === 1 ? 'Nudged' : `Nudged ${data.nudged}`);
    }
  };

  const nudge = async (requestId: string, profileId: string) => {
    setNudgingId(profileId);
    const { data, error } = await supabase.functions.invoke('nudge-split-share', {
      body: { request_id: requestId, target_profile_ids: [profileId] },
    });
    setNudgingId(null);
    handleNudgeResponse(data, error);
  };

  const nudgeAll = async (requestId: string, ids: string[]) => {
    if (!ids.length) return;
    const { data, error } = await supabase.functions.invoke('nudge-split-share', {
      body: { request_id: requestId, target_profile_ids: ids },
    });
    handleNudgeResponse(data, error);
  };

  const payoutsActive = account?.status === 'active' && account.payouts_enabled;

  const performCancel = async (requestId: string) => {
    setCancelingId(requestId);
    const { error } = await supabase
      .from('split_check_requests')
      .update({ status: 'canceled' })
      .eq('id', requestId);
    setCancelingId(null);
    setConfirmCancel(null);
    if (error) { toast.error('Could not cancel'); return; }
    toast.success('Request canceled');
    refetch();
  };

  return (
    <div className="space-y-3">
      {requests.map((r: any) => {
        const reqTargets = targets.filter((t: any) => t.request_id === r.id);
        const reqItems = items.filter((i: any) => i.request_id === r.id);
        const reqClaims = claims.filter((c: any) => reqItems.some((i: any) => i.id === c.item_id));
        const reqPayments = (payments ?? []).filter((p: any) => p.split_request_id === r.id);
        return (
          <SplitRequestCard
            key={r.id}
            r={r}
            reqTargets={reqTargets}
            reqItems={reqItems}
            reqClaims={reqClaims}
            reqPayments={reqPayments}
            profileMap={profileMap}
            payoutsActive={payoutsActive}
            onOpenPayoutSetup={onOpenPayoutSetup}
            nudge={nudge}
            nudgeAll={nudgeAll}
            nudgingId={nudgingId}
            cancelingId={cancelingId}
            setConfirmCancel={setConfirmCancel}
            setRefundFor={setRefundFor}
          />
        );
      })}
      {refundFor && (
        <RefundConfirmDialog open={!!refundFor} onOpenChange={(v) => !v && setRefundFor(null)}
          paymentId={refundFor.paymentId} originalAmountCents={refundFor.amount} onRefunded={refetch} />
      )}

      {/* Cancel confirmation — replaces window.confirm */}
      <AlertDialog open={!!confirmCancel} onOpenChange={(v) => !v && setConfirmCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this split-check?</AlertDialogTitle>
            <AlertDialogDescription>
              Pending attendees will stop seeing the pay prompt. Already-paid shares stay collected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it open</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmCancel && performCancel(confirmCancel)}
            >
              Cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
