import { BottomNav } from '@/components/layout/BottomNav';
import { ComingSoonScreen } from '@/components/common/ComingSoonScreen';

export default function SplitCheckHome() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background pb-28">
      <ComingSoonScreen
        tag="Classified — Tier 03"
        title={<>R<span className="text-primary">@</span>LLY TABS</>}
        subtitle="Split the check. Settle the night."
      />
      <BottomNav />
    </div>
  );
}
