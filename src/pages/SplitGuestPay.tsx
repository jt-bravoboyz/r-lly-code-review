import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface TabInfo {
  amount_cents: number;
  display_name: string;
  email?: string;
  title: string;
  host_display_name: string;
  paid_at: string | null;
  expired: boolean;
  status: string;
  note?: string | null;
}

export default function SplitGuestPay() {
  const { requestId } = useParams<{ requestId: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const navigate = useNavigate();

  const [info, setInfo] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Card form
  const [cardName, setCardName] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [paying, setPaying] = useState(false);

  // Signup gate
  const [paid, setPaid] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    if (!requestId || !token) { setError('Invalid link'); setLoading(false); return; }
    supabase.functions.invoke('get-guest-tab', { body: { request_id: requestId, token } })
      .then(({ data, error }) => {
        if (error) { setError(error.message); return; }
        if (data?.error) { setError(String(data.error)); return; }
        setInfo(data as TabInfo);
        setSignupEmail(data.email ?? '');
        setSignupName(data.display_name ?? '');
        // Block back-to-pay if already paid
        if (data.paid_at) {
          setPaid(true);
          setPaidAmount(data.amount_cents);
        }
      })
      .finally(() => setLoading(false));
  }, [requestId, token]);

  const pay = async () => {
    if (!info || paying) return;
    if (cardLast4.length < 4) return toast.error('Enter your card details');
    setPaying(true);
    try {
      // Simulated card token for now (matches existing in-app pattern)
      const payment_token = `simulated_${crypto.randomUUID()}`;
      const { data, error } = await supabase.functions.invoke('process-guest-pay', {
        body: {
          request_id: requestId,
          token,
          payment_token,
          card_last4: cardLast4.slice(-4),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      // Lock the screen — immediately enter signup gate
      setPaid(true);
      setPaidAmount(data.amount_cents ?? info.amount_cents);
      // Best-effort haptic
      try { (navigator as any).vibrate?.(20); } catch { /* */ }
    } catch (e: any) {
      toast.error(e?.message ?? 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const signupAndClaim = async () => {
    if (signingUp) return;
    if (!signupEmail || !signupPassword || !signupName) return toast.error('Fill every field');
    if (signupPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setSigningUp(true);
    try {
      const { data: sign, error: signErr } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/tabs`,
          data: { display_name: signupName, full_name: signupName },
        },
      });
      if (signErr) throw signErr;
      // If session is created (auto-confirm or already signed in), claim now
      if (sign.session) {
        await supabase.functions.invoke('claim-guest-payment', {
          body: { request_id: requestId, token },
        });
        toast.success('Locked in — welcome to R@lly');
        navigate('/tabs');
      } else {
        toast.success('Check your email to verify, then sign in to see your tabs.');
        navigate('/auth/return');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Signup failed');
    } finally {
      setSigningUp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="text-lg font-semibold mb-1">Link unavailable</div>
          <div className="text-sm text-muted-foreground">{error ?? 'This pay link is no longer valid.'}</div>
        </div>
      </div>
    );
  }

  const amountStr = `$${(info.amount_cents / 100).toFixed(2)}`;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted/30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-md mx-auto px-5 py-8 space-y-5">
        <div className="text-center mb-2">
          <div className="text-xs font-bold tracking-[0.2em] text-primary uppercase">R@lly Tab</div>
          <div className="text-3xl font-bold mt-1">{info.title}</div>
        </div>

        {!paid ? (
          <>
            <div className="rounded-3xl bg-card border border-border/60 p-6 text-center shadow-xl">
              <div className="text-sm text-muted-foreground">You owe</div>
              <div className="text-5xl font-bold mt-1 tabular-nums text-primary">{amountStr}</div>
              <div className="text-sm text-muted-foreground mt-2">to {info.host_display_name}</div>
              {info.note && <div className="text-xs text-muted-foreground mt-3 italic">"{info.note}"</div>}
            </div>

            <div className="rounded-3xl bg-card border border-border/60 p-5 space-y-3">
              <div>
                <Label htmlFor="card-name">Name on card</Label>
                <Input id="card-name" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div>
                <Label htmlFor="card-num">Card last 4 (demo)</Label>
                <Input id="card-num" value={cardLast4} onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric" placeholder="4242" maxLength={4} />
                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Demo checkout — full card form ships with Fluid Pay
                </div>
              </div>
              <Button onClick={pay} disabled={paying} className="w-full rounded-full h-12 font-bold text-base">
                {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Lock className="h-4 w-4 mr-2" /> Pay {amountStr}</>}
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              No R@lly account needed to pay. We'll email your receipt.
            </div>
          </>
        ) : (
          <PostPaySignupGate
            amountStr={`$${(paidAmount / 100).toFixed(2)}`}
            email={signupEmail}
            setEmail={setSignupEmail}
            password={signupPassword}
            setPassword={setSignupPassword}
            name={signupName}
            setName={setSignupName}
            signingUp={signingUp}
            onSubmit={signupAndClaim}
          />
        )}
      </div>
    </div>
  );
}

function PostPaySignupGate(props: {
  amountStr: string;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  name: string; setName: (v: string) => void;
  signingUp: boolean;
  onSubmit: () => void;
}) {
  return (
    <div
      // Block back nav with history pushing — non-dismissible feel.
      // The actual hard-block is "no skip button"; the user can only close the tab.
      className="rounded-3xl bg-card border border-primary/30 p-6 shadow-2xl space-y-4 ring-1 ring-primary/20"
    >
      <div className="text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <div className="text-2xl font-bold">Payment secured</div>
        <div className="text-sm text-muted-foreground mt-1">
          Save your receipt and lock in your R@lly username
        </div>
        <div className="mt-2 text-xs font-bold text-primary tabular-nums">{props.amountStr} paid</div>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="gs-email">Email</Label>
          <Input id="gs-email" type="email" value={props.email} onChange={(e) => props.setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="gs-name">R@lly username</Label>
          <Input id="gs-name" value={props.name} onChange={(e) => props.setName(e.target.value)} maxLength={40} autoComplete="nickname" />
        </div>
        <div>
          <Label htmlFor="gs-pw">Password</Label>
          <Input id="gs-pw" type="password" value={props.password} onChange={(e) => props.setPassword(e.target.value)} autoComplete="new-password" />
          <div className="text-[10px] text-muted-foreground mt-1">8+ characters</div>
        </div>
      </div>

      <Button
        onClick={props.onSubmit}
        disabled={props.signingUp}
        className="w-full rounded-full h-12 font-bold text-base bg-primary text-primary-foreground"
      >
        {props.signingUp ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Lock it in'}
      </Button>

      <div className="text-center text-xs text-muted-foreground">
        Receipt was emailed to {props.email || 'you'}
      </div>
    </div>
  );
}
