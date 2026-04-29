// Edge function: transcode iPhone .mov files to .mp4 so they play on Android.
// Strategy: stream-copy remux (no re-encode) — fast, lossless, low memory.
//
// Flow:
// 1) Accept { media_id } from client (after they've inserted the row with processing=true)
// 2) Download the .mov from the rally-media bucket using service-role
// 3) Run ffmpeg-wasm with `-c copy -movflags +faststart -f mp4` to remux container
// 4) Upload the resulting .mp4 to the same path (with .mp4 extension)
// 5) Update rally_media row: url -> new mp4 url, processing -> false
// 6) Delete the original .mov object (best-effort)

// @ts-ignore - npm specifier resolved at runtime
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
// @ts-ignore - npm specifier resolved at runtime
import { FFmpeg } from 'npm:@ffmpeg/ffmpeg@0.12.10';
// @ts-ignore - npm specifier resolved at runtime
import { fetchFile } from 'npm:@ffmpeg/util@0.12.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'rally-media';

// Lazily init ffmpeg per cold-start
let ffmpegInstance: any = null;
async function getFfmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  const ff = new FFmpeg();
  await ff.load();
  ffmpegInstance = ff;
  return ff;
}

interface RequestBody {
  media_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    if (!body?.media_id || typeof body.media_id !== 'string') {
      return new Response(JSON.stringify({ error: 'media_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) Fetch the media row
    const { data: media, error: mediaErr } = await admin
      .from('rally_media')
      .select('id, url, type, processing, event_id')
      .eq('id', body.media_id)
      .single();

    if (mediaErr || !media) {
      return new Response(
        JSON.stringify({ error: 'Media not found', detail: mediaErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (media.type !== 'video') {
      return new Response(JSON.stringify({ skipped: 'not a video' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Derive storage path from public URL
    // URL pattern: <SUPABASE_URL>/storage/v1/object/public/rally-media/<event_id>/<uuid>.<ext>
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = media.url.indexOf(marker);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: 'Cannot parse storage path from url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const oldPath = media.url.substring(idx + marker.length);
    const ext = (oldPath.split('.').pop() || '').toLowerCase();

    // Already mp4/webm — nothing to do, just clear processing flag
    if (ext === 'mp4' || ext === 'webm') {
      await admin
        .from('rally_media')
        .update({ processing: false })
        .eq('id', media.id);
      return new Response(JSON.stringify({ skipped: 'already playable', ext }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Download the .mov
    const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(oldPath);
    if (dlErr || !blob) {
      return new Response(
        JSON.stringify({ error: 'Download failed', detail: dlErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3) Remux with ffmpeg-wasm (stream copy, no re-encode)
    const ff = await getFfmpeg();
    const inputName = `input.${ext}`;
    const outputName = 'output.mp4';

    const inputBytes = new Uint8Array(await blob.arrayBuffer());
    await ff.writeFile(inputName, inputBytes);

    // -c copy = stream copy (no re-encode, near-instant)
    // -movflags +faststart = web-friendly (moov atom at front)
    // -f mp4 = force mp4 container
    await ff.exec(['-i', inputName, '-c', 'copy', '-movflags', '+faststart', '-f', 'mp4', outputName]);

    const outputData = await ff.readFile(outputName);
    const mp4Bytes = outputData instanceof Uint8Array ? outputData : new Uint8Array(outputData);

    // Cleanup ffmpeg FS
    try {
      await ff.deleteFile(inputName);
      await ff.deleteFile(outputName);
    } catch (_) {
      // ignore
    }

    // 4) Upload mp4 to same path with .mp4 extension
    const newPath = oldPath.replace(/\.[^.]+$/, '.mp4');
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(newPath, mp4Bytes, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (upErr) {
      return new Response(
        JSON.stringify({ error: 'Upload failed', detail: upErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(newPath);
    const newUrl = urlData.publicUrl;

    // 5) Update the media row
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

    // 6) Delete original (best-effort, only if path actually changed)
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

    // Best-effort: if we know the media_id, clear processing flag so UI doesn't get stuck
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.media_id) {
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await admin
          .from('rally_media')
          .update({ processing: false })
          .eq('id', body.media_id);
      }
    } catch (_) {
      // ignore
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
