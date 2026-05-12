import { corsHeaders, loadFluidPayConfig } from "../_shared/fluidPay.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const cfg = loadFluidPayConfig();
  return new Response(
    JSON.stringify({
      configured: !!cfg.publicKey,
      publicKey: cfg.publicKey,
      env: cfg.env,
      tokenizerScriptUrl: cfg.env === "live"
        ? "https://app.fluidpay.com/tokenizer/tokenizer.js"
        : "https://sandbox.fluidpay.com/tokenizer/tokenizer.js",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
