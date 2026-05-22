import { useState } from 'react';
import { X, MessageSquare, Star } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { openExternalLink } from '@/lib/nativeLinks';
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
    <div className="mx-4 mt-3 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 backdrop-blur-xl p-4 relative overflow-hidden shadow-[0_4px_24px_hsl(var(--primary)/0.25)]">
      {/* Animated shimmer sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite] pointer-events-none" />
      
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground transition-colors z-10"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 relative z-10">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_12px_hsl(var(--primary)/0.4)] ring-2 ring-primary/20">
          <Star className="w-5 h-5 text-primary fill-primary/30" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-bold text-foreground tracking-wide">
            {founderNumber ? `Founding Member #${founderNumber}` : 'Founding Member'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            You're one of the first 25. Test all core features and report any bugs or feedback.
          </p>
          <a
            href="https://rally.canny.io"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (Capacitor.isNativePlatform()) {
                e.preventDefault();
                void openExternalLink('https://rally.canny.io');
              }
            }}
            className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full border border-primary/20"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Report Feedback
          </a>
        </div>
      </div>
    </div>
  );
}
