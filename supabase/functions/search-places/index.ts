import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    
    if (!googleApiKey) {
      console.error("GOOGLE_PLACES_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Google Places API key not configured" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { query, lat, lng, type = "establishment" } = await req.json();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Searching for places: "${query}" near ${lat}, ${lng}`);

    // Use Google Places Text Search API for better POI results
    const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("key", googleApiKey);
    
    // Add location bias if provided
    if (lat && lng) {
      searchUrl.searchParams.set("location", `${lat},${lng}`);
      searchUrl.searchParams.set("radius", "50000"); // 50km radius
    }

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      console.error("Google Places API error:", response.status, await response.text());
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API status:", data.status, data.error_message);
      throw new Error(`Google Places API: ${data.status}`);
    }

    // Transform Google Places results to our format
    const results = (data.results || []).slice(0, 8).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
      types: place.types || [],
      rating: place.rating,
      priceLevel: place.price_level,
      isOpen: place.opening_hours?.open_now,
      icon: place.icon,
    }));

    console.log(`Found ${results.length} places for "${query}"`);

    return new Response(
      JSON.stringify({ results }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: unknown) {
    console.error("Error searching places:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to search places";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
