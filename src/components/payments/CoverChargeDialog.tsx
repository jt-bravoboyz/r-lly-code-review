import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { simulatePayment } from '@/lib/paymentService';
import { FluidPayCardForm } from './FluidPayCardForm';
import { SecurePaymentBadge } from './PoweredByFluidPay';
import { useFluidPay } from '@/hooks/useFluidPay';
import { toast } from 'sonner';
import rallyLogo from '@/assets/rally-logo.png';

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
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-background/80 backdrop-blur-2xl">
          <DialogTitle className="font-montserrat flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Founder Fee Waived
          </DialogTitle>
          <DialogDescription>Cover charge for {eventTitle} is on the house — Founders ride free.</DialogDescription>
          <Button onClick={() => { onPaid('founder_waived'); onOpenChange(false); }}>Continue</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const amountDisplay = `$${(amountCents / 100).toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden rounded-3xl border border-white/10 bg-background/70 backdrop-blur-2xl shadow-[0_20px_80px_-20px_hsl(var(--primary)/0.35),0_0_0_1px_hsl(var(--primary)/0.08)]"
        style={{ WebkitBackdropFilter: 'blur(28px)' }}
      >
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" />
          {/* Inner top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        <div className="relative p-5 pb-6 space-y-5">
          {/* Header */}
          <div className="text-center pt-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Cover Charge
            </p>
            <DialogTitle className="font-montserrat text-base font-semibold mt-1 truncate">
              {eventTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Cover charge of {amountDisplay} for {eventTitle}
            </DialogDescription>
          </div>

          {/* Apple Pay-style hero card */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.12] via-white/[0.06] to-white/[0.02] p-5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.15),0_10px_30px_-10px_hsl(0_0%_0%/0.4)]">
              {/* Shimmer */}
              <div className="absolute -inset-x-12 -top-12 h-32 rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2.4s_ease-out_1]" />
              {/* Brand flag */}
              <div className="flex items-start justify-between mb-6">
                <div className="h-8 w-10 rounded-md bg-gradient-to-br from-amber-200/80 to-amber-500/80 shadow-inner border border-amber-300/40" />
                <div className="h-12 w-12 -mt-1 -mr-1 flex items-center justify-center">
                  <img src={rallyLogo} alt="R@lly" className="h-12 w-12 object-contain" />
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-1">
                One-time entry
              </p>
              <p className="font-montserrat text-5xl font-bold tabular-nums text-foreground">
                {amountDisplay}
              </p>
            </div>
          </div>

          {/* Trust strip */}
          <SecurePaymentBadge />

          {/* Action area */}
          {savedToken && !showCardForm ? (
            <div className="space-y-2">
              <Button
                className="w-full h-14 rounded-2xl text-base font-semibold bg-gradient-to-b from-primary to-primary/85 hover:from-primary hover:to-primary shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.25)] active:scale-[0.99] transition-transform"
                disabled={busy}
                onClick={() => charge(savedToken, savedCardBrand ?? 'card', savedCardLast4 ?? '', false)}
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : null}
                Pay {amountDisplay} · {savedCardBrand?.toUpperCase()} •••• {savedCardLast4}
              </Button>
              <Button
                variant="ghost"
                className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setShowCardForm(true)}
              >
                Use a different card
              </Button>
            </div>
          ) : (
            <FluidPayCardForm amountCents={amountCents} onTokenize={charge} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
