import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type SettlementPref = 'venmo' | 'cashapp' | 'paypal' | 'apple_cash' | 'card';

export function PaymentMethodSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venmo, setVenmo] = useState('');
  const [cashapp, setCashapp] = useState('');
  const [paypal, setPaypal] = useState('');
  const [appleCash, setAppleCash] = useState('');
  const [preferred, setPreferred] = useState<SettlementPref | ''>('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('venmo_handle, cashapp_handle, paypal_handle, apple_cash_handle, preferred_settlement')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!error && data) {
        setVenmo(data.venmo_handle ?? '');
        setCashapp(data.cashapp_handle ?? '');
        setPaypal(data.paypal_handle ?? '');
        setAppleCash((data as any).apple_cash_handle ?? '');
        setPreferred((data.preferred_settlement as SettlementPref | null) ?? '');
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        venmo_handle: venmo.trim() || null,
        cashapp_handle: cashapp.trim() || null,
        paypal_handle: paypal.trim() || null,
        apple_cash_handle: appleCash.trim() || null,
        preferred_settlement: preferred || null,
      } as any)
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Could not save handles', { description: error.message });
    } else {
      toast.success('Payment handles saved');
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold flex items-center gap-1.5">
          <CreditCard className="h-4 w-4 text-primary" /> Payment Handles
        </h3>
        <p className="text-xs text-muted-foreground">
          How your friends pay you back when splitting a check
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="venmo-handle">Venmo</Label>
            <Input
              id="venmo-handle"
              value={venmo}
              onChange={(e) => setVenmo(e.target.value)}
              placeholder="@jake-smith-7"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cashapp-handle">CashApp</Label>
            <Input
              id="cashapp-handle"
              value={cashapp}
              onChange={(e) => setCashapp(e.target.value)}
              placeholder="$JakeSmith"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paypal-handle">PayPal</Label>
            <Input
              id="paypal-handle"
              value={paypal}
              onChange={(e) => setPaypal(e.target.value)}
              placeholder="jake.smith (for paypal.me/jake.smith)"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apple-cash-handle">Apple Cash</Label>
            <Input
              id="apple-cash-handle"
              value={appleCash}
              onChange={(e) => setAppleCash(e.target.value)}
              placeholder="+1 (678) 555-1234 or Apple ID email"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="text"
            />
            <p className="text-[11px] text-muted-foreground">
              Your phone number or Apple ID that friends use to send you Apple Cash in iMessage
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Show this first</Label>
            <Select value={preferred} onValueChange={(v) => setPreferred(v as SettlementPref)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="cashapp">CashApp</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="apple_cash">Apple Cash</SelectItem>
                <SelectItem value="card">Card only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      )}
    </Card>
  );
}
