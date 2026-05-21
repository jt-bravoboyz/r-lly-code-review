import { Card } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { ComingSoonInline } from '@/components/common/ComingSoonInline';

export function PayoutSettingsSection() {
  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-semibold flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" /> Payouts
        </h3>
        <p className="text-xs text-muted-foreground">Receive event funds directly</p>
      </div>
      <ComingSoonInline
        tag="Classified — Tier 03"
        title="Coming Soon"
        subtitle="Direct payouts for hosts. Stand by."
      />
    </Card>
  );
}
