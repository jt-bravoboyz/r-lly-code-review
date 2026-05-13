import { ShieldCheck, Lock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function PoweredByFluidPay({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground ${className}`}>
      <ShieldCheck className="h-3 w-3" />
      <span>Powered by Fluid Pay</span>
    </div>
  );
}

/**
 * SecurePaymentBadge — prominent trust strip for the cover charge sheet.
 * Tappable: opens a popover explaining tokenization + PCI-DSS.
 */
export function SecurePaymentBadge({ className = '' }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`group w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-3 text-left transition-all hover:bg-white/[0.07] hover:border-primary/30 active:scale-[0.99] ${className}`}
          style={{ WebkitBackdropFilter: 'blur(20px)' }}
        >
          <div className="shrink-0 h-9 w-9 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/30 flex items-center justify-center shadow-[0_0_18px_hsl(var(--primary)/0.25)]">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold leading-tight text-foreground">Encrypted end-to-end</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Powered by Fluid Pay · PCI-DSS Level 1
            </p>
          </div>
          <ShieldCheck className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs leading-relaxed" side="top">
        <div className="flex items-start gap-2 mb-2">
          <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="font-semibold text-sm text-foreground">Your card is safe.</p>
        </div>
        <p className="text-muted-foreground">
          R@lly never sees or stores your card number. The moment you tap Pay, your card is
          tokenized by <span className="text-foreground font-medium">Fluid Pay</span>, a
          PCI-DSS Level 1 certified processor — the same standard used by major banks.
        </p>
      </PopoverContent>
    </Popover>
  );
}
