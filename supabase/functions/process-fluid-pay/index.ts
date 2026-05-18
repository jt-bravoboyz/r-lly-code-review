import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders, loadFluidPayConfig, notConfiguredResponse } from "../_shared/fluidPay.ts";

const BodySchema = z.object({
  payment_token: z.string().min(1),
  amount_cents: z.number().int().positive(),
  kind: z.enum(["cover", "split_share"]),
  event_id: z.string().uuid().optional().nullable(),
  split_request_id: z.string().uuid().optional().nullable(),
  save_token: z.boolean().optional(),
  card_brand: z.string().optional(),
  card_last4: z.string().optional(),
  idempotency_key: z.string().min(8).max(128).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cfg = loadFluidPayConfig();
    if (!cfg.privateKey) return notConfiguredResponse(corsHeaders, "FLUID_PAY_PRIVATE_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const body = parsed.data;

    // Production rule: split_share payments MUST carry an idempotency key
    if (body.kind === "split_share" && !body.idempotency_key) {
      return new Response(
        JSON.stringify({ ok: false, error: "idempotency_key_required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isSimulatedToken = body.payment_token.startsWith("simulated_") || body.payment_token.startsWith("tok_sandbox_");

    // Resolve payer profile
    const { data: payerProfile } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();

    // Idempotency short-circuit: replayed key returns the original payment without re-charging
    if (body.idempotency_key) {
      const { data: existing } = await admin.from("payments")
        .select("id, status, fluid_pay_transaction_id")
        .eq("idempotency_key", body.idempotency_key)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({
          ok: existing.status === "paid",
          payment_id: existing.id,
          transaction_id: existing.fluid_pay_transaction_id,
          deduped: true,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Split-share dedupe: if this payer already paid this request, return without re-charging
    if (body.kind === "split_share" && body.split_request_id && payerProfile?.id) {
      const { data: paidTarget } = await admin.from("split_check_targets")
        .select("payment_id, status")
        .eq("request_id", body.split_request_id)
        .eq("profile_id", payerProfile.id)
        .maybeSingle();
      if (paidTarget?.status === "paid" && paidTarget.payment_id) {
        return new Response(JSON.stringify({
          ok: true,
          payment_id: paidTarget.payment_id,
          deduped: true,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Snapshot-claim validation: for itemized splits, recompute the payer's share
    // from current claims and reject if it drifted from the amount the client sent.
    if (body.kind === "split_share" && body.split_request_id && payerProfile?.id) {
      const { data: reqRow } = await admin.from("split_check_requests")
        .select("mode, status").eq("id", body.split_request_id).maybeSingle();
      if (reqRow?.status === "canceled") {
        return new Response(JSON.stringify({ ok: false, error: "request_canceled" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (reqRow?.mode === "itemized") {
        const { data: snap } = await admin.rpc("compute_itemized_share", {
          p_request_id: body.split_request_id, p_profile_id: payerProfile.id,
        });
        const row = Array.isArray(snap) ? snap[0] : snap;
        const serverTotal = row?.total_cents ?? 0;
        if (serverTotal !== body.amount_cents) {
          return new Response(JSON.stringify({
            ok: false, error: "claim_snapshot_mismatch",
            server_total_cents: serverTotal, client_total_cents: body.amount_cents,
          }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // Resolve destination sub-merchant via event host
    let destination: string | null = cfg.platformMasterSubMerchantId;
    if (body.event_id) {
      const { data: ev } = await admin.from("events").select("creator_id").eq("id", body.event_id).maybeSingle();
      if (ev?.creator_id) {
        const { data: ma } = await admin.from("merchant_accounts")
          .select("fluid_pay_sub_merchant_id, status, payouts_enabled")
          .eq("profile_id", ev.creator_id).maybeSingle();
        if (ma?.status === "active" && ma.payouts_enabled && ma.fluid_pay_sub_merchant_id) {
          destination = ma.fluid_pay_sub_merchant_id;
        }
      }
    }

    const platform_fee_cents = Math.round(body.amount_cents * cfg.platformFeePercent / 100);
    const host_net_cents = body.amount_cents - platform_fee_cents;

    // Insert pending payment. The unique index on idempotency_key turns a racing duplicate
    // into a 23505 error, which we surface as the existing payment.
    const { data: pending, error: insErr } = await admin.from("payments").insert({
      event_id: body.event_id ?? null,
      user_id: userId,
      profile_id: payerProfile?.id ?? null,
      amount_cents: body.amount_cents,
      kind: body.kind,
      split_request_id: body.split_request_id ?? null,
      destination_sub_merchant_id: destination,
      platform_fee_cents,
      host_net_cents,
      status: "pending",
      idempotency_key: body.idempotency_key ?? null,
    }).select("id").single();
    if (insErr) {
      if ((insErr as any).code === "23505" && body.idempotency_key) {
        const { data: existing } = await admin.from("payments")
          .select("id, status, fluid_pay_transaction_id")
          .eq("idempotency_key", body.idempotency_key)
          .maybeSingle();
        if (existing) {
          return new Response(JSON.stringify({
            ok: existing.status === "paid",
            payment_id: existing.id,
            transaction_id: existing.fluid_pay_transaction_id,
            deduped: true,
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      throw insErr;
    }

    let fpJson: any = null;
    let txId: string | null = null;

    if (isSimulatedToken) {
      // Simulated path: skip Fluid Pay entirely, record success locally.
      fpJson = { simulated: true };
      txId = `sim_${pending.id}`;
    } else {
      // Call Fluid Pay /transaction/sale
      const fpRes = await fetch(`${cfg.baseUrl}/transaction/sale`, {
        method: "POST",
        headers: {
          "Authorization": cfg.privateKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: body.amount_cents,
          order_id: pending.id,
          payment_method: { token: body.payment_token },
          merchant_id: destination,
        }),
      });
      fpJson = await fpRes.json().catch(() => ({}));

      if (!fpRes.ok || fpJson?.status === "declined" || fpJson?.status === "error") {
        const rawMsg = fpJson?.msg ?? `HTTP ${fpRes.status}`;
        await admin.from("payments").update({
          status: "failed",
          error_message: rawMsg,
          metadata: fpJson,
        }).eq("id", pending.id);
        // Map upstream 404s to a clean user-facing code
        const userMsg = /404/.test(String(rawMsg)) ? "payment_unavailable" : (fpJson?.msg ?? "payment_declined");
        return new Response(
          JSON.stringify({ ok: false, error: userMsg, payment_id: pending.id }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      txId = fpJson?.data?.id ?? fpJson?.id ?? null;
    }

    await admin.from("payments").update({
      status: "paid",
      fluid_pay_transaction_id: txId,
      metadata: fpJson,
    }).eq("id", pending.id);

    // Save token to profile if requested
    if (body.save_token && payerProfile?.id) {
      await admin.from("profiles").update({
        fluid_pay_token: body.payment_token,
        fluid_pay_card_brand: body.card_brand ?? null,
        fluid_pay_card_last4: body.card_last4 ?? null,
        fluid_pay_saved_at: new Date().toISOString(),
      }).eq("id", payerProfile.id);
    }

    // Link split_check_target if applicable
    if (body.kind === "split_share" && body.split_request_id && payerProfile?.id) {
      await admin.from("split_check_targets").update({
        status: "paid",
        payment_id: pending.id,
      }).eq("request_id", body.split_request_id).eq("profile_id", payerProfile.id);

      // Settle request if all paid
      const { data: remaining } = await admin.from("split_check_targets")
        .select("id").eq("request_id", body.split_request_id).neq("status", "paid").limit(1);
      if (!remaining?.length) {
        await admin.from("split_check_requests").update({ status: "settled" })
          .eq("id", body.split_request_id);
      }
    }

    return new Response(JSON.stringify({ ok: true, payment_id: pending.id, transaction_id: txId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-fluid-pay error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
