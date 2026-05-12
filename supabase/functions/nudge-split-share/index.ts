import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeaders } from "../_shared/fluidPay.ts";

const BodySchema = z.object({
  request_id: z.string().uuid(),
  target_profile_ids: z.array(z.string().uuid()).min(1),
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
    const { request_id, target_profile_ids } = parsed.data;

    const { data: req_row } = await admin.from("split_check_requests")
      .select("event_id, host_id").eq("id", request_id).maybeSingle();
    if (!req_row) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: corsHeaders });

    const { data: profile } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (profile?.id !== req_row.host_id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { data: ev } = await admin.from("events").select("title").eq("id", req_row.event_id).maybeSingle();
    const now = new Date().toISOString();

    await admin.from("split_check_targets")
      .update({ last_nudged_at: now })
      .eq("request_id", request_id)
      .in("profile_id", target_profile_ids);

    for (const pid of target_profile_ids) {
      const { data: existing } = await admin.from("notifications")
        .select("id, data")
        .eq("profile_id", pid)
        .eq("type", "split_check_request")
        .eq("read", false)
        .contains("data", { request_id })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const nudge_count = ((existing.data as any)?.nudge_count ?? 0) + 1;
        await admin.from("notifications").update({
          title: `Reminder — Pay your share for "${ev?.title ?? "the R@lly"}"`,
          created_at: now,
          data: { ...(existing.data as any), nudge_count },
        }).eq("id", existing.id);
      } else {
        await admin.from("notifications").insert({
          profile_id: pid,
          type: "split_check_nudge",
          title: `Reminder — Pay your share for "${ev?.title ?? "the R@lly"}"`,
          body: "Tap to pay",
          data: { request_id, event_id: req_row.event_id, nudge_count: 1 },
          read: false,
        });
      }
    }

    // Fire push (best-effort)
    try {
      await admin.functions.invoke("send-push-notification", {
        body: {
          profile_ids: target_profile_ids,
          title: `Reminder — Pay your share for "${ev?.title ?? "the R@lly"}"`,
          body: "Tap to pay",
        },
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ ok: true, count: target_profile_ids.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("nudge-split-share error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
