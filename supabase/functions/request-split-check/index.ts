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

/**
 * Distribute `total` cents across `n` payers without rounding-up over-collection.
 * Returns an array of integer cents whose sum === total exactly.
 * The first `remainder` payers absorb the +1 cent.
 */
function exactQuickShares(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = base + (i < remainder ? 1 : 0);
  return out;
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

    // C: Attendee whitelist — every target must actually be an active attendee of this event.
    const uniqueTargets = Array.from(new Set(body.target_profile_ids));
    const { data: validAttendees } = await admin
      .from("event_attendees")
      .select("profile_id")
      .eq("event_id", body.event_id)
      .in("profile_id", uniqueTargets);
    const validSet = new Set((validAttendees ?? []).map((r: any) => r.profile_id));
    const invalid = uniqueTargets.filter((id) => !validSet.has(id));
    if (invalid.length) {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_targets", invalid_profile_ids: invalid }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const targets = uniqueTargets; // preserves first-seen ordering of caller

    let total = 0, subtotal = 0, tax = 0, tip = 0;
    let quickShares: number[] = [];
    let perShare: number | null = null;
    if (body.mode === "quick") {
      total = body.total_cents ?? 0;
      // E (quick): exact distribution — first K payers absorb +1¢, host never over-collects.
      quickShares = exactQuickShares(total, targets.length);
      perShare = quickShares[0] ?? 0; // for backwards-compatible per_share_cents preview
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

    // Targets — quick uses exact per-payer cents
    const targetRows = targets.map((pid, idx) => ({
      request_id: reqRow.id,
      profile_id: pid,
      share_cents: body.mode === "quick" ? (quickShares[idx] ?? 0) : 0,
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

    // Notifications (in-app)
    const { data: ev } = await admin.from("events").select("title").eq("id", body.event_id).maybeSingle();
    const titleStr = `Pay your share for "${ev?.title ?? "the R@lly"}"`;
    const notifRows = targets.map((pid, idx) => ({
      profile_id: pid,
      type: "split_check_request",
      title: titleStr,
      body: body.mode === "quick"
        ? `$${((quickShares[idx] ?? 0) / 100).toFixed(2)} requested`
        : "Tap to claim your items",
      data: { event_id: body.event_id, request_id: reqRow.id, mode: body.mode },
      read: false,
    }));
    await admin.from("notifications").insert(notifRows);

    // I: Initial push fan-out — best-effort, parity with the Nudge flow.
    try {
      await admin.functions.invoke("send-push-notification", {
        body: {
          profile_ids: targets,
          title: titleStr,
          body: body.mode === "quick"
            ? "Tap to pay your share"
            : "Tap to claim your items",
        },
      });
    } catch (_) { /* non-blocking */ }

    return new Response(JSON.stringify({ ok: true, request_id: reqRow.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("request-split-check error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
