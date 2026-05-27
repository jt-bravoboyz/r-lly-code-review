## Plan: Fix share-preview UX flash + clean share URLs

### 1. `supabase/functions/share-preview/index.ts`
- Right after the `if (!to)` guard, add a User-Agent check:
  ```ts
  const ua = req.headers.get('user-agent') ?? '';
  const isCrawler = /bot|crawl|spider|slack|facebook|twitter|discord|telegram|whatsapp|applebot|linkedinbot|preview|unfurl/i.test(ua);
  if (!isCrawler) {
    return new Response(null, { status: 302, headers: { ...corsHeaders, location: to } });
  }
  ```
  Real browsers get an instant 302 to `rlly.cloud/join/CODE`; crawlers fall through to the OG HTML path.
- Change the meta refresh from `"1; url=..."` to `"0; url=..."` as a fallback for crawlers that follow meta refresh.

### 2. `src/lib/shareUrls.ts`
- Add a new export `buildRallyShareUrlClean({ eventId, inviteCode }, { referrerId })` returning a direct `https://rlly.cloud/join/<code>` (or `/events/<id>`) URL, with optional `?r=<referrerId>`. No edge-function wrapping.
- Keep `buildRallyShareUrl` (edge-function URL) untouched for crawler/OG-sensitive paths (clipboard on web, link-preview embeds).

### 3. `src/components/events/InviteToEventDialog.tsx`
- Import `buildRallyShareUrlClean` alongside `buildRallyShareUrl`.
- Compute `cleanShareLink` with the same args.
- `smsPreview` uses `cleanShareLink` so the visible SMS draft shows the pretty URL.
- `handleShare()`:
  - `text:` → `\`You're locked in for "${eventTitle}". Claim your spot 🔥\`` (no embedded URL — iOS appends `url`).
  - `url:` → `cleanShareLink`.
- `handleCopyLink()` keeps using `shareLink` (edge-function URL) so clipboard pastes still unfurl OG previews on platforms that fetch from clipboard.

### 4. Audit other share/copy callers for text+url duplication
Sweep for `shareContent(` and `copyToClipboard(` to find any other spot embedding the URL inside the `text` field:

- **`src/pages/EventDetail.tsx` (~line 608 and any other shareContent/copyToClipboard call)** — if it concatenates the share URL into `text`, split it: keep the invitation copy in `text`, move the link to `url`. For `shareContent` use `buildRallyShareUrlClean`; for any clipboard fallback that needs OG preview keep `buildRallyShareUrl`.
- **`src/components/squads/SquadInviteDialog.tsx`** —
  - `handleSendInvite('email' | 'sms')`: messages currently embed `inviteLink` and the code into the body. For SMS via `openSms` the body must keep the URL inline (SMS has no separate URL field), so leave that as-is, but switch the URL it embeds to a clean `rlly.cloud/join-squad/<code>` form (add an equivalent `buildSquadShareUrlClean` helper or inline the clean URL — squads currently use the raw `${baseUrl}/join-squad/${code}` already, which is fine).
  - `handleShare()` (native share sheet): currently passes `text: \`Join "${squadName}" on R@lly! Use code: ${code}\`` and `url: inviteLink` — already separated correctly, no change. Verify and leave intact.
  - `handleCopyLink()`: copies `inviteLink` only (no text), already correct.
  - Action: confirm no `text` field contains the same URL also passed in `url`; only adjust if duplication is found.

For every fixed call site:
- Invitation copy goes in `text` (no URL).
- The URL goes in `url`.
- Clipboard-only fallbacks may keep the OG-wrapped edge-function URL where social unfurling matters.

### Notes
- No DB / RLS / business-logic changes; UI + edge function only.
- 302 response preserves `corsHeaders` so the preflight contract is unchanged.