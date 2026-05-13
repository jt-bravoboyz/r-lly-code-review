import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CoverChargeDialog } from '@/components/payments/CoverChargeDialog';
import { useAuth } from '@/hooks/useAuth';

interface EventLike {
  id: string;
  title: string;
  cover_charge?: number | null;
}

interface ProfileLike {
  id?: string;
  founder_number?: number | null;
  fluid_pay_token?: string | null;
  fluid_pay_card_last4?: string | null;
  fluid_pay_card_brand?: string | null;
}

/**
 * Centralizes the "do I owe a cover charge before joining?" gate.
 *
 * Strict order:
 *   1. If cover_charge is null/0 → no gate, resolve true immediately.
 *   2. If a succeeded `cover` payment already exists for this user+event →
 *      resolve true without showing UI (anti double-charge).
 *   3. Otherwise show CoverChargeDialog and resolve true on onPaid,
 *      false if the user dismisses.
 *
 * Existing attendees are unaffected — callers only invoke ensurePaid()
 * before the join RPC, which itself short-circuits when the user is
 * already attending.
 */
export function useCoverChargeGate(
  event: EventLike | null | undefined,
  profile: ProfileLike | null | undefined,
) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const cover = Number(event?.cover_charge ?? 0);
  const amountCents = Math.round(cover * 100);

  const ensurePaid = useCallback(async (): Promise<boolean> => {
    // 1. Strict gate: only ever trigger when there's a real cover charge.
    if (!event || !(cover > 0)) return true;

    // 2. Anti-double-charge: existing succeeded cover payment?
    if (user?.id) {
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .eq('kind', 'cover')
        .eq('status', 'succeeded')
        .limit(1)
        .maybeSingle();
      if (existing) return true;
    }

    // 3. Open dialog and wait for outcome.
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpen(true);
    });
  }, [event, cover, user?.id]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v && resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  const dialog = event && cover > 0 ? (
    <CoverChargeDialog
      open={open}
      onOpenChange={handleOpenChange}
      eventId={event.id}
      eventTitle={event.title}
      amountCents={amountCents}
      founderWaived={!!profile?.founder_number}
      savedToken={profile?.fluid_pay_token ?? null}
      savedCardLast4={profile?.fluid_pay_card_last4 ?? null}
      savedCardBrand={profile?.fluid_pay_card_brand ?? null}
      onPaid={(paymentId) => {
        // Best-effort attribution; ignore failure.
        if (profile?.id) {
          supabase.from('event_attendees')
            .update({ cover_payment_id: paymentId } as any)
            .eq('event_id', event.id)
            .eq('profile_id', profile.id)
            .then(() => {});
        }
        const r = resolverRef.current;
        resolverRef.current = null;
        setOpen(false);
        r?.(true);
      }}
    />
  ) : null;

  return { ensurePaid, dialog };
}
