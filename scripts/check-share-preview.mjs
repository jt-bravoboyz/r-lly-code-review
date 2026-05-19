#!/usr/bin/env node
// Automated check for the share-preview edge function.
// Verifies Content-Type is text/html and og:image + twitter:image meta tags exist.
//
// Usage:
//   node scripts/check-share-preview.mjs [url]
//
// Defaults to a known event share URL if none is provided.

const DEFAULT_URL =
  'https://lovzfxppnxictkvymyot.functions.supabase.co/share-preview' +
  '?to=https%3A%2F%2Frlly.cloud%2Fjoin%2FF5FF4F' +
  '&type=event&id=7ac9026b-ed40-44f9-b8d5-95cd5c0c1b86' +
  '&r=c47f8c5d-bf0f-448e-a95f-ab8df725cbca';

const url = process.argv[2] ?? DEFAULT_URL;

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}
function pass(msg) {
  console.log(`✅ ${msg}`);
}

function extractMeta(html, attr, name) {
  // Matches <meta {attr}="{name}" content="...">  in either attribute order.
  const re = new RegExp(
    `<meta[^>]*\\b${attr}=["']${name}["'][^>]*\\bcontent=["']([^"']+)["']` +
      `|<meta[^>]*\\bcontent=["']([^"']+)["'][^>]*\\b${attr}=["']${name}["']`,
    'i',
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2]) : null;
}

(async () => {
  console.log(`🔎 Checking share preview: ${url}`);
  let res;
  try {
    res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (share-preview-check)' },
    });
  } catch (e) {
    fail(`fetch threw: ${e.message}`);
    return;
  }

  if (res.status !== 200) fail(`expected 200, got ${res.status}`);
  else pass(`status 200`);

  const ct = res.headers.get('content-type') ?? '';
  if (!/text\/html/i.test(ct)) fail(`Content-Type is "${ct}" — expected text/html`);
  else pass(`Content-Type: ${ct}`);

  const html = await res.text();

  const ogImage = extractMeta(html, 'property', 'og:image');
  const twImage = extractMeta(html, 'name', 'twitter:image');
  const ogTitle = extractMeta(html, 'property', 'og:title');
  const ogDesc = extractMeta(html, 'property', 'og:description');

  if (!ogTitle) fail('missing og:title'); else pass(`og:title: ${ogTitle}`);
  if (!ogDesc) fail('missing og:description'); else pass(`og:description: ${ogDesc}`);
  if (!ogImage) fail('missing og:image'); else pass(`og:image: ${ogImage}`);
  if (!twImage) fail('missing twitter:image'); else pass(`twitter:image: ${twImage}`);

  if (ogImage) {
    try {
      const imgRes = await fetch(ogImage, { redirect: 'follow' });
      const imgCt = imgRes.headers.get('content-type') ?? '';
      if (imgRes.status !== 200) fail(`og:image returned ${imgRes.status}`);
      else if (!/^image\//i.test(imgCt)) fail(`og:image Content-Type is "${imgCt}" — expected image/*`);
      else pass(`og:image resolves (${imgCt})`);
    } catch (e) {
      fail(`og:image fetch threw: ${e.message}`);
    }
  }

  if (process.exitCode) console.error('\n❌ share-preview check FAILED');
  else console.log('\n✅ share-preview check PASSED');
})();
