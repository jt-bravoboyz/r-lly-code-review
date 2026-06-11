import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Copy, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  buildSettlementLink,
  getMethodLabel,
  methodRequiresManualSend,
  type SettlementMethod,
} from '@/lib/settlementLinks';
import { useSettlementReturn } from '@/hooks/useSettlementReturn';
import { copyToClipboard } from '@/lib/nativeShare';

interface TabPaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  splitTargetId: string;
  splitRequestId: string;
  eventId: string | null;
  payeeId: string;
  payerId: string;
  amountCents: number;
  eventTitle: string;
  onSettled: () => void;
}

interface PayeeProfile {
  display_name: string | null;
  venmo_handle: string | null;
  cashapp_handle: string | null;
  paypal_handle: string | null;
  apple_cash_handle: string | null;
  preferred_settlement: SettlementMethod | 'card' | null;
}

const METHODS: SettlementMethod[] = ['venmo', 'cashapp', 'paypal', 'apple_cash'];

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function TabPaySheet({
  open,
  onOpenChange,
  splitTargetId,
  splitRequestId,
  eventId,
  payeeId,
  payerId,
  amountCents,
  eventTitle,
  onSettled,
}: TabPaySheetProps) {
  const { user } = useAuth();
  const [payee, setPayee] = useState<PayeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SettlementMethod | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmFor, setConfirmFor] = useState<{
    settlementId: string;
    method: SettlementMethod;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  // Manual-send overlay state (Apple Cash and any future copy-then-send methods)
  const [manualSend, setManualSend] = useState<{
    settlementId: string;
    method: SettlementMethod;
    handle: string;
    url: string;
  } | null>(null);

  const { startWatching, stopWatching } = useSettlementReturn((settlementId) => {
    // appStateChange fires while the sheet is closed — open confirm dialog.
    setConfirmFor((prev) => prev ?? { settlementId, method: selected ?? 'venmo' });
  });

  // Fetch payee profile when opened.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, venmo_handle, cashapp_handle, paypal_handle, apple_cash_handle, preferred_settlement')
        .eq('id', payeeId)
        .maybeSingle();
      if (cancelled) return;
      setPayee((data as PayeeProfile | null) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, payeeId]);

  const availableMethods = useMemo(() => {
    if (!payee) return [] as SettlementMethod[];
    return METHODS.filter((m) => !!handleFor(payee, m));
  }, [payee]);

  // Default selection — preferred if available & has handle, else first available.
  useEffect(() => {
    if (!payee) return;
    const pref = payee.preferred_settlement;
    if (pref && pref !== 'card' && handleFor(payee, pref)) {
      setSelected(pref);
    } else if (availableMethods.length) {
      setSelected(availableMethods[0]);
    } else {
      setSelected(null);
    }
  }, [payee, availableMethods]);

  // Order: preferred first, then the rest in canonical order.
  const orderedMethods = useMemo(() => {
    if (!payee) return METHODS;
    const pref = payee.preferred_settlement;
    if (pref && pref !== 'card') {
      return [pref, ...METHODS.filter((m) => m !== pref)];
    }
    return METHODS;
  }, [payee]);

  const payeeName = payee?.display_name || 'them';
  const amountLabel = formatDollars(amountCents);
  const amountDollars = amountCents / 100;
  const hasAnyHandle = availableMethods.length > 0;

  async function handleSend() {
    if (!selected || !payee || !user) return;
    const handle = handleFor(payee, selected);
    if (!handle) return;

    setSending(true);
    const { data: inserted, error } = await supabase
      .from('tab_settlements')
      .insert({
        split_target_id: splitTargetId,
        split_request_id: splitRequestId,
        event_id: eventId,
        payer_id: payerId,
        payee_id: payeeId,
        amount_cents: amountCents,
        method: selected,
        status: 'link_opened',
        link_opened_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !inserted) {
      setSending(false);
      toast.error('Could not start payment', { description: error?.message });
      return;
    }

    startWatching(inserted.id);
    const note = `R@lly · ${eventTitle}`;
    const url = buildSettlementLink(selected, handle, amountDollars, note);

    setSending(false);

    if (methodRequiresManualSend(selected)) {
      // Apple Cash: no pre-filled amount possible. Show overlay with copyable
      // amount and an "Open iMessage" button instead of auto-navigating.
      setManualSend({ settlementId: inserted.id, method: selected, handle, url });
      return;
    }

    onOpenChange(false);
    // Slight delay so the sheet close transition begins before navigation.
    setTimeout(() => {
      window.location.href = url;
    }, 80);
  }

  async function handleCopyAmount() {
    const ok = await copyToClipboard(amountDollars.toFixed(2));
    if (ok) toast.success(`Copied ${amountLabel}`);
    else toast.error('Could not copy amount');
  }

  function handleOpenManualLink() {
    if (!manualSend) return;
    const url = manualSend.url;
    setManualSend(null);
    onOpenChange(false);
    setTimeout(() => {
      window.location.href = url;
    }, 80);
  }

  async function handleConfirmYes() {
    if (!confirmFor) return;
    setConfirmBusy(true);
    const nowIso = new Date().toISOString();
    const autoConfirmIso = new Date(Date.now() + 86400000).toISOString();

    const { error: settleErr } = await supabase
      .from('tab_settlements')
      .update({
        status: 'sent',
        marked_sent_at: nowIso,
        app_returned_at: nowIso,
        auto_confirm_at: autoConfirmIso,
      })
      .eq('id', confirmFor.settlementId);

    if (settleErr) {
      setConfirmBusy(false);
      toast.error('Could not record payment', { description: settleErr.message });
      return;
    }

    await supabase
      .from('split_check_targets')
      .update({ status: 'settled' })
      .eq('id', splitTargetId);

    // Fire-and-forget: push the payee a heads-up so they can confirm.
    supabase.functions
      .invoke('notify-settlement-sent', { body: { settlementId: confirmFor.settlementId } })
      .catch((e) => console.warn('[TabPaySheet] notify-settlement-sent failed', e));

    setConfirmBusy(false);
    setConfirmFor(null);
    onSettled();
    toast.success(`Payment sent! ${payeeName} will confirm shortly.`);
  }

  async function handleConfirmNo() {
    if (!confirmFor) return;
    setConfirmBusy(true);
    const nowIso = new Date().toISOString();
    await supabase
      .from('tab_settlements')
      .update({ status: 'pending', app_returned_at: nowIso })
      .eq('id', confirmFor.settlementId);
    setConfirmBusy(false);
    setConfirmFor(null);
    stopWatching();
    toast('No problem — your balance is still open.');
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-white/10 bg-background/95 backdrop-blur-xl px-5 pb-8 pt-4 max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader className="text-left space-y-1">
            <SheetTitle className="font-[Montserrat] text-xl font-bold">
              Pay {payeeName}
            </SheetTitle>
            <div className="text-3xl font-[Montserrat] font-extrabold text-primary tracking-tight">
              {amountLabel}
            </div>
            <p className="text-sm text-muted-foreground truncate">{eventTitle}</p>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !hasAnyHandle ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{payeeName}</span>{' '}
                hasn't added payment handles yet. You can pay by card or remind
                them to add their Venmo or CashApp in Settings.
              </div>
              <Button
                variant="ghost"
                className="w-full text-sm text-muted-foreground"
                onClick={() => onOpenChange(false)}
              >
                Pay by card instead
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                {orderedMethods.map((method) => {
                  const handle = payee ? handleFor(payee, method) : null;
                  const isPreferred = payee?.preferred_settlement === method;
                  const isSelected = selected === method;
                  const disabled = !handle;
                  return (
                    <button
                      key={method}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelected(method)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all',
                        'min-h-[56px]',
                        disabled
                          ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                          : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07] active:scale-[0.99]',
                        isSelected && !disabled && 'border-primary/60 ring-2 ring-primary/40 bg-primary/10',
                        isPreferred && !isSelected && !disabled && 'ring-1 ring-primary/20'
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold font-[Montserrat] flex items-center gap-2">
                          {getMethodLabel(method)}
                          {isPreferred && (
                            <span className="text-[10px] uppercase tracking-wider text-primary">
                              Preferred
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {handle ?? `No ${getMethodLabel(method)} set`}
                        </span>
                      </div>
                      {isSelected && !disabled && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selected && methodRequiresManualSend(selected) && (
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-xs text-foreground/80">
                  Apple Cash is sent through iMessage — we'll open Messages
                  for you with the amount ready to copy.
                </div>
              )}

              <Button
                onClick={handleSend}
                disabled={!selected || sending}
                className="w-full h-12 rounded-full bg-primary text-primary-foreground font-[Montserrat] font-bold text-base hover:bg-primary/90"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  `Send via ${selected ? getMethodLabel(selected) : '…'}`
                )}
              </Button>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline py-2"
              >
                Pay by card instead
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Manual-send overlay (Apple Cash): no pre-filled amount, just copy+open */}
      <Sheet
        open={!!manualSend}
        onOpenChange={(o) => { if (!o) setManualSend(null); }}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-white/10 bg-background/95 backdrop-blur-xl px-5 pb-8 pt-5"
        >
          <SheetHeader className="text-left space-y-1">
            <SheetTitle className="font-[Montserrat] text-xl font-bold">
              Send {manualSend ? getMethodLabel(manualSend.method) : ''} to {payeeName}
            </SheetTitle>
            <p className="text-sm text-muted-foreground break-all">
              {manualSend?.handle}
            </p>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.08] px-4 py-5 flex items-center justify-between gap-3">
              <div className="font-[Montserrat] font-extrabold text-4xl text-primary tracking-tight tabular-nums">
                {amountLabel}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyAmount}
                className="h-10 rounded-full px-4 font-semibold"
              >
                <Copy className="h-4 w-4 mr-1.5" /> Copy
              </Button>
            </div>

            <Button
              onClick={handleOpenManualLink}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-[Montserrat] font-bold text-base hover:bg-primary/90"
            >
              <MessageCircle className="h-5 w-5 mr-2" /> Open iMessage
            </Button>

            <p className="text-xs text-center text-muted-foreground px-2">
              Send this exact amount as Apple Cash in iMessage.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!confirmFor}
        onOpenChange={(o) => {
          if (!o && !confirmBusy) setConfirmFor(null);
        }}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-white/10 bg-background/95 backdrop-blur-xl px-5 pb-8 pt-4"
        >
          <SheetHeader className="text-left space-y-1">
            <SheetTitle className="font-[Montserrat] text-xl font-bold">
              Did you send {amountLabel} to {payeeName}?
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              via {confirmFor ? getMethodLabel(confirmFor.method) : ''} · just now
            </p>
          </SheetHeader>

          <div className="mt-5 space-y-2">
            <Button
              onClick={handleConfirmYes}
              disabled={confirmBusy}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-[Montserrat] font-bold hover:bg-primary/90"
            >
              {confirmBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Yes, I sent it'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleConfirmNo}
              disabled={confirmBusy}
              className="w-full h-12 rounded-full text-muted-foreground"
            >
              I didn't send it
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function handleFor(p: PayeeProfile, m: SettlementMethod): string | null {
  const raw =
    m === 'venmo' ? p.venmo_handle
      : m === 'cashapp' ? p.cashapp_handle
      : m === 'paypal' ? p.paypal_handle
      : p.apple_cash_handle;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}
