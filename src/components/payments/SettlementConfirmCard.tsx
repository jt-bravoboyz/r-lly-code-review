import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DisputeSettlementDialog } from './DisputeSettlementDialog';
import type { TabSettlement } from '@/hooks/useTabSettlements';

interface SettlementConfirmCardProps {
  settlement: TabSettlement;
  onConfirm: (settlementId: string) => Promise<void>;
  onDispute: (settlementId: string, note: string) => Promise<void>;
}

const METHOD_LABEL: Record<string, string> = {
  venmo: 'Venmo',
  cashapp: 'CashApp',
  paypal: 'PayPal',
  card: 'card',
  other: 'other',
};

function fmtAmount(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'just now';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function hoursUntil(iso: string | null): string {
  if (!iso) return 'soon';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'any moment';
  const hrs = Math.ceil(diff / 3600000);
  return `${hrs} hour${hrs === 1 ? '' : 's'}`;
}

export function SettlementConfirmCard({
  settlement,
  onConfirm,
  onDispute,
}: SettlementConfirmCardProps) {
  const [busy, setBusy] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const payerName = settlement.payer?.display_name ?? 'Someone';
  const methodLabel = useMemo(
    () => METHOD_LABEL[settlement.method] ?? settlement.method,
    [settlement.method]
  );
  const amountLabel = fmtAmount(settlement.amount_cents);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm(settlement.id);
      toast.success(`Confirmed payment from ${payerName}`);
    } catch (e: any) {
      toast.error('Could not confirm', { description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="p-4 space-y-3 border border-primary/20 bg-primary/[0.04]">
        <div className="space-y-1">
          <p className="text-sm">
            <span className="font-semibold">{payerName}</span> says they sent{' '}
            <span className="font-semibold text-primary">{amountLabel}</span> via{' '}
            {methodLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {timeAgo(settlement.marked_sent_at)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Auto-confirms in {hoursUntil(settlement.auto_confirm_at)} if no action needed
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1" /> Confirm received
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDisputeOpen(true)}
            disabled={busy}
            className="flex-1"
          >
            <AlertCircle className="h-3.5 w-3.5 mr-1" /> I didn't get this
          </Button>
        </div>
      </Card>

      <DisputeSettlementDialog
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
        settlementId={settlement.id}
        amountLabel={amountLabel}
        methodLabel={methodLabel}
        payerName={payerName}
        onDispute={onDispute}
      />
    </>
  );
}
