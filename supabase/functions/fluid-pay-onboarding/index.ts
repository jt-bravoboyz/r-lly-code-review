import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders, loadFluidPayConfig } from "../_shared/fluidPay.ts";

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), legal_name: z.string().optional(), country: z.string().optional() }),
  z.object({ action: z.literal("refresh") }),
  z.object({ action: z.literal("submit_field"), field: z.string(), value: z.unknown() }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const cfg = loadFluidPayConfig();
    if (!cfg.partnerKey) {
      return new Response(JSON.stringify({ error: "merchant_onboarding_not_configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
    const email = (claims.claims as any).email ?? null;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: corsHeaders });
    }

    const { data: profile } = await admin.from("profiles").select("id, display_name").eq("user_id", userId).maybeSingle();
    if (!profile) return new Response(JSON.stringify({ error: "no_profile" }), { status: 400, headers: corsHeaders });

    const { data: existing } = await admin.from("merchant_accounts").select("*").eq("profile_id", profile.id).maybeSingle();

    if (parsed.data.action === "start") {
      // Create sub-merchant via Fluid Pay Partner API
      const fpRes = await fetch(`${cfg.baseUrl}/onboarding/merchant`, {
        method: "POST",
        headers: { "Authorization": cfg.partnerKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          legal_name: parsed.data.legal_name ?? profile.display_name,
          email,
          country: parsed.data.country ?? "US",
        }),
      });
      const fpJson = await fpRes.json().catch(() => ({}));
      if (!fpRes.ok) {
        return new Response(JSON.stringify({ ok: false, error: fpJson?.msg ?? `HTTP ${fpRes.status}` }), { status: 400, headers: corsHeaders });
      }
      const subId = fpJson?.data?.id ?? fpJson?.id ?? null;
      const requirements = fpJson?.data?.requirements_due ?? fpJson?.requirements_due ?? [];
      const onboarding_url = fpJson?.data?.onboarding_url ?? fpJson?.onboarding_url ?? null;

      const upsertPayload = {
        profile_id: profile.id,
        fluid_pay_sub_merchant_id: subId,
        status: "pending",
        legal_name: parsed.data.legal_name ?? profile.display_name,
        email,
        country: parsed.data.country ?? "US",
        requirements_due: requirements,
        last_synced_at: new Date().toISOString(),
      };

      if (existing) {
        await admin.from("merchant_accounts").update(upsertPayload).eq("id", existing.id);
      } else {
        await admin.from("merchant_accounts").insert(upsertPayload);
      }

      return new Response(JSON.stringify({ ok: true, sub_merchant_id: subId, requirements_due: requirements, onboarding_url }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!existing?.fluid_pay_sub_merchant_id) {
      return new Response(JSON.stringify({ error: "not_started" }), { status: 400, headers: corsHeaders });
    }

    if (parsed.data.action === "refresh") {
      const fpRes = await fetch(`${cfg.baseUrl}/onboarding/merchant/${existing.fluid_pay_sub_merchant_id}`, {
        headers: { "Authorization": cfg.partnerKey },
      });
      const fpJson = await fpRes.json().catch(() => ({}));
      const data = fpJson?.data ?? fpJson;
      const status = data?.status ?? existing.status;
      const payouts_enabled = !!data?.payouts_enabled;
      await admin.from("merchant_accounts").update({
        status,
        payouts_enabled,
        requirements_due: data?.requirements_due ?? [],
        last_synced_at: new Date().toISOString(),
      }).eq("id", existing.id);
      return new Response(JSON.stringify({ ok: true, status, payouts_enabled }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.data.action === "submit_field") {
      const fpRes = await fetch(`${cfg.baseUrl}/onboarding/merchant/${existing.fluid_pay_sub_merchant_id}`, {
        method: "PATCH",
        headers: { "Authorization": cfg.partnerKey, "Content-Type": "application/json" },
        body: JSON.stringify({ [parsed.data.field]: parsed.data.value }),
      });
      const fpJson = await fpRes.json().catch(() => ({}));
      if (!fpRes.ok) {
        return new Response(JSON.stringify({ ok: false, error: fpJson?.msg ?? `HTTP ${fpRes.status}` }), { status: 400, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error("fluid-pay-onboarding error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
