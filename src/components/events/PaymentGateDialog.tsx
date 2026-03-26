import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { simulatePayment } from '@/lib/paymentService';

interface PaymentGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  eventTitle: string;
  onPaymentSuccess: (transactionId: string) => void;
}

export function PaymentGateDialog({
  open,
  onOpenChange,
  amount,
  eventTitle,
  onPaymentSuccess,
}: PaymentGateDialogProps) {
  const [processing, setProcessing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);

  const handlePay = async () => {
    setProcessing(true);
    setFailed(false);
    const result = await simulatePayment(amount, simulateFailure);
    setProcessing(false);

    if (result.status === 'paid') {
      onPaymentSuccess(result.transactionId);
    } else {
      setFailed(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!processing) onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-montserrat flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Cover Charge
          </DialogTitle>
          <DialogDescription>
            {eventTitle} has a ${amount.toFixed(2)} cover charge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Amount display */}
          <div className="text-center py-4 bg-muted rounded-xl">
            <p className="text-3xl font-bold font-montserrat">${amount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">One-time entry fee</p>
          </div>

          {failed && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">Payment failed. Please try again.</p>
            </div>
          )}

          <Button
            className="w-full h-12"
            onClick={handlePay}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : failed ? (
              'Try Again'
            ) : (
              'Pay to Join'
            )}
          </Button>

          {/* Test toggle */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Label htmlFor="sim-fail" className="text-xs text-muted-foreground">
              Simulate Failure (testing)
            </Label>
            <Switch
              id="sim-fail"
              checked={simulateFailure}
              onCheckedChange={setSimulateFailure}
              disabled={processing}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
