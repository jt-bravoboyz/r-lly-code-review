import { useState } from 'react';
import { X, MessageSquare, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function FoundingMemberBanner() {
  const { profile } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('rally-founder-banner-dismissed') === 'true'
  );

  const isFounder = profile?.founding_member === true;
  const hasOptimisticFlag = localStorage.getItem('rally-founding25') === 'true';

  // Show if DB confirms OR if localStorage flag is still present (optimistic)
  if ((!isFounder && !hasOptimisticFlag) || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('rally-founder-banner-dismissed', 'true');
    setDismissed(true);
  };

  const founderNumber = profile?.founder_number;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-primary/30 bg-primary/10 backdrop-blur-sm p-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Star className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-foreground">
            {founderNumber ? `Founding Member #${founderNumber}` : 'Founding Member'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            You're one of the first 25. Test all core features and report any bugs or feedback.
          </p>
          <a
            href="https://rally.canny.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Report Feedback
          </a>
        </div>
      </div>
    </div>
  );
}
