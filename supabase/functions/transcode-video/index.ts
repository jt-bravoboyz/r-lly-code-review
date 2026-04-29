// Edge function: convert iPhone .mov files so they play on Android.
//
// Strategy: Edge runtime cannot run ffmpeg. iPhone .mov files are H.264/AAC
// in a QuickTime container — which is binary-compatible enough with MP4 that
// Android Chrome will play them when served with `Content-Type: video/mp4`
// and a `.mp4` extension. So we re-upload the same bytes to a `.mp4` path
// with the correct content-type, update the DB row, and remove the old file.
//
// Flow:
// 1) Accept { media_id }
// 2) Download .mov from rally-media bucket (service role)
// 3) Re-upload identical bytes to <same-path>.mp4 with content-type video/mp4
// 4) Update rally_media.url -> new mp4 url, processing -> false
// 5) Delete original .mov (best-effort)

// @ts-ignore - npm specifier resolved at runtime
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'rally-media';

interface RequestBody {
  media_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let mediaId: string | undefined;

  try {
    const body = (await req.json()) as RequestBody;
    if (!body?.media_id || typeof body.media_id !== 'string') {
      return new Response(JSON.stringify({ error: 'media_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    mediaId = body.media_id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) Fetch the media row
    const { data: media, error: mediaErr } = await admin
      .from('rally_media')
      .select('id, url, type')
      .eq('id', mediaId)
      .single();

    if (mediaErr || !media) {
      return new Response(
        JSON.stringify({ error: 'Media not found', detail: mediaErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (media.type !== 'video') {
      await admin.from('rally_media').update({ processing: false }).eq('id', media.id);
      return new Response(JSON.stringify({ skipped: 'not a video' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Derive storage path from public URL
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = media.url.indexOf(marker);
    if (idx === -1) {
      await admin.from('rally_media').update({ processing: false }).eq('id', media.id);
      return new Response(JSON.stringify({ error: 'Cannot parse storage path from url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const oldPath = media.url.substring(idx + marker.length);
    const ext = (oldPath.split('.').pop() || '').toLowerCase();

    // Already mp4/webm — nothing to do
    if (ext === 'mp4' || ext === 'webm') {
      await admin.from('rally_media').update({ processing: false }).eq('id', media.id);
      return new Response(JSON.stringify({ skipped: 'already playable', ext }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2 + 3) Stream-copy via storage REST: download body and pipe straight to upload
    // This avoids buffering the full file in memory (which trips WORKER_RESOURCE_LIMIT for big videos).
    const newPath = oldPath.replace(/\.[^.]+$/, '.mp4');

    const dlRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${oldPath}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      },
    );
    if (!dlRes.ok || !dlRes.body) {
      await admin.from('rally_media').update({ processing: false }).eq('id', media.id);
      return new Response(
        JSON.stringify({ error: 'Download failed', status: dlRes.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const upRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${newPath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'video/mp4',
          'x-upsert': 'true',
          'Cache-Control': 'max-age=3600',
        },
        body: dlRes.body,
        // @ts-ignore - Deno fetch supports duplex for streaming bodies
        duplex: 'half',
      },
    );

    if (!upRes.ok) {
      const detail = await upRes.text().catch(() => '');
      await admin.from('rally_media').update({ processing: false }).eq('id', media.id);
      return new Response(
        JSON.stringify({ error: 'Upload failed', status: upRes.status, detail }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(newPath);
    const newUrl = urlData.publicUrl;

    // 4) Update DB row
    const { error: updErr } = await admin
      .from('rally_media')
      .update({ url: newUrl, processing: false })
      .eq('id', media.id);

    if (updErr) {
      return new Response(
        JSON.stringify({ error: 'DB update failed', detail: updErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 5) Best-effort delete original
    if (newPath !== oldPath) {
      await admin.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    }

    return new Response(
      JSON.stringify({ success: true, media_id: media.id, new_url: newUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('transcode-video error:', msg);

    if (mediaId) {
      try {
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await admin.from('rally_media').update({ processing: false }).eq('id', mediaId);
      } catch (_) {
        // ignore
      }
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
