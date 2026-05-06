import { BottomNav } from '@/components/layout/BottomNav';
import { RallyFeedComingSoon } from '@/components/events/RallyFeedComingSoon';

export default function Events() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background pb-28">
      <RallyFeedComingSoon />
      <BottomNav />
    </div>
  );
}
