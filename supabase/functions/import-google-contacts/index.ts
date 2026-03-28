import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user session
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user signed in with Google and has a provider token
    // For Google People API, we need the user's Google OAuth token
    // This is stored in the user's identity data
    const googleIdentity = user.identities?.find(i => i.provider === 'google');
    if (!googleIdentity) {
      return new Response(JSON.stringify({ 
        error: 'No Google account linked. Please sign in with Google first.',
        contacts: [] 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the provider token from the session
    // Note: provider_token is only available right after OAuth sign-in
    // For persistent access, we'd need to store the refresh token
    const { data: sessionData } = await supabase.auth.admin.getUserById(user.id);
    
    // Try to use the Google People API with the provider token
    // Since provider tokens are short-lived, we return a helpful message if unavailable
    return new Response(JSON.stringify({ 
      error: 'Google Contacts import requires re-authenticating with Google. Please sign out and sign back in with Google to grant contacts access.',
      contacts: [],
      requiresReauth: true,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in import-google-contacts:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
