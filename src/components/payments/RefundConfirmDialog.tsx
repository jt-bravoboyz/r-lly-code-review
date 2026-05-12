import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paymentId: string;
  originalAmountCents: number;
  onRefunded?: () => void;
}

export function RefundConfirmDialog({ open, onOpenChange, paymentId, originalAmountCents, onRefunded }: Props) {
  const [partial, setPartial] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const amount_cents = partial ? Math.round(parseFloat(partial) * 100) : undefined;
    const { data, error } = await supabase.functions.invoke('process-refund', {
      body: { payment_id: paymentId, amount_cents, reason: reason || undefined },
    });
    setBusy(false);
    if (error || !data?.ok) { toast.error((data as any)?.error ?? 'Refund failed'); return; }
    toast.success('Refund issued');
    onRefunded?.(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Issue refund</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Original: ${(originalAmountCents/100).toFixed(2)}</p>
          <div>
            <Label htmlFor="amt">Partial amount (optional)</Label>
            <Input id="amt" type="number" step="0.01" placeholder="leave blank for full refund"
              value={partial} onChange={e => setPartial(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
