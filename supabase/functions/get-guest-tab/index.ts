// Public, no-JWT endpoint that returns the safe metadata for a guest pay link.
// Used by SplitGuestPay.tsx to render "You owe $X to <host> for <title>"
// without exposing the host's PII.

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
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tokenHash = await sha256Hex(parsed.data.token);
    const { data: gt } = await admin.from("split_guest_tokens")
      .select("id, request_id, amount_cents, display_name, email, paid_at, expires_at")
      .eq("request_id", parsed.data.request_id)
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!gt) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: sr } = await admin.from("split_check_requests")
      .select("title, note, status, host_id").eq("id", gt.request_id).maybeSingle();
    const { data: host } = sr?.host_id
      ? await admin.from("profiles").select("display_name").eq("id", sr.host_id).maybeSingle()
      : { data: null } as any;
    return new Response(JSON.stringify({
      ok: true,
      amount_cents: gt.amount_cents,
      display_name: gt.display_name,
      email: gt.email,
      paid_at: gt.paid_at,
      expired: new Date(gt.expires_at).getTime() < Date.now(),
      title: sr?.title ?? "R@lly Tab",
      note: sr?.note ?? null,
      status: sr?.status ?? "open",
      host_display_name: host?.display_name ?? "Your host",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("get-guest-tab error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
