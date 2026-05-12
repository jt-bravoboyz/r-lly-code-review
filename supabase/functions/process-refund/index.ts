import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders, loadFluidPayConfig, notConfiguredResponse } from "../_shared/fluidPay.ts";

const BodySchema = z.object({
  payment_id: z.string().uuid(),
  amount_cents: z.number().int().positive().optional(),
  reason: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const cfg = loadFluidPayConfig();
    if (!cfg.privateKey) return notConfiguredResponse(corsHeaders, "FLUID_PAY_PRIVATE_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = claims.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: corsHeaders });
    }
    const { payment_id, amount_cents, reason } = parsed.data;

    const { data: orig } = await admin.from("payments").select("*").eq("id", payment_id).maybeSingle();
    if (!orig) return new Response(JSON.stringify({ error: "payment_not_found" }), { status: 404, headers: corsHeaders });

    // Authorize: host/cohost or admin
    const { data: hostCheck } = await admin.rpc("is_event_host_or_cohost", { p_event_id: orig.event_id, p_user_id: userId });
    const { data: roleCheck } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!hostCheck && !roleCheck) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    const refundAmount = amount_cents ?? orig.amount_cents;

    const fpRes = await fetch(`${cfg.baseUrl}/transaction/${orig.fluid_pay_transaction_id}/refund`, {
      method: "POST",
      headers: { "Authorization": cfg.privateKey, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: refundAmount }),
    });
    const fpJson = await fpRes.json().catch(() => ({}));
    if (!fpRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: fpJson?.msg ?? `HTTP ${fpRes.status}` }), { status: 402, headers: corsHeaders });
    }

    // Insert refund payment row
    const { data: refundRow } = await admin.from("payments").insert({
      event_id: orig.event_id,
      user_id: orig.user_id,
      profile_id: orig.profile_id,
      amount_cents: refundAmount,
      kind: "refund",
      parent_payment_id: orig.id,
      fluid_pay_transaction_id: fpJson?.data?.id ?? null,
      status: "paid",
      metadata: { reason: reason ?? null, source: fpJson },
    }).select("id").single();

    const newStatus = refundAmount >= orig.amount_cents ? "refunded" : "partially_refunded";
    await admin.from("payments").update({ status: newStatus }).eq("id", orig.id);

    // Flip target status if it was a split_share
    if (orig.kind === "split_share" && orig.split_request_id) {
      await admin.from("split_check_targets").update({ status: "refunded" })
        .eq("request_id", orig.split_request_id).eq("profile_id", orig.profile_id);
    }

    // Notify the original payer
    if (orig.profile_id) {
      await admin.from("notifications").insert({
        profile_id: orig.profile_id,
        type: "refund_issued",
        title: "Refund issued",
        body: `$${(refundAmount / 100).toFixed(2)} refunded`,
        data: { payment_id: refundRow?.id, parent_payment_id: orig.id, event_id: orig.event_id },
        read: false,
      });
    }

    return new Response(JSON.stringify({ ok: true, refund_id: refundRow?.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-refund error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
