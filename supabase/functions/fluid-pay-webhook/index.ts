import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/fluidPay.ts";

// TODO: signature verification once FLUID_PAY_WEBHOOK_SECRET is provisioned.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload = await req.json().catch(() => ({}));
    console.log("fluid-pay-webhook", JSON.stringify(payload));

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
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
