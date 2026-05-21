import { Card } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { ComingSoonInline } from '@/components/common/ComingSoonInline';

export function PaymentMethodSection() {
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-1.5">
        <CreditCard className="h-4 w-4 text-primary" /> Payment Method
      </h3>
      <ComingSoonInline
        tag="Classified — Tier 03"
        title="Coming Soon"
        subtitle="Save a card for one-tap R@lly payments."
      />
    </Card>
  );
}
