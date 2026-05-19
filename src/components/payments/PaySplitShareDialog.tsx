import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowRight } from 'lucide-react';
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
  const [mismatch, setMismatch] = useState<{ from: number; to: number } | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);

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
    if (busy) return;
    if (target?.status === 'paid') {
      toast.info('Already paid');
      onOpenChange(false);
      return;
    }
    setBusy(true);
    const idempotencyKey = `${target?.id ?? requestId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

    try {
      if (isSimulated()) {
        const r = await simulatePayment(amountCents / 100, false);
        if (r.status === 'paid') {
          await supabase
            .from('split_check_targets')
            .update({ status: 'paid', share_cents: amountCents })
            .eq('id', target.id)
            .neq('status', 'paid');
          toast.success('Paid (simulated)');
          onPaid?.(); onOpenChange(false);
        } else toast.error('Failed');
        return;
      }

      if (request.mode === 'itemized') {
        await supabase.from('split_check_targets').update({ share_cents: amountCents }).eq('id', target.id);
      }
      const payBody = {
        payment_token: token, amount_cents: amountCents, kind: 'split_share' as const,
        event_id: request.event_id, split_request_id: requestId,
        save_token: save, card_brand: brand, card_last4: last4,
        idempotency_key: idempotencyKey,
      };

      // Offline-first: if the user lost connectivity right as they tap pay,
      // enqueue the payment instead of failing hard. ConnectionStatusBanner
      // will surface the queue and auto-drain on reconnect.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const { enqueuePayment } = await import('@/lib/paymentQueue');
        await enqueuePayment(payBody, 'offline');
        toast.success("You're offline — we'll send this the moment you reconnect.");
        onPaid?.(); onOpenChange(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-fluid-pay', { body: payBody });

      // Claim snapshot mismatch — someone updated their items mid-pay. Surface as an
      // inline AlertDialog rather than a raw toast so the payer can re-verify cleanly.
      if (data?.error === 'claim_snapshot_mismatch') {
        const newTotal = data?.server_total_cents ?? amountCents;
        setMismatch({ from: amountCents, to: newTotal });
        setComputedTotal(newTotal);
        await refreshItemized();
        return;
      }

      if (error || !data?.ok) {
        // Network-class failures get queued for background retry.
        const transient = !!error || ['network_error', 'timeout', 'service_unavailable'].includes((data as any)?.error);
        if (transient) {
          const { enqueuePayment } = await import('@/lib/paymentQueue');
          await enqueuePayment(payBody, (data as any)?.error ?? error?.message ?? 'transient');
          toast.success('Connection hiccup — payment queued and will retry automatically.');
          onPaid?.(); onOpenChange(false);
          return;
        }
        toast.error((data as any)?.error ?? 'Payment failed'); return;
      }
      onPaid?.(); onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Pay your share</DialogTitle></DialogHeader>

        {request.mode === 'itemized' && (
          <ClaimItemsView
            requestId={requestId}
            profileId={profileId}
            taxCents={request.tax_cents ?? 0}
            tipCents={request.tip_cents ?? 0}
            receiptImageUrl={request.receipt_image_url ?? null}
            onChange={refreshItemized}
            onTotalsChange={(c) => setComputedTotal(c)}
          />
        )}

        <div className="text-center py-3 bg-muted rounded-xl">
          <p className="text-3xl font-bold font-montserrat">${(amountCents/100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{request.mode === 'itemized' ? 'Includes proportional tax & tip' : 'Your share'}</p>
        </div>

        {savedToken ? (
          <Button className="w-full h-12" disabled={busy || amountCents === 0 || target?.status === 'paid' || target?.status === 'declined'}
            onClick={() => pay(savedToken, savedCardBrand ?? 'card', savedCardLast4 ?? '', false)}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {target?.status === 'paid' ? 'Already paid' : `One-Tap Pay $${(amountCents/100).toFixed(2)}`}
          </Button>
        ) : (
          <FluidPayCardForm
            amountCents={amountCents}
            onTokenize={pay}
            externalDisabled={busy || amountCents === 0 || target?.status === 'paid' || target?.status === 'declined'}
          />
        )}

        {target && target.status !== 'paid' && target.status !== 'declined' && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-destructive text-xs"
            disabled={busy}
            onClick={() => setConfirmDecline(true)}
          >
            Not my tab — decline
          </Button>
        )}
        {target?.status === 'declined' && (
          <p className="text-center text-xs text-muted-foreground">You declined this tab.</p>
        )}

        {/* Snapshot-mismatch recovery dialog */}
        <AlertDialog open={!!mismatch} onOpenChange={(v) => !v && setMismatch(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Your tab just changed</AlertDialogTitle>
              <AlertDialogDescription>
                Someone at the table just updated their claims. Re-verify your new total before paying.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {mismatch && (
              <div className="flex items-center justify-center gap-3 py-2 font-montserrat tabular-nums">
                <span className="text-base text-muted-foreground line-through">{fmt(mismatch.from)}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold text-primary">{fmt(mismatch.to)}</span>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await refreshItemized();
                  setMismatch(null);
                }}
              >
                Re-verify & pay
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Decline confirmation — replaces window.confirm */}
        <AlertDialog open={confirmDecline} onOpenChange={setConfirmDecline}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline this tab?</AlertDialogTitle>
              <AlertDialogDescription>
                The host will be notified you opted out. You can't undo this.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep paying</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  setConfirmDecline(false);
                  if (!target) return;
                  const { error } = await supabase
                    .from('split_check_targets')
                    .update({ status: 'declined' })
                    .eq('id', target.id);
                  if (error) { toast.error('Could not decline'); return; }
                  toast.success('Host notified — declined');
                  onPaid?.(); onOpenChange(false);
                }}
              >
                Decline
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
