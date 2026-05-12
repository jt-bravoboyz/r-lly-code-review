import { z } from "npm:zod@3";
import { corsHeaders } from "../_shared/fluidPay.ts";

const BodySchema = z.object({ image_url: z.string().url() });

const SYSTEM = `You are a precise receipt OCR parser. Read the image and return structured JSON.
Use cents (integers) — multiply dollar amounts by 100. Items: list each line item separately with quantity.`;

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
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: [
            { type: "text", text: "Parse this receipt. Return JSON only." },
            { type: "image_url", image_url: { url: parsed.data.image_url } },
          ]},
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_receipt",
            description: "Return structured receipt data",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      quantity: { type: "integer", minimum: 1 },
                      unit_price_cents: { type: "integer", minimum: 0 },
                      confidence: { type: "number", minimum: 0, maximum: 1 },
                    },
                    required: ["description", "quantity", "unit_price_cents"],
                  },
                },
                subtotal_cents: { type: "integer", minimum: 0 },
                tax_cents: { type: "integer", minimum: 0 },
                tip_cents: { type: "integer", minimum: 0 },
                total_cents: { type: "integer", minimum: 0 },
              },
              required: ["items", "subtotal_cents", "tax_cents", "tip_cents", "total_cents"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_receipt" } },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: corsHeaders });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), { status: 402, headers: corsHeaders });
    }
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: txt }), { status: 500, headers: corsHeaders });
    }

    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "no_tool_call" }), { status: 500, headers: corsHeaders });
    }
    const parsedReceipt = JSON.parse(args);

    return new Response(JSON.stringify(parsedReceipt), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-receipt error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
