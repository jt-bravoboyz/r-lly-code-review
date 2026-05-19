#!/usr/bin/env node
/**
 * Test Cloudflare Worker share-unfurl logic via rlly.cloud.
 *
 * Tests /join/<code> and /events/<id> paths against
 * iMessage/Applebot, Twitterbot, Facebook, Snapchat, Instagram,
 * WhatsApp, Discord, Slack, and LinkedIn user agents.
 *
 * Verifies:
 *   - status 200
 *   - Content-Type: text/html
 *   - og:title / og:description / og:image / twitter:image present
 *   - og:image actually resolves as image/*
 *
 * Usage:
 *   node scripts/test-worker-unfurl.mjs [inviteCode] [eventId]
 */

const DOMAIN = 'https://rlly.cloud';
const INVITE_CODE = process.argv[2] ?? 'F5FF4F';
const EVENT_ID   = process.argv[3] ?? '7ac9026b-ed40-44f9-b8d5-95cd5c0c1b86';

const BOTS = [
  { name: 'iMessage / Applebot', ua: 'Applebot/0.1; +http://www.apple.com/go/applebot' },
  { name: 'Twitterbot',          ua: 'Twitterbot/1.0' },
  { name: 'Facebook',            ua: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
  { name: 'Snapchat',            ua: 'Snapchat/11.0.0 (iPhone; iOS 15.0; Scale/3.00)' },
  { name: 'Instagram',           ua: 'Instagram 219.0.0.0.1 Android' },
  { name: 'WhatsApp',            ua: 'WhatsApp/2.22.24.0 i' },
  { name: 'Discord',             ua: 'Discordbot/2.0 (+https://discordapp.com)' },
  { name: 'Slack',               ua: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)' },
  { name: 'LinkedIn',            ua: 'LinkedInBot/1.0 (compatible; Mozilla/5.0)' },
];

function fail(msg) { console.error(`  ❌ ${msg}`); return false; }
function pass(msg) { console.log(`  ✅ ${msg}`); return true; }

function extractMeta(html, attr, name) {
  const re = new RegExp(
    `<meta[^>]*\\b${attr}=["']${name}["'][^>]*\\bcontent=["']([^"']+)["']` +
      `|<meta[^>]*\\bcontent=["']([^"']+)["'][^>]*\\b${attr}=["']${name}["']`,
    'i',
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2]) : null;
}

async function testPath(path, label) {
  console.log(`\n🧪 ${label}  (${DOMAIN}${path})`);
  let allOk = true;

  for (const bot of BOTS) {
    console.log(`\n  → ${bot.name}`);
    let res;
    try {
      res = await fetch(`${DOMAIN}${path}`, {
        redirect: 'manual',
        headers: { 'User-Agent': bot.ua },
      });
    } catch (e) {
      allOk = fail(`fetch threw: ${e.message}`);
      continue;
    }

    if (res.status !== 200) { allOk = fail(`expected 200, got ${res.status}`); continue; }
    pass('status 200');

    const ct = res.headers.get('content-type') ?? '';
    if (!/text\/html/i.test(ct)) allOk = fail(`Content-Type "${ct}" — expected text/html`);
    else pass(`Content-Type: ${ct}`);

    const html = await res.text();
    if (!html.includes('<meta')) { allOk = fail('no <meta> tags (looks like SPA passthrough)'); continue; }

    const ogTitle = extractMeta(html, 'property', 'og:title');
    const ogDesc  = extractMeta(html, 'property', 'og:description');
    const ogImage = extractMeta(html, 'property', 'og:image');
    const twImage = extractMeta(html, 'name',     'twitter:image');

    if (!ogTitle) allOk = fail('missing og:title');       else pass(`og:title:       ${ogTitle}`);
    if (!ogDesc)  allOk = fail('missing og:description'); else pass(`og:description: ${ogDesc}`);
    if (!ogImage) allOk = fail('missing og:image');       else pass(`og:image:       ${ogImage}`);
    if (!twImage) allOk = fail('missing twitter:image');  else pass(`twitter:image:  ${twImage}`);

    if (ogImage) {
      try {
        const imgRes = await fetch(ogImage, { redirect: 'follow' });
        const imgCt = imgRes.headers.get('content-type') ?? '';
        if (imgRes.status !== 200) allOk = fail(`og:image returned ${imgRes.status}`);
        else if (!/^image\//i.test(imgCt)) allOk = fail(`og:image Content-Type "${imgCt}"`);
        else pass(`og:image resolves (${imgCt})`);
      } catch (e) { allOk = fail(`og:image fetch threw: ${e.message}`); }
    }
  }
  return allOk;
}

(async () => {
  const joinOk  = await testPath(`/join/${INVITE_CODE}`, '/join/<code>');
  const eventOk = await testPath(`/events/${EVENT_ID}`,  '/events/<id>');

  console.log('\n─────────────────────────────');
  if (joinOk && eventOk) { console.log('✅ Worker unfurl check PASSED'); process.exit(0); }
  else { console.log('❌ Worker unfurl check FAILED'); process.exit(1); }
})();
