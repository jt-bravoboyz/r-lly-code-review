import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DisputeSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlementId: string;
  amountLabel: string;
  methodLabel: string;
  payerName: string;
  onDispute: (settlementId: string, note: string) => Promise<void>;
}

export function DisputeSettlementDialog({
  open,
  onOpenChange,
  settlementId,
  amountLabel,
  methodLabel,
  payerName,
  onDispute,
}: DisputeSettlementDialogProps) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleFlag() {
    setBusy(true);
    try {
      await onDispute(settlementId, note.trim());
      toast.success(`Flagged. ${payerName} has been notified to reach out.`);
      setNote('');
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Could not flag', { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-[Montserrat] text-lg font-bold">
            Didn't receive this payment?
          </DialogTitle>
          <DialogDescription>
            If you haven't received {amountLabel} via {methodLabel}, let{' '}
            <span className="text-foreground font-medium">{payerName}</span> know.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <label htmlFor="dispute-note" className="text-xs text-muted-foreground">
            Add a note (optional)
          </label>
          <Input
            id="dispute-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's missing?"
            maxLength={280}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            onClick={handleFlag}
            disabled={busy}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-[Montserrat] font-semibold"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Flag as Disputed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
