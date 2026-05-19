import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/fluidPay.ts";

// Constant-time hex comparison to prevent timing attacks.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const secret = Deno.env.get("FLUID_PAY_WEBHOOK_SECRET");
    if (!secret) {
      console.error("fluid-pay-webhook: FLUID_PAY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "webhook_not_configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Read raw bytes ONCE — signature math must match exactly what Fluid Pay signed.
    const rawBody = await req.text();

    const provided =
      req.headers.get("x-fluidpay-signature") ??
      req.headers.get("x-fluid-pay-signature") ??
      req.headers.get("x-signature") ??
      "";
    const cleaned = provided.replace(/^sha256=/i, "").trim().toLowerCase();
    if (!cleaned) {
      return new Response(
        JSON.stringify({ error: "missing_signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const expected = await hmacSha256Hex(secret, rawBody);
    if (!timingSafeEqual(cleaned, expected)) {
      console.warn("fluid-pay-webhook: signature mismatch");
      return new Response(
        JSON.stringify({ error: "invalid_signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verified — safe to parse and act.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let payload: any = {};
    try { payload = JSON.parse(rawBody || "{}"); } catch { payload = {}; }
    console.log("fluid-pay-webhook verified", JSON.stringify({ event: payload?.event ?? payload?.type }));

    const eventType = payload?.event ?? payload?.type;
    const subId = payload?.data?.merchant_id ?? payload?.merchant_id;

    if (!subId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: corsHeaders });
    }

    const { data: ma } = await admin.from("merchant_accounts")
      .select("id, profile_id").eq("fluid_pay_sub_merchant_id", subId).maybeSingle();
    if (!ma) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: corsHeaders });
    }

    if (eventType === "merchant.active" || payload?.data?.status === "active") {
      await admin.from("merchant_accounts").update({
        status: "active",
        payouts_enabled: true,
        last_synced_at: new Date().toISOString(),
      }).eq("id", ma.id);
      await admin.from("notifications").insert({
        profile_id: ma.profile_id,
        type: "payouts_enabled",
        title: "Payouts active",
        body: "Funds will route directly to your account.",
        data: { sub_merchant_id: subId },
        read: false,
      });
    } else if (eventType === "merchant.rejected" || payload?.data?.status === "rejected") {
      await admin.from("merchant_accounts").update({
        status: "rejected",
        last_synced_at: new Date().toISOString(),
      }).eq("id", ma.id);
      await admin.from("notifications").insert({
        profile_id: ma.profile_id,
        type: "payouts_action_required",
        title: "Payout setup needs attention",
        body: "Open Payout Settings to continue.",
        data: { sub_merchant_id: subId },
        read: false,
      });
    } else if (eventType === "merchant.requirements_updated") {
      await admin.from("merchant_accounts").update({
        requirements_due: payload?.data?.requirements_due ?? [],
        last_synced_at: new Date().toISOString(),
      }).eq("id", ma.id);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    console.error("fluid-pay-webhook error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
