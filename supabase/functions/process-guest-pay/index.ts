// Public, no-JWT endpoint that lets a non-authenticated guest pay a R@lly Tab
// share via a token link. Profile creation happens AFTER payment via the
// post-pay signup gate in SplitGuestPay.tsx.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders, loadFluidPayConfig, notConfiguredResponse } from "../_shared/fluidPay.ts";

const BodySchema = z.object({
  request_id: z.string().uuid(),
  token: z.string().min(16).max(128),
  payment_token: z.string().min(1),
  card_brand: z.string().optional(),
  card_last4: z.string().optional(),
});

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cfg = loadFluidPayConfig();
    if (!cfg.privateKey) return notConfiguredResponse(corsHeaders, "FLUID_PAY_PRIVATE_KEY");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = parsed.data;
    const tokenHash = await sha256Hex(body.token);

    const { data: gt } = await admin.from("split_guest_tokens")
      .select("id, request_id, amount_cents, paid_at, expires_at, display_name, email")
      .eq("request_id", body.request_id)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!gt) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (gt.paid_at) {
      return new Response(JSON.stringify({ error: "already_paid" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(gt.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve destination
    const { data: sr } = await admin.from("split_check_requests")
      .select("host_id, status, title").eq("id", body.request_id).maybeSingle();
    if (!sr) {
      return new Response(JSON.stringify({ error: "request_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sr.status === "canceled") {
      return new Response(JSON.stringify({ error: "request_canceled" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let destination: string | null = cfg.platformMasterSubMerchantId;
    const { data: ma } = await admin.from("merchant_accounts")
      .select("fluid_pay_sub_merchant_id, status, payouts_enabled")
      .eq("profile_id", sr.host_id).maybeSingle();
    if (ma?.status === "active" && ma.payouts_enabled && ma.fluid_pay_sub_merchant_id) {
      destination = ma.fluid_pay_sub_merchant_id;
    }

    const platform_fee_cents = Math.round(gt.amount_cents * cfg.platformFeePercent / 100);
    const host_net_cents = gt.amount_cents - platform_fee_cents;

    const { data: pending, error: insErr } = await admin.from("payments").insert({
      event_id: null,
      user_id: null,
      profile_id: null,
      amount_cents: gt.amount_cents,
      kind: "split_share",
      split_request_id: body.request_id,
      destination_sub_merchant_id: destination,
      platform_fee_cents,
      host_net_cents,
      status: "pending",
      metadata: { guest_token_id: gt.id, display_name: gt.display_name },
    }).select("id").single();
    if (insErr) throw insErr;

    const isSimulated = body.payment_token.startsWith("simulated_") || body.payment_token.startsWith("tok_sandbox_");
    let fpJson: any = null;
    let txId: string | null = null;

    if (isSimulated) {
      fpJson = { simulated: true };
      txId = `sim_${pending.id}`;
    } else {
      const fpRes = await fetch(`${cfg.baseUrl}/transaction/sale`, {
        method: "POST",
        headers: { "Authorization": cfg.privateKey!, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: gt.amount_cents,
          order_id: pending.id,
          payment_method: { token: body.payment_token },
          merchant_id: destination,
        }),
      });
      fpJson = await fpRes.json().catch(() => ({}));
      if (!fpRes.ok || fpJson?.status === "declined" || fpJson?.status === "error") {
        const rawMsg = fpJson?.msg ?? `HTTP ${fpRes.status}`;
        await admin.from("payments").update({
          status: "failed", error_message: rawMsg, metadata: { ...fpJson, guest_token_id: gt.id },
        }).eq("id", pending.id);
        return new Response(JSON.stringify({
          ok: false, error: fpJson?.msg ?? "payment_declined", payment_id: pending.id,
        }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      txId = fpJson?.data?.id ?? fpJson?.id ?? null;
    }

    await admin.from("payments").update({
      status: "paid",
      fluid_pay_transaction_id: txId,
      metadata: { ...fpJson, guest_token_id: gt.id, display_name: gt.display_name },
    }).eq("id", pending.id);

    await admin.from("split_guest_tokens").update({
      paid_at: new Date().toISOString(),
      fluid_pay_transaction_id: txId,
      payment_id: pending.id,
    }).eq("id", gt.id);

    return new Response(JSON.stringify({
      ok: true,
      payment_id: pending.id,
      transaction_id: txId,
      amount_cents: gt.amount_cents,
      title: sr.title ?? "R@lly Tab",
      prefill_email: gt.email,
      prefill_display_name: gt.display_name,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("process-guest-pay error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
