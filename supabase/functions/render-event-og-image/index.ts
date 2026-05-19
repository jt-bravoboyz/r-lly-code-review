// Renders a 1200x630 OG image PNG for an event or standalone tab, using Satori + resvg-wasm.
// First request: render + upload to event_flyers bucket, then 302 to the public URL.
// Subsequent requests: 302 directly to the cached URL if fresh.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import satori from 'https://esm.sh/satori@0.10.13';
import { Resvg, initWasm } from 'https://esm.sh/@resvg/resvg-wasm@2.6.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// One-time wasm init.
let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = fetch('https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm')
      .then(r => r.arrayBuffer())
      .then(buf => initWasm(buf));
  }
  await wasmReady;
}

// Lazy-load Playfair Display. Returns null if unreachable so render still proceeds.
let playfairFont: ArrayBuffer | null = null;
async function getPlayfair(): Promise<ArrayBuffer | null> {
  if (playfairFont) return playfairFont;
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } },
    ).then(r => r.text());
    const url = css.match(/url\((https:\/\/[^)]+\.(?:woff2|woff|ttf))\)/)?.[1];
    if (!url) throw new Error('Playfair font URL not found');
    playfairFont = await fetch(url).then(r => r.arrayBuffer());
    return playfairFont;
  } catch (e) {
    console.warn('[render-event-og-image] font load failed, falling back to sans', e);
    return null;
  }
}

const FALLBACK_URL =
  `https://${Deno.env.get('SUPABASE_PROJECT_ID') ?? 'lovzfxppnxictkvymyot'}.supabase.co/storage/v1/object/public/event_flyers/_system/og-fallback.png`;

interface FlyerInputs {
  title: string;
  dateLabel: string;
  location: string | null;
  themeKey: string;
  customImageUrl: string | null;
  hostName: string | null;
}

// Mirror of src/lib/flyerThemes.ts — kept inline so the edge function is self-contained.
const THEMES: Record<string, { titleColor: string; metaColor: string; archTint: string; bg: string; gradient: string }> = {
  rally_dynamic: { titleColor: '#FFE9D2', metaColor: '#FFE9D2', archTint: 'rgba(20,14,10,0.45)', bg: 'rally-dynamic-bg.jpg', gradient: 'linear-gradient(135deg,#FFE9D2,#F47A19,#FFB178)' },
  tequila_sunset: { titleColor: '#FFE2C2', metaColor: '#FFE7D1', archTint: 'rgba(48,18,12,0.4)', bg: 'tequila-sunset-bg.jpg', gradient: 'linear-gradient(135deg,#FFE2C2,#F58E5A,#C8407A)' },
  midnight_disco: { titleColor: '#E9E2FF', metaColor: '#D8CFFF', archTint: 'rgba(12,6,26,0.55)', bg: 'midnight-disco-bg.jpg', gradient: 'linear-gradient(135deg,#E9E2FF,#B59BFF,#5C3CFF)' },
  garden_party: { titleColor: '#3A2A1F', metaColor: '#4A3326', archTint: 'rgba(255,248,240,0.5)', bg: 'garden-party-bg.jpg', gradient: 'linear-gradient(135deg,#3A2A1F,#6B4A3A)' },
  neon_warehouse: { titleColor: '#00F0FF', metaColor: '#E8F5FF', archTint: 'rgba(8,10,14,0.6)', bg: 'neon-warehouse-bg.jpg', gradient: 'linear-gradient(135deg,#F0F8FF,#00F0FF,#FF2E9A)' },
  sunday_brunch: { titleColor: '#2A2419', metaColor: '#3D3221', archTint: 'rgba(255,250,240,0.6)', bg: 'sunday-brunch-bg.jpg', gradient: 'linear-gradient(135deg,#2A2419,#6B5840)' },
  golden_hour: { titleColor: '#FFF1C9', metaColor: '#FFE7B8', archTint: 'rgba(60,30,10,0.4)', bg: 'golden-hour-bg.jpg', gradient: 'linear-gradient(135deg,#FFF1C9,#FFB04A,#B05E1A)' },
  game_day: { titleColor: '#FFFFFF', metaColor: '#F0F4FF', archTint: 'rgba(8,14,32,0.6)', bg: 'game-day-bg.jpg', gradient: 'linear-gradient(135deg,#FFFFFF,#FFD24A)' },
  beach_club: { titleColor: '#0E5A6E', metaColor: '#0B3A4A', archTint: 'rgba(220,245,250,0.5)', bg: 'beach-club-bg.jpg', gradient: 'linear-gradient(135deg,#0E5A6E,#1FA8C4)' },
};

