import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { eventId } = await req.json();
    if (!eventId) {
      return new Response(JSON.stringify({ error: "eventId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get actor's profile
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("user_id", userId)
      .single();

    if (!actorProfile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actorProfileId = actorProfile.id;
    const actorName = actorProfile.display_name || "Someone";

    // Get event title
    const { data: event } = await supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single();

    const eventTitle = event?.title || "the R@lly";

    // Dedupe: check if we already sent this notification in the last 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentNotifs } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", "car_group_rally_home")
      .gte("created_at", fiveMinAgo)
      .contains("data", { actor_profile_id: actorProfileId, event_id: eventId });

    if (recentNotifs && recentNotifs.length > 0) {
      console.log("Deduped: already sent car group notification recently");
      return new Response(JSON.stringify({ sent: 0, deduped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find car group members:
    // 1. Find rides where actor is the driver for this event
    const { data: driverRides } = await supabase
      .from("rides")
      .select("id")
      .eq("event_id", eventId)
      .eq("driver_id", actorProfileId);

    // 2. Find rides where actor is a passenger (accepted) for this event
    const { data: passengerEntries } = await supabase
      .from("ride_passengers")
      .select("ride_id, rides!ride_passengers_ride_id_fkey(id, driver_id, event_id)")
      .eq("passenger_id", actorProfileId)
      .eq("status", "accepted");

    // Filter passenger entries to this event
    const passengerRidesForEvent = (passengerEntries || []).filter(
      (p: any) => p.rides?.event_id === eventId
    );

    // Collect all ride IDs the actor belongs to
    const rideIds = new Set<string>();
    (driverRides || []).forEach((r) => rideIds.add(r.id));
    passengerRidesForEvent.forEach((p: any) => rideIds.add(p.ride_id));

    if (rideIds.size === 0) {
      console.log("Actor has no ride assignment for this event");
      return new Response(JSON.stringify({ sent: 0, no_car_group: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all members of those rides
    const rideIdArray = Array.from(rideIds);
    const recipientProfileIds = new Set<string>();

    // Add drivers of those rides
    const { data: ridesData } = await supabase
      .from("rides")
      .select("driver_id")
      .in("id", rideIdArray);

    (ridesData || []).forEach((r) => recipientProfileIds.add(r.driver_id));

    // Add accepted passengers of those rides
    const { data: allPassengers } = await supabase
      .from("ride_passengers")
      .select("passenger_id")
      .in("ride_id", rideIdArray)
      .eq("status", "accepted");

    (allPassengers || []).forEach((p) => recipientProfileIds.add(p.passenger_id));

    // Remove actor from recipients
    recipientProfileIds.delete(actorProfileId);

    if (recipientProfileIds.size === 0) {
      console.log("No other car group members to notify");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Notifying ${recipientProfileIds.size} car group members`);

    // Insert notifications
    const notifications = Array.from(recipientProfileIds).map((profileId) => ({
      profile_id: profileId,
      type: "car_group_rally_home",
      title: "R@lly Home: Ready to roll",
      body: `${actorName} just hit R@lly Home — they're ready to leave.`,
      data: {
        event_id: eventId,
        event_title: eventTitle,
        actor_profile_id: actorProfileId,
        deep_link: `/events/${eventId}`,
      },
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Failed to insert notifications:", insertError);
      throw insertError;
    }

    // Also try push notifications
    for (const profileId of recipientProfileIds) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            profileId,
            title: "R@lly Home: Ready to roll 🏠",
            body: `${actorName} just hit R@lly Home — they're ready to leave.`,
            data: { url: `/events/${eventId}` },
          }),
        });
      } catch (pushErr) {
        console.error(`Push failed for ${profileId}:`, pushErr);
      }
    }

    return new Response(
      JSON.stringify({ sent: recipientProfileIds.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
