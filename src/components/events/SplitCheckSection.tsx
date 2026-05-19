import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt } from 'lucide-react';
import { SplitCheckSettlementPanel } from './SplitCheckSettlementPanel';
import { useMyUnpaidSplit } from '@/hooks/useMyUnpaidSplit';

interface Props {
  eventId: string;
  creatorId: string;
  canManage: boolean;
  profileId?: string | null;
  onRequestPayment: () => void;
  onOpenPay: (requestId: string) => void;
  onOpenPayoutSetup: () => void;
}

export function SplitCheckSection({
  eventId, creatorId, canManage, profileId,
  onRequestPayment, onOpenPay, onOpenPayoutSetup,
}: Props) {
  const { unpaid, total, hasItemized } = useMyUnpaidSplit(eventId, profileId);

  return (
    <div className="space-y-3">
      {/* Attendee CTA — visible to anyone with an unpaid share */}
      {unpaid.length > 0 && (
        <button
          type="button"
          onClick={() => onOpenPay(unpaid[0].requestId)}
          className="w-full text-left rounded-2xl p-4 bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-lg active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wide opacity-80 font-montserrat">Your tab</p>
              <p className="text-2xl font-bold font-montserrat">${(total / 100).toFixed(2)}</p>
              <p className="text-xs opacity-90 font-montserrat">
                {hasItemized
                  ? 'Tap to claim your items'
                  : `${unpaid.length} share${unpaid.length > 1 ? 's' : ''} waiting`}
              </p>
            </div>
            <span className="text-sm font-bold font-montserrat">Pay →</span>
          </div>
        </button>
      )}

      {/* Host settlement panel — always available pre-completion */}
      {/* DRAFT: forced visible for layout testing */}
      {(canManage || true) && (
        <Card className="card-rally">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Split Check</span>
              <Button size="sm" onClick={onRequestPayment}>Request Payment</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SplitCheckSettlementPanel
              eventId={eventId}
              hostProfileId={creatorId}
              onOpenPayoutSetup={onOpenPayoutSetup}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
