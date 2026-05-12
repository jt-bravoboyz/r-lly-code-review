import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { simulatePayment } from '@/lib/paymentService';
import { FluidPayCardForm } from './FluidPayCardForm';
import { useFluidPay } from '@/hooks/useFluidPay';
import { ClaimItemsView } from './ClaimItemsView';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requestId: string;
  profileId: string;
  savedToken?: string | null;
  savedCardLast4?: string | null;
  savedCardBrand?: string | null;
  onPaid?: () => void;
}

export function PaySplitShareDialog({ open, onOpenChange, requestId, profileId, savedToken, savedCardLast4, savedCardBrand, onPaid }: Props) {
  const { isSimulated } = useFluidPay();
  const [request, setRequest] = useState<any>(null);
  const [target, setTarget] = useState<any>(null);
  const [computedTotal, setComputedTotal] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: r } = await supabase.from('split_check_requests').select('*').eq('id', requestId).maybeSingle();
      const { data: t } = await supabase.from('split_check_targets').select('*').eq('request_id', requestId).eq('profile_id', profileId).maybeSingle();
      setRequest(r); setTarget(t);
      if (r?.mode === 'itemized') refreshItemized();
    })();
  }, [open, requestId, profileId]);

  const refreshItemized = async () => {
    const { data } = await supabase.rpc('compute_itemized_share', { p_request_id: requestId, p_profile_id: profileId });
    const row = Array.isArray(data) ? data[0] : data;
    setComputedTotal(row?.total_cents ?? 0);
  };

  if (!request) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></DialogContent>
      </Dialog>
    );
  }

  const amountCents = request.mode === 'quick' ? (target?.share_cents ?? 0) : computedTotal;

  const pay = async (token: string, brand: string, last4: string, save: boolean) => {
    if (isSimulated()) {
      const r = await simulatePayment(amountCents / 100, false);
      if (r.status === 'paid') {
        await supabase.from('split_check_targets').update({ status: 'paid', share_cents: amountCents }).eq('id', target.id);
        toast.success('Paid (simulated)');
        onPaid?.(); onOpenChange(false);
      } else toast.error('Failed');
      return;
    }
    setBusy(true);
    if (request.mode === 'itemized') {
      await supabase.from('split_check_targets').update({ share_cents: amountCents }).eq('id', target.id);
    }
    const { data, error } = await supabase.functions.invoke('process-fluid-pay', {
      body: {
        payment_token: token, amount_cents: amountCents, kind: 'split_share',
        event_id: request.event_id, split_request_id: requestId,
        save_token: save, card_brand: brand, card_last4: last4,
      },
    });
    setBusy(false);
    if (error || !data?.ok) { toast.error((data as any)?.error ?? 'Payment failed'); return; }
    onPaid?.(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Pay your share</DialogTitle></DialogHeader>

        {request.mode === 'itemized' && (
          <ClaimItemsView requestId={requestId} profileId={profileId} onChange={refreshItemized} />
        )}

        <div className="text-center py-3 bg-muted rounded-xl">
          <p className="text-3xl font-bold font-montserrat">${(amountCents/100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{request.mode === 'itemized' ? 'Includes proportional tax & tip' : 'Your share'}</p>
        </div>

        {savedToken ? (
          <Button className="w-full h-12" disabled={busy || amountCents === 0}
            onClick={() => pay(savedToken, savedCardBrand ?? 'card', savedCardLast4 ?? '', false)}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            One-Tap Pay ${(amountCents/100).toFixed(2)}
          </Button>
        ) : (
          <FluidPayCardForm amountCents={amountCents} onTokenize={pay} />
        )}
      </DialogContent>
    </Dialog>
  );
}
