// supabase/functions/auto-confirm-settlements/index.ts
// Scheduled (cron) — auto-confirms tab settlements whose 24h window has elapsed.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const METHOD_LABEL: Record<string, string> = {
  venmo: "Venmo",
  cashapp: "CashApp",
  paypal: "PayPal",
  card: "card",
  other: "other",
};

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const nowIso = new Date().toISOString();

    // 1. Find ready-to-confirm settlements
    const { data: due, error: dueErr } = await supabase
      .from("tab_settlements")
      .select(
        "id, payer_id, payee_id, amount_cents, method, split_request_id, event_id"
      )
      .eq("status", "sent")
      .lte("auto_confirm_at", nowIso);

    if (dueErr) throw dueErr;
    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ confirmed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Mark confirmed
    const ids = due.map((d) => d.id);
    const { error: updErr } = await supabase
      .from("tab_settlements")
      .update({ status: "confirmed", confirmed_at: nowIso })
      .in("id", ids);
    if (updErr) throw updErr;

    // 3. Notify both parties
    const allProfileIds = Array.from(
      new Set(due.flatMap((d) => [d.payer_id, d.payee_id]))
    );
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", allProfileIds);
    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? "Someone"])
    );

    let pushed = 0;
    for (const s of due) {
      const payerName = nameById.get(s.payer_id) ?? "Someone";
      const payeeName = nameById.get(s.payee_id) ?? "Someone";
      const methodLabel = METHOD_LABEL[s.method] ?? s.method;
      const amount = fmtMoney(s.amount_cents);

      const dataPayload = {
        type: "settlement_confirmed",
        settlementId: s.id,
        splitRequestId: s.split_request_id,
        eventId: s.event_id,
      };

      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            driverProfileIds: [s.payer_id],
            title: "Payment confirmed",
            body: `Your payment to ${payeeName} is confirmed. ✓`,
            data: dataPayload,
            tag: `settlement-${s.id}-payer`,
          }),
        });
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            driverProfileIds: [s.payee_id],
            title: "Payment confirmed",
            body: `${payerName} sent you ${amount} via ${methodLabel}. Payment confirmed. ✓`,
            data: dataPayload,
            tag: `settlement-${s.id}-payee`,
          }),
        });
        pushed++;
      } catch (e) {
        console.error("[auto-confirm] push failed", s.id, e);
      }
    }

    return new Response(
      JSON.stringify({ confirmed: due.length, pushed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[auto-confirm-settlements]", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
