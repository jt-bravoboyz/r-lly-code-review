import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({ image_url: z.string().url() });

const SYSTEM = `You are a precise receipt OCR parser. Read the receipt image and return clean structured JSON.
- Use DOLLARS (not cents) as decimal numbers, e.g. 12.50.
- Each line item should be a single ordered item. Combine like items into one line if they share a price.
- Use sentence case for item names. Strip leading codes / SKUs.
- If you cannot read a value, return 0.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ai_gateway_not_configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 28000);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: [
            { type: "text", text: "Parse this receipt. Return JSON only via the tool." },
            { type: "image_url", image_url: { url: parsed.data.image_url } },
          ]},
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_receipt",
            description: "Return structured receipt data in dollars",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      price: { type: "number" },
                    },
                    required: ["name", "price"],
                  },
                },
                subtotal: { type: "number" },
                tax: { type: "number" },
                tip: { type: "number" },
                total: { type: "number" },
              },
              required: ["items", "subtotal", "tax", "tip", "total"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_receipt" } },
      }),
    }).finally(() => clearTimeout(timeout));

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: txt }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "no_tool_call" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const out = JSON.parse(args);
    return new Response(JSON.stringify(out), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = (err as Error).name === "AbortError" ? "timeout" : (err as Error).message;
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
