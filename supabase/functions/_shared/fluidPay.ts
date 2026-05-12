// Shared Fluid Pay helpers for Supabase Edge Functions.
// Centralizes secret reading, env detection, and base URL resolution.

export interface FluidPayConfig {
  privateKey: string | null;
  publicKey: string | null;
  partnerKey: string | null;
  env: "sandbox" | "live";
  baseUrl: string;
  platformFeePercent: number;
  platformMasterSubMerchantId: string | null;
}

export function loadFluidPayConfig(): FluidPayConfig {
  const env = (Deno.env.get("FLUID_PAY_ENV") ?? "sandbox").toLowerCase() === "live"
    ? "live" as const
    : "sandbox" as const;
  const baseUrl = env === "live"
    ? "https://app.fluidpay.com/api"
    : "https://sandbox.fluidpay.com/api";
  const feeRaw = Deno.env.get("PLATFORM_FEE_PERCENT") ?? "5";
  const platformFeePercent = Number.isFinite(parseFloat(feeRaw)) ? parseFloat(feeRaw) : 5;

  return {
    privateKey: Deno.env.get("FLUID_PAY_PRIVATE_KEY") ?? null,
    publicKey: Deno.env.get("FLUID_PAY_PUBLIC_KEY") ?? null,
    partnerKey: Deno.env.get("FLUID_PAY_PARTNER_KEY") ?? null,
    env,
    baseUrl,
    platformFeePercent,
    platformMasterSubMerchantId: Deno.env.get("PLATFORM_MASTER_SUB_MERCHANT_ID") ?? null,
  };
}

export function notConfiguredResponse(corsHeaders: Record<string, string>, missing: string) {
  return new Response(
    JSON.stringify({ error: "fluid_pay_not_configured", missing }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