function fitTitle(raw: string, maxLines = 2, maxChars = 18): string[] {
  const clean = (raw || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [''];
  const words = clean.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length <= maxChars) cur = cand;
    else {
      if (cur) lines.push(cur);
      if (lines.length === maxLines) break;
      cur = w.length > maxChars ? w.substring(0, maxChars - 1) + '…' : w;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    const joined = lines.join(' ');
    if (joined.length < clean.length) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = last.substring(0, Math.max(0, maxChars - 1)).replace(/[\s,.]+$/, '') + '…';
    }
  }
  return lines.length ? lines : [''];
}

async function buildPng(inputs: FlyerInputs, bgPublicBase: string): Promise<Uint8Array> {
  const theme = THEMES[inputs.themeKey] ?? THEMES.rally_dynamic;
  const titleLines = fitTitle(inputs.title, 2, 18);
  const bgUrl = inputs.customImageUrl ?? `${bgPublicBase}/${theme.bg}`;
  const font = await getPlayfair();

  const tree: any = {
    type: 'div',
    props: {
      style: {
        display: 'flex', flexDirection: 'column', width: '1200px', height: '630px',
        position: 'relative', justifyContent: 'space-between', padding: '48px',
        backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
        color: theme.metaColor, fontFamily: 'Montserrat, sans-serif',
      },
      children: [
        { type: 'div', props: { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: theme.archTint, display: 'flex' } } },
        // Top row
        { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', position: 'relative', width: '100%' }, children: [
          { type: 'div', props: { style: { padding: '8px 20px', borderRadius: '999px', background: 'rgba(255,255,255,0.18)', fontSize: '18px', letterSpacing: '3px', textTransform: 'uppercase', color: theme.metaColor }, children: inputs.hostName ? `Hosted by ${inputs.hostName}` : 'R@lly' } },
          { type: 'div', props: { style: { padding: '8px 20px', borderRadius: '999px', background: 'rgba(255,255,255,0.18)', fontSize: '18px', letterSpacing: '3px', textTransform: 'uppercase', color: theme.metaColor }, children: "You're invited" } },
        ] } },
        // Center arch
        { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '36px 48px', borderRadius: '32px', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', maxWidth: '88%', alignSelf: 'center', position: 'relative' }, children: [
          { type: 'div', props: { style: { fontSize: '20px', letterSpacing: '5px', textTransform: 'uppercase', color: theme.metaColor, opacity: 0.9, display: 'flex' }, children: inputs.dateLabel } },
          { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' }, children: titleLines.map(l => ({ type: 'div', props: { style: { fontFamily: 'Playfair Display', fontWeight: 700, fontSize: '96px', lineHeight: 1.02, color: theme.titleColor, backgroundImage: theme.gradient, backgroundClip: 'text', color: 'transparent', display: 'flex' }, children: l } })) } },
          inputs.location ? { type: 'div', props: { style: { fontSize: '24px', color: theme.metaColor, display: 'flex' }, children: inputs.location } } : null,
        ].filter(Boolean) } },
        // Footer
        { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', width: '100%' }, children: [
          { type: 'div', props: { style: { fontSize: '20px', letterSpacing: '4px', textTransform: 'uppercase', color: theme.metaColor, display: 'flex' }, children: 'rlly.cloud' } },
          { type: 'div', props: { style: { fontSize: '20px', letterSpacing: '4px', textTransform: 'uppercase', color: theme.metaColor, display: 'flex' }, children: 'Nights That Matter' } },
        ] } },
      ],
    },
  };

  const svg = await satori(tree, {
    width: 1200, height: 630,
    fonts: font ? [{ name: 'Playfair Display', data: font, weight: 700, style: 'normal' }] : [],
  });

  await ensureWasm();
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}

