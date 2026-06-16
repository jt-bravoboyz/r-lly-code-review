import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMerchantAccount } from '@/hooks/useMerchantAccount';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the wallet is fully active and ready to collect funds. */
  onActivated: () => void;
}

/**
 * Gates the "New Tab" flow. If a user doesn't yet have a Fluid Pay sub-merchant
 * (R@lly Wallet), this guides them through the 1-minute setup in plain English
 * before letting them build a tab that would otherwise fail with
 * `payouts_not_enabled` at submit time.
 */
export function SetupWalletDialog({ open, onOpenChange, onActivated }: Props) {
  const { profile } = useAuth();
  const { account, loading, start, refresh } = useMerchantAccount(profile?.id ?? null);

  const [legalName, setLegalName] = useState('');
  const [country] = useState('US');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const lockRef = useRef(false);
  const handedOffRef = useRef(false);

  // Seed legal name from profile when dialog opens.
  useEffect(() => {
    if (open) {
      setLegalName((prev) => prev || profile?.display_name || '');
      setErrorMsg(null);
      handedOffRef.current = false;
    }
  }, [open, profile?.display_name]);

  // If wallet is already active when dialog opens, fast-track to the tab flow.
  useEffect(() => {
    if (!open || handedOffRef.current) return;
    if (account?.status === 'active' && account.payouts_enabled) {
      handedOffRef.current = true;
      onOpenChange(false);
      onActivated();
    }
  }, [open, account?.status, account?.payouts_enabled, onOpenChange, onActivated]);

  // Auto-poll while pending so the user sees activation land without a manual tap.
  useEffect(() => {
    if (!open) return;
    if (account?.status !== 'pending') return;
    const id = window.setInterval(() => { refresh().catch(() => {}); }, 4000);
    return () => window.clearInterval(id);
  }, [open, account?.status, refresh]);

  const handleActivate = async () => {
    if (lockRef.current) return;
    if (!legalName.trim()) { toast.error('Add the name on your bank account'); return; }
    lockRef.current = true; setBusy(true); setErrorMsg(null);
    try {
      const { data, error } = await start(legalName.trim(), country);
      if (error) throw error;
      if (data && (data as any).ok === false) {
        const msg = (data as any).error ?? 'Could not start your wallet';
        if (msg === 'merchant_onboarding_not_configured') {
          setErrorMsg('Payments aren\'t turned on for this environment yet. Hang tight.');
        } else {
          setErrorMsg(typeof msg === 'string' ? msg : 'Could not start your wallet');
        }
        return;
      }
      toast.success('Wallet started — we\'re verifying now');
    } catch (e: any) {
      let code: string | undefined;
      try { code = (await (e as any).context?.json?.())?.error; } catch {}
      setErrorMsg(code ?? e?.message ?? 'Could not start your wallet');
    } finally {
      setBusy(false); lockRef.current = false;
    }
  };

  const status = account?.status ?? 'not_started';
  const isActive = status === 'active' && account?.payouts_enabled;
  const isPending = status === 'pending';
  const isRejected = status === 'rejected' || status === 'disabled';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/60">
        {/* Hero */}
        <div className="relative px-6 pt-7 pb-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/30 mb-3">
            {isActive ? (
              <CheckCircle2 className="h-6 w-6 text-primary" strokeWidth={2.5} />
            ) : (
              <Wallet className="h-6 w-6 text-primary" strokeWidth={2.5} />
            )}
          </div>
          <h2 className="text-[22px] font-bold tracking-tight font-montserrat leading-tight">
            {isActive ? (
              "You're set."
            ) : isPending ? (
              'Verifying your wallet…'
            ) : (
              <>Set up your R<span className="text-primary" style={{ display: 'inline-block' }}>@</span>lly Tab</>
            )}
          </h2>
          <p className="text-[13.5px] text-muted-foreground leading-snug mt-1.5">
            {isActive
              ? 'Your wallet is ready. Let\'s start that tab.'
              : isPending
                ? "We're checking your details with our payments partner. Usually under a minute."
                : "Your wallet is how you collect from the crew when you start a tab. Takes about a minute."}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-4 space-y-4">
          {loading && !account && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your wallet…
            </div>
          )}

          {!loading && !isActive && !isPending && (
            <>
              <div>
                <Label htmlFor="legal-name" className="text-[12px] uppercase tracking-tight text-foreground/80 font-semibold">
                  Name on your bank account
                </Label>
                <Input
                  id="legal-name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Jordan Rivera"
                  className="h-11 mt-1.5"
                  maxLength={120}
                  autoFocus
                />
                <p className="text-[11.5px] text-muted-foreground mt-1.5">
                  Used to verify you can receive payouts. We don't share this with your crew.
                </p>
              </div>

              {isRejected && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[12.5px] text-amber-700 dark:text-amber-400">
                    Your last verification didn't go through. Update your name and try again, or contact support.
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-[12.5px] text-destructive">{errorMsg}</p>
                </div>
              )}

              <Button
                onClick={handleActivate}
                disabled={busy || !legalName.trim()}
                className="w-full h-12 rounded-full font-bold font-montserrat text-[15px] shadow-[0_10px_30px_rgba(244,122,25,0.35)]"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activate my wallet'}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Powered by Fluid Pay · No fees to set up
              </p>
            </>
          )}

          {isPending && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                <div className="text-[13px] text-foreground/80">
                  Hang tight — we'll flip you live the moment verification clears.
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => refresh()}
                className="w-full h-11 rounded-full font-semibold"
              >
                Check status now
              </Button>
            </div>
          )}

          {isActive && (
            <Button
              onClick={() => { handedOffRef.current = true; onOpenChange(false); onActivated(); }}
              className="w-full h-12 rounded-full font-bold font-montserrat text-[15px]"
            >
              Start a tab
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
