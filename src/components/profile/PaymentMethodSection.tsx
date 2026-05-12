import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Trash2, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function PaymentMethodSection() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles')
      .select('id, fluid_pay_card_brand, fluid_pay_card_last4, fluid_pay_token, founder_number')
      .eq('user_id', user.id).maybeSingle();
    setProfile(data);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async () => {
    if (!profile) return;
    await supabase.from('profiles').update({
      fluid_pay_token: null, fluid_pay_card_brand: null, fluid_pay_card_last4: null, fluid_pay_saved_at: null,
    }).eq('id', profile.id);
    toast.success('Card removed');
    load();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-primary" /> Payment Method</h3>
        {profile?.founder_number && (
          <Badge className="gap-1"><Star className="h-3 w-3" /> Founder Fee Waived</Badge>
        )}
      </div>
      {profile?.fluid_pay_token ? (
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
          <span className="text-sm">{profile.fluid_pay_card_brand?.toUpperCase()} •••• {profile.fluid_pay_card_last4}</span>
          <Button variant="ghost" size="icon" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No saved card. You'll be prompted at checkout.</p>
      )}
    </Card>
  );
}
