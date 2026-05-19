// Called immediately after a guest user signs up post-payment.
// Links the freshly-created profile to the guest token + payment + creates a
// target row so the host's settlement ledger reflects the now-named payer.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders } from "../_shared/fluidPay.ts";

const BodySchema = z.object({
  request_id: z.string().uuid(),
  token: z.string().min(16).max(128),
});

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: corsHeaders });
    }
    const { request_id, token } = parsed.data;
    const tokenHash = await sha256Hex(token);

    const { data: profile } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) return new Response(JSON.stringify({ error: "no_profile" }), { status: 400, headers: corsHeaders });

    const { data: gt } = await admin.from("split_guest_tokens")
      .select("id, request_id, payment_id, amount_cents, claimed_profile_id, paid_at")
      .eq("request_id", request_id)
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!gt) return new Response(JSON.stringify({ error: "invalid_token" }), { status: 404, headers: corsHeaders });
    if (!gt.paid_at) return new Response(JSON.stringify({ error: "not_paid" }), { status: 409, headers: corsHeaders });

    // Link token + payment to new profile
    await admin.from("split_guest_tokens").update({
      claimed_profile_id: profile.id,
    }).eq("id", gt.id);

    if (gt.payment_id) {
      await admin.from("payments").update({
        user_id: userId, profile_id: profile.id,
      }).eq("id", gt.payment_id);
    }

    // Upsert a target row so the host ledger shows this payer by name
    await admin.from("split_check_targets").upsert({
      request_id,
      profile_id: profile.id,
      share_cents: gt.amount_cents,
      status: "paid",
      payment_id: gt.payment_id,
    }, { onConflict: "request_id,profile_id" });

    // Try to settle
    const { data: remaining } = await admin.from("split_check_targets")
      .select("id").eq("request_id", request_id).neq("status", "paid").limit(1);
    if (!remaining?.length) {
      // also confirm no unpaid guest tokens
      const { data: unpaidGuests } = await admin.from("split_guest_tokens")
        .select("id").eq("request_id", request_id).is("paid_at", null).limit(1);
      if (!unpaidGuests?.length) {
        await admin.from("split_check_requests").update({ status: "settled" }).eq("id", request_id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("claim-guest-payment error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
