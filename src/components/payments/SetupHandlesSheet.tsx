import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function SetupHandlesSheet({ open, onOpenChange, onComplete }: Props) {
  const { user } = useAuth();
  const [venmo, setVenmo] = useState('');
  const [cashapp, setCashapp] = useState('');
  const [paypal, setPaypal] = useState('');
  const [appleCash, setAppleCash] = useState('');
  const [saving, setSaving] = useState(false);

  // Prefill if user already has any handles (in case they reopen)
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('venmo_handle, cashapp_handle, paypal_handle, apple_cash_handle')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setVenmo(data.venmo_handle ?? '');
        setCashapp(data.cashapp_handle ?? '');
        setPaypal(data.paypal_handle ?? '');
        setAppleCash((data as any).apple_cash_handle ?? '');
      }
    })();
  }, [open, user]);

  const hasAtLeastOne =
    venmo.trim() !== '' ||
    cashapp.trim() !== '' ||
    paypal.trim() !== '' ||
    appleCash.trim() !== '';

  const handleSave = async () => {
    if (!user || !hasAtLeastOne) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        venmo_handle: venmo.trim() || null,
        cashapp_handle: cashapp.trim() || null,
        paypal_handle: paypal.trim() || null,
        apple_cash_handle: appleCash.trim() || null,
      } as any)
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Could not save handles', { description: error.message });
      return;
    }
    toast.success('Payment handle saved');
    onComplete();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-3xl border-t border-white/10 bg-background/95 backdrop-blur-2xl max-h-[92dvh] flex flex-col"
        style={{ WebkitBackdropFilter: 'blur(32px)' }}
      >
        <SheetHeader className="px-5 pt-5 pb-2 text-left">
          <SheetTitle className="font-montserrat text-xl font-extrabold tracking-tight">
            How should friends pay you back?
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Add at least one so participants can send you money directly through Venmo, CashApp, PayPal, or Apple Cash.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 pb-5 pt-2 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <Label htmlFor="sh-venmo">Venmo handle</Label>
            <Input
              id="sh-venmo"
              value={venmo}
              onChange={(e) => setVenmo(e.target.value)}
              placeholder="@jake-smith-7"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sh-cashapp">CashApp handle</Label>
            <Input
              id="sh-cashapp"
              value={cashapp}
              onChange={(e) => setCashapp(e.target.value)}
              placeholder="$JakeSmith"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sh-paypal">PayPal handle</Label>
            <Input
              id="sh-paypal"
              value={paypal}
              onChange={(e) => setPaypal(e.target.value)}
              placeholder="jake.smith (for paypal.me/jake.smith)"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sh-applecash">Apple Cash (phone or Apple ID email)</Label>
            <Input
              id="sh-applecash"
              value={appleCash}
              onChange={(e) => setAppleCash(e.target.value)}
              placeholder="+1 (678) 555-1234 or Apple ID email"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="text"
            />
          </div>
        </div>

        <div
          className="px-5 pt-3 pb-5 border-t border-white/10 bg-background/80"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
        >
          <Button
            onClick={handleSave}
            disabled={!hasAtLeastOne || saving}
            className="w-full h-12 rounded-full font-montserrat font-bold text-sm uppercase tracking-wider bg-primary shadow-[0_0_16px_rgba(244,122,25,0.35)] hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & Continue'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
