import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CreditCard, Check } from 'lucide-react';
import { useFluidPay } from '@/hooks/useFluidPay';

interface Props {
  amountCents: number;
  onTokenize: (token: string, brand: string, last4: string, save: boolean) => Promise<void>;
  submitLabel?: string;
  showSaveOption?: boolean;
}

function detectBrand(num: string): 'visa' | 'mastercard' | 'amex' | 'discover' | 'card' {
  const n = num.replace(/\s+/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(n)) return 'discover';
  return 'card';
}

function formatCard(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExp(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length < 3) return d;
  return `${d.slice(0, 2)} / ${d.slice(2)}`;
}

const BrandGlyph = ({ brand }: { brand: string }) => {
  const base = 'h-5 px-1.5 rounded text-[9px] font-bold flex items-center justify-center text-white';
  switch (brand) {
    case 'visa': return <span className={`${base} bg-[#1a1f71]`}>VISA</span>;
    case 'mastercard': return <span className={`${base} bg-gradient-to-r from-[#eb001b] to-[#f79e1b]`}>MC</span>;
    case 'amex': return <span className={`${base} bg-[#2e77bb]`}>AMEX</span>;
    case 'discover': return <span className={`${base} bg-[#ff6000]`}>DISC</span>;
    default: return <CreditCard className="h-4 w-4 text-muted-foreground" />;
  }
};

export function FluidPayCardForm({ amountCents, onTokenize, submitLabel, showSaveOption = true }: Props) {
  const { config } = useFluidPay();
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const brand = useMemo(() => detectBrand(number), [number]);
  const cardValid = number.replace(/\s/g, '').length >= 13;
  const expValid = exp.replace(/\D/g, '').length === 4;
  const cvvValid = cvv.length >= 3;
  const allValid = cardValid && expValid && cvvValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const cleaned = number.replace(/\s+/g, '');
      const last4 = cleaned.slice(-4);
      const token = `tok_sandbox_${Date.now()}_${last4}`;
      await onTokenize(token, brand, last4, save);
    } catch (e: any) {
      setErr(e?.message ?? 'Payment failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!config?.configured && (
        <div className="text-[10px] rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-muted-foreground text-center">
          Sandbox mode — Fluid Pay keys not yet provisioned
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="cc-number" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          Card number
        </Label>
        <div className="relative">
          <Input
            id="cc-number"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            value={number}
            onChange={e => setNumber(formatCard(e.target.value))}
            className="h-12 pr-14 font-mono tracking-wide text-base rounded-2xl"
            required
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {cardValid && <Check className="h-3.5 w-3.5 text-primary" />}
            <BrandGlyph brand={brand} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cc-exp" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Expires
          </Label>
          <Input
            id="cc-exp"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            value={exp}
            onChange={e => setExp(formatExp(e.target.value))}
            className="h-12 font-mono text-base rounded-2xl"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cc-cvv" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            CVV
          </Label>
          <Input
            id="cc-cvv"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvv}
            onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="h-12 font-mono text-base rounded-2xl"
            required
          />
        </div>
      </div>

      {showSaveOption && (
        <label className="flex items-center gap-2.5 text-sm pt-1 cursor-pointer select-none">
          <Checkbox checked={save} onCheckedChange={(v) => setSave(!!v)} />
          <span className="text-foreground/80">Save for one-tap pay next R@lly</span>
        </label>
      )}

      {err && <p className="text-sm text-destructive">{err}</p>}

      <Button
        type="submit"
        className="w-full h-14 rounded-2xl text-base font-semibold bg-gradient-to-b from-primary to-primary/85 hover:from-primary hover:to-primary shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.25)] active:scale-[0.99] transition-transform disabled:opacity-60"
        disabled={busy || !allValid}
      >
        {busy ? (
          <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processing…</>
        ) : (
          <>{submitLabel ?? `Pay $${(amountCents / 100).toFixed(2)}`}</>
        )}
      </Button>
    </form>
  );
}
