import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders } from "../_shared/fluidPay.ts";

const ItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().min(1),
  unit_price_cents: z.number().int().min(0),
  parsed_confidence: z.number().min(0).max(1).optional(),
});

const GuestTargetSchema = z.object({
  display_name: z.string().min(1).max(80),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(32).optional(),
});

const BodySchema = z.object({
  // Either event-bound or standalone (R@lly Tab)
  event_id: z.string().uuid().nullable().optional(),
  context: z.enum(["event", "standalone"]).default("event"),
  title: z.string().min(1).max(120).optional(),
  mode: z.enum(["quick", "itemized"]),
  target_profile_ids: z.array(z.string().uuid()).default([]),
  guest_targets: z.array(GuestTargetSchema).default([]),
  note: z.string().optional(),
  total_cents: z.number().int().min(0).optional(),
  items: z.array(ItemSchema).optional(),
  subtotal_cents: z.number().int().min(0).optional(),
  tax_cents: z.number().int().min(0).optional(),
  tip_cents: z.number().int().min(0).optional(),
  receipt_image_url: z.string().optional(),
});

function exactQuickShares(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = base + (i < remainder ? 1 : 0);
  return out;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
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
    const isStandalone = body.context === "standalone";

    if (isStandalone && !body.title) {
      return new Response(JSON.stringify({ error: "title_required" }), { status: 400, headers: corsHeaders });
    }
    if (!isStandalone && !body.event_id) {
      return new Response(JSON.stringify({ error: "event_id_required" }), { status: 400, headers: corsHeaders });
    }
    const requestedParticipants = body.target_profile_ids.length + body.guest_targets.length;
    if (requestedParticipants < 1) {
      return new Response(JSON.stringify({ error: "no_targets" }), { status: 400, headers: corsHeaders });
    }

    const { data: profile } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!profile) return new Response(JSON.stringify({ error: "no_profile" }), { status: 400, headers: corsHeaders });

    // Event mode: authorize host + attendee whitelist
    if (!isStandalone) {
      const { data: hostCheck } = await admin.rpc("is_event_host_or_cohost", { p_event_id: body.event_id, p_user_id: userId });
      if (!hostCheck) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });

      if (body.guest_targets.length) {
        return new Response(JSON.stringify({ error: "guests_not_allowed_for_event" }), { status: 400, headers: corsHeaders });
      }
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
    }
    // Note: Split Check / R@lly Tabs use P2P settlement (Venmo, CashApp, PayPal, Apple Cash).
    // No Fluid Pay sub-merchant is required for standalone tabs.

    const profileTargets = Array.from(new Set(body.target_profile_ids));
    const guestTargets = body.guest_targets;
    const totalTargets = profileTargets.length + guestTargets.length;
    const splitHeadcount = totalTargets + 1; // the host is always part of the bill split, but is not requested to pay themselves

    let total = 0, subtotal = 0, tax = 0, tip = 0;
    let quickShares: number[] = [];
    let perShare: number | null = null;
    if (body.mode === "quick") {
      total = body.total_cents ?? 0;
      quickShares = exactQuickShares(total, splitHeadcount);
      perShare = quickShares[0] ?? 0;
    } else {
      // itemized + standalone with guests is not yet supported — guests need fixed amounts
      if (isStandalone && guestTargets.length) {
        return new Response(JSON.stringify({ error: "itemized_guest_unsupported" }), { status: 400, headers: corsHeaders });
      }
      subtotal = body.subtotal_cents ?? (body.items?.reduce((s, i) => s + i.quantity * i.unit_price_cents, 0) ?? 0);
      tax = body.tax_cents ?? 0;
      tip = body.tip_cents ?? 0;
      total = subtotal + tax + tip;
    }

    const { data: reqRow, error: reqErr } = await admin.from("split_check_requests").insert({
      event_id: isStandalone ? null : body.event_id,
      context: body.context,
      title: body.title ?? null,
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

    // Profile targets
    const profileRows = profileTargets.map((pid, idx) => ({
      request_id: reqRow.id,
      profile_id: pid,
      share_cents: body.mode === "quick" ? (quickShares[idx] ?? 0) : 0,
      status: "pending",
    }));
    profileRows.push({
      request_id: reqRow.id,
      profile_id: profile.id,
      share_cents: body.mode === "quick" ? (quickShares[totalTargets] ?? 0) : 0,
      status: "paid",
    });
    if (profileRows.length) await admin.from("split_check_targets").insert(profileRows);

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

    // Guest targets → mint tokens
    const guestLinks: { display_name: string; email?: string; phone?: string; url: string; amount_cents: number }[] = [];
    const publicBase = Deno.env.get("PUBLIC_APP_URL") ?? "https://rlly.cloud";
    for (let i = 0; i < guestTargets.length; i++) {
      const g = guestTargets[i];
      const amt = quickShares[profileTargets.length + i] ?? 0;
      const token = randomToken();
      const hash = await sha256Hex(token);
      await admin.from("split_guest_tokens").insert({
        request_id: reqRow.id,
        email: g.email ?? null,
        phone: g.phone ?? null,
        display_name: g.display_name,
        amount_cents: amt,
        token_hash: hash,
        created_by: profile.id,
      });
      guestLinks.push({
        display_name: g.display_name,
        email: g.email,
        phone: g.phone,
        amount_cents: amt,
        url: `${publicBase}/tab/pay/${reqRow.id}?t=${token}`,
      });
    }

    // Notifications + push for known-profile targets
    if (profileTargets.length) {
      const titleStr = isStandalone
        ? `${body.title}: pay your share`
        : `Pay your share for "${(await admin.from("events").select("title").eq("id", body.event_id!).maybeSingle()).data?.title ?? "the R@lly"}"`;
      const notifRows = profileTargets.map((pid, idx) => ({
        profile_id: pid,
        type: "split_check_request",
        title: titleStr,
        body: body.mode === "quick"
          ? `$${((quickShares[idx] ?? 0) / 100).toFixed(2)} requested`
          : "Tap to claim your items",
        data: { event_id: body.event_id ?? null, request_id: reqRow.id, mode: body.mode, context: body.context },
        read: false,
      }));
      await admin.from("notifications").insert(notifRows);

      try {
        await admin.functions.invoke("send-push-notification", {
          body: {
            profile_ids: profileTargets,
            title: titleStr,
            body: body.mode === "quick" ? "Tap to pay your share" : "Tap to claim your items",
          },
        });
      } catch (_) { /* non-blocking */ }
    }

    return new Response(JSON.stringify({
      ok: true,
      request_id: reqRow.id,
      guest_links: guestLinks,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("request-split-check error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
