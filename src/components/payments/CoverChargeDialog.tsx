import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { simulatePayment } from '@/lib/paymentService';
import { FluidPayCardForm } from './FluidPayCardForm';
import { PoweredByFluidPay } from './PoweredByFluidPay';
import { useFluidPay } from '@/hooks/useFluidPay';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  eventTitle: string;
  amountCents: number;
  founderWaived?: boolean;
  savedToken?: string | null;
  savedCardLast4?: string | null;
  savedCardBrand?: string | null;
  onPaid: (paymentId: string) => void;
}

export function CoverChargeDialog({
  open, onOpenChange, eventId, eventTitle, amountCents,
  founderWaived, savedToken, savedCardLast4, savedCardBrand, onPaid,
}: Props) {
  const { isSimulated } = useFluidPay();
  const [showCardForm, setShowCardForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const charge = async (token: string, brand: string, last4: string, save: boolean) => {
    if (isSimulated()) {
      const r = await simulatePayment(amountCents / 100, false);
      if (r.status === 'paid') {
        onPaid(`sim_${r.transactionId}`);
        onOpenChange(false);
      } else {
        toast.error('Simulated payment failed');
      }
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('process-fluid-pay', {
      body: {
        payment_token: token, amount_cents: amountCents, kind: 'cover',
        event_id: eventId, save_token: save, card_brand: brand, card_last4: last4,
      },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast.error((data as any)?.error ?? error?.message ?? 'Payment failed');
      return;
    }
    onPaid(data.payment_id);
    onOpenChange(false);
  };

  if (founderWaived) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Founder Fee Waived</DialogTitle>
            <DialogDescription>Cover charge for {eventTitle} is waived for Founders.</DialogDescription>
          </DialogHeader>
          <Button onClick={() => { onPaid('founder_waived'); onOpenChange(false); }}>Continue</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Cover Charge
          </DialogTitle>
          <DialogDescription>{eventTitle} — ${(amountCents/100).toFixed(2)}</DialogDescription>
        </DialogHeader>

        <div className="text-center py-4 bg-muted rounded-xl">
          <p className="text-3xl font-bold font-montserrat">${(amountCents/100).toFixed(2)}</p>
        </div>

        {savedToken && !showCardForm ? (
          <div className="space-y-2">
            <Button className="w-full h-12" disabled={busy}
              onClick={() => charge(savedToken, savedCardBrand ?? 'card', savedCardLast4 ?? '', false)}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              One-Tap Pay ${(amountCents/100).toFixed(2)} · {savedCardBrand?.toUpperCase()} •••• {savedCardLast4}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowCardForm(true)}>
              Use a different card
            </Button>
            <PoweredByFluidPay />
          </div>
        ) : (
          <FluidPayCardForm amountCents={amountCents} onTokenize={charge} />
        )}
      </DialogContent>
    </Dialog>
  );
}