async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const eventId = url.searchParams.get('id');
  const code = url.searchParams.get('code');
  const tabId = url.searchParams.get('tab');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const bgPublicBase = `${supabaseUrl}/storage/v1/object/public/event_flyers/_system`;

  try {
    let inputs: FlyerInputs | null = null;
    let cacheKey = '';
    let cachedUrl: string | null = null;
    let writeBackTable: 'events' | 'split_check_requests' | null = null;
    let writeBackId: string | null = null;

    if (tabId) {
      const { data } = await supabase
        .from('split_check_requests')
        .select('id,title,total_cents,flyer_og_url,flyer_theme,flyer_custom_image_url,flyer_og_generated_at')
        .eq('id', tabId).maybeSingle();
      if (!data) throw new Error('Tab not found');
      if (data.flyer_og_url) return Response.redirect(data.flyer_og_url, 302);
      inputs = {
        title: data.title ?? 'Split a tab',
        dateLabel: `$${((data.total_cents ?? 0) / 100).toFixed(2)} · Split with friends`,
        location: null,
        themeKey: (data as any).flyer_theme ?? 'rally_dynamic',
        customImageUrl: (data as any).flyer_custom_image_url ?? null,
        hostName: null,
      };
      writeBackTable = 'split_check_requests';
      writeBackId = data.id;
      cacheKey = `tab/${data.id}/${await sha(JSON.stringify(inputs))}.png`;
    } else if (eventId || code) {
      let q = supabase.from('events').select('id,title,start_time,location_name,flyer_theme,flyer_custom_image_url,flyer_og_url,creator_id,invite_code');
      const { data } = code ? await q.eq('invite_code', code).maybeSingle() : await q.eq('id', eventId!).maybeSingle();
      if (!data) throw new Error('Event not found');
      if (data.flyer_og_url) return Response.redirect(data.flyer_og_url, 302);
      let hostName: string | null = null;
      if (data.creator_id) {
        const { data: p } = await supabase.from('safe_profiles').select('display_name').eq('id', data.creator_id).maybeSingle();
        hostName = p?.display_name ?? null;
      }
      const dt = data.start_time ? new Date(data.start_time) : null;
      inputs = {
        title: data.title,
        dateLabel: dt ? dt.toUTCString().slice(0, 16) : 'Date TBD',
        location: data.location_name,
        themeKey: data.flyer_theme ?? 'rally_dynamic',
        customImageUrl: data.flyer_custom_image_url,
        hostName,
      };
      writeBackTable = 'events';
      writeBackId = data.id;
      cacheKey = `event/${data.id}/${await sha(JSON.stringify(inputs))}.png`;
    } else {
      return Response.redirect(FALLBACK_URL, 302);
    }

    // Render + cache
    const png = await buildPng(inputs!, bgPublicBase);
    const { error: upErr } = await supabase.storage.from('event_flyers').upload(cacheKey, png, {
      contentType: 'image/png', upsert: true, cacheControl: '31536000',
    });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('event_flyers').getPublicUrl(cacheKey);
    cachedUrl = pub.publicUrl;

    if (writeBackTable && writeBackId) {
      await supabase.from(writeBackTable).update({
        flyer_og_url: cachedUrl,
        flyer_og_generated_at: new Date().toISOString(),
      }).eq('id', writeBackId);
    }

    return Response.redirect(cachedUrl, 302);
  } catch (err) {
    console.error('[render-event-og-image]', err);
    return Response.redirect(FALLBACK_URL, 302);
  }
});
