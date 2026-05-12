import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders } from "../_shared/fluidPay.ts";

const ItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().min(1),
  unit_price_cents: z.number().int().min(0),
  parsed_confidence: z.number().min(0).max(1).optional(),
});

const BodySchema = z.object({
  event_id: z.string().uuid(),
  mode: z.enum(["quick", "itemized"]),
  target_profile_ids: z.array(z.string().uuid()).min(1),
  note: z.string().optional(),
  // quick
  total_cents: z.number().int().min(0).optional(),
  // itemized
  items: z.array(ItemSchema).optional(),
  subtotal_cents: z.number().int().min(0).optional(),
  tax_cents: z.number().int().min(0).optional(),
  tip_cents: z.number().int().min(0).optional(),
  receipt_image_url: z.string().optional(),
});

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
    if (!claims?.claims?.sub) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = claims.claims.sub as string;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: corsHeaders });
    }
    const body = parsed.data;

    const { data: profile } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) return new Response(JSON.stringify({ error: "no_profile" }), { status: 400, headers: corsHeaders });

    // Authorize host
    const { data: hostCheck } = await admin.rpc("is_event_host_or_cohost", { p_event_id: body.event_id, p_user_id: userId });
    if (!hostCheck) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });

    let total = 0, subtotal = 0, tax = 0, tip = 0, perShare: number | null = null;
    if (body.mode === "quick") {
      total = body.total_cents ?? 0;
      perShare = Math.ceil(total / body.target_profile_ids.length);
    } else {
      subtotal = body.subtotal_cents ?? (body.items?.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0) ?? 0);
      tax = body.tax_cents ?? 0;
      tip = body.tip_cents ?? 0;
      total = subtotal + tax + tip;
    }

    const { data: reqRow, error: reqErr } = await admin.from("split_check_requests").insert({
      event_id: body.event_id,
      host_id: profile.id,
      mode: body.mode,
      total_cents: total,
      subtotal_cents: subtotal,
      tax_cents: tax,
      tip_cents: tip,
      per_share_cents: perShare,
      note: body.note ?? null,
      receipt_image_url: body.receipt_image_url ?? null,
      status: "open",
    }).select("id").single();
    if (reqErr) throw reqErr;

    // Targets
    const targetRows = body.target_profile_ids.map(pid => ({
      request_id: reqRow.id,
      profile_id: pid,
      share_cents: body.mode === "quick" ? (perShare ?? 0) : 0,
    }));
    await admin.from("split_check_targets").insert(targetRows);

    // Itemized items
    if (body.mode === "itemized" && body.items?.length) {
      const itemRows = body.items.map((it, idx) => ({
        request_id: reqRow.id,
        line_no: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unit_price_cents: it.unit_price_cents,
        total_price_cents: it.quantity * it.unit_price_cents,
        parsed_confidence: it.parsed_confidence ?? null,
      }));
      await admin.from("split_check_items").insert(itemRows);
    }

    // Notifications
    const { data: ev } = await admin.from("events").select("title").eq("id", body.event_id).maybeSingle();
    const notifRows = body.target_profile_ids.map(pid => ({
      profile_id: pid,
      type: "split_check_request",
      title: `Pay your share for "${ev?.title ?? "the R@lly"}"`,
      body: body.mode === "quick"
        ? `$${((perShare ?? 0) / 100).toFixed(2)} requested`
        : "Tap to claim your items",
      data: { event_id: body.event_id, request_id: reqRow.id, mode: body.mode },
      read: false,
    }));
    await admin.from("notifications").insert(notifRows);

    return new Response(JSON.stringify({ ok: true, request_id: reqRow.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("request-split-check error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
