import { BottomNav } from '@/components/layout/BottomNav';
import { ComingSoonScreen } from '@/components/common/ComingSoonScreen';

export default function SplitCheckHome() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background pb-bottom-nav">
      <ComingSoonScreen
        tag="Classified — Tier 03"
        title={<>R<span className="text-primary">@</span>LLY WALLET</>}
        subtitle="Split the check. Pay the cover. All in one place."
      />
      <BottomNav />
    </div>
  );
}
