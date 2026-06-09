// supabase/functions/notify-settlement-sent/index.ts
// Called by the client right after a settlement is marked 'sent'.
// Pushes a heads-up to the payee.
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
    const { settlementId } = await req.json();
    if (!settlementId || typeof settlementId !== "string") {
      return new Response(
        JSON.stringify({ error: "settlementId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: settlement, error: sErr } = await supabase
      .from("tab_settlements")
      .select("id, payer_id, payee_id, amount_cents, method, split_request_id, event_id")
      .eq("id", settlementId)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!settlement) {
      return new Response(
        JSON.stringify({ error: "Settlement not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [settlement.payer_id, settlement.payee_id]);
    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? "Someone"])
    );
    const payerName = nameById.get(settlement.payer_id) ?? "Someone";

    let eventTitle: string | null = null;
    if (settlement.event_id) {
      const { data: ev } = await supabase
        .from("events")
        .select("title")
        .eq("id", settlement.event_id)
        .maybeSingle();
      eventTitle = ev?.title ?? null;
    }

    const methodLabel = METHOD_LABEL[settlement.method] ?? settlement.method;
    const amount = fmtMoney(settlement.amount_cents);
    const forText = eventTitle ? `for ${eventTitle}` : "for a tab";

    const pushBody = {
      driverProfileIds: [settlement.payee_id],
      title: `${payerName} paid you back`,
      body: `Sent ${amount} via ${methodLabel} ${forText}. Confirms automatically in 24 hours — check your ${methodLabel}.`,
      data: {
        type: "settlement_sent",
        settlementId: settlement.id,
        splitRequestId: settlement.split_request_id,
      },
      tag: `settlement-${settlement.id}-sent`,
    };

    const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(pushBody),
    });
    const pushResult = await res.text();

    return new Response(
      JSON.stringify({ ok: true, pushStatus: res.status, pushResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[notify-settlement-sent]", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
