import { ShieldCheck } from 'lucide-react';

export function PoweredByFluidPay({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground ${className}`}>
      <ShieldCheck className="h-3 w-3" />
      <span>Powered by Fluid Pay</span>
    </div>
  );
}
