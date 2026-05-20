## Join-a-R@lly Audit #2 — Verify share-preview routing is universal

Comprehensive sweep of every place the codebase constructs a join link, opens a share sheet, or pipes an invite into SMS. Goal: confirm 100% of R@lly invite surfaces route through `buildRallyShareUrl` so iMessage/Slack get themed flyers, and surface any remaining gaps.

---

### Verification results — what's pristine

| Surface | Path | Routes via `buildRallyShareUrl` | iMessage themed flyer |
| --- | --- | --- | --- |
| Host: "Invite friends" dialog → Copy link | `InviteToEventDialog.handleCopyLink` | ✅ | ✅ |
| Host: "Invite friends" dialog → Native share | `InviteToEventDialog.handleShare` | ✅ | ✅ |
| Host: "Invite friends" dialog → SMS body preview | `InviteToEventDialog.smsPreview` | ✅ | ✅ |
| Host: Phone invite → native SMS app | `usePhoneInvites.openSMSInvite` (called with `eventId`) | ✅ | ✅ |
| Event page header → "Copy invite" pill | `EventDetail.tsx:605` | ✅ | ✅ |
| Inbound: `/join/:code` deep link | `App.tsx` route → `JoinRally` | ✅ (no link generated, link lands here) | n/a |
| Inbound: Auth → pending code redirect | `Auth.tsx:262,282` and `ReturningAuth.tsx:133,152` | ✅ (SPA-internal navigate) | n/a |

Confirmed: every host-initiated R@lly share now flows through the crawler-aware `share-preview` edge function. The Cloudflare worker removal did not regress this — the SPA-only pipeline is intact and themed.

---

### Gaps found (ranked by user-visible impact)

#### 1. Recap "Share Recap" CTA bypasses share-preview — `RecapTimeline.tsx:61`
The post-event recap flow (the cinematic 6-transition Interactive Tour ending CTA) does:
```ts
navigator.share({ url: `${PUBLIC_APP_URL}/events/${eventId}` })
```
This is a **growth-loop share** sent after the night — exactly the moment friends-of-attendees see "what a R@lly looks like" in iMessage. Currently it serves the generic SPA OG, not the themed flyer. **Fix:** swap to `buildRallyShareUrl({ eventId })` (omit `inviteCode` → falls back to `/events/<id>` target inside the preview wrapper; bots still hit the themed Satori flyer because the edge function renders by `id`, not by URL shape).

#### 2. `useEventByInviteCode` & `JoinRally.fetchEvent` length guard inconsistency
We loosened `handleCodeSubmit` to accept ≥4 chars last loop, but:
- `JoinRally.fetchEvent` line 58: `if (!inviteCode || inviteCode.length < 6) return;`
- `useEvents.useEventByInviteCode` line 314: `enabled: !!inviteCode && inviteCode.length >= 6`

So a 4-5 char code submitted via the loosened form **silently no-ops in `fetchEvent`** because the inner guard still demands ≥6. Either tighten the submit handler back to 6 or loosen these two guards to ≥4. Recommend loosening both to ≥4 to match the relaxed UX intent.

#### 3. `openSMSInvite` retains a raw-URL fallback when `eventId` is missing
```ts
const shareLink = opts.eventId
  ? buildRallyShareUrl({ eventId: opts.eventId, inviteCode }, ...)
  : `https://rlly.cloud/join/${inviteCode}`;     // ← bypass
```
All current callers in `InviteToEventDialog` pass `eventId`, so the fallback is dead today. But it's a footgun: any future caller that forgets `eventId` silently regresses to non-themed previews. **Fix:** make `eventId` required in the signature (TS catches forgotten args at compile time) and drop the fallback.

#### 4. Stale `PUBLIC_APP_URL` import in `EventDetail.tsx`
Line 3 imports `PUBLIC_APP_URL` but `rg` shows zero uses inside the file. Cosmetic cleanup — no functional impact, but removing it eliminates one tempting "use this for sharing" path for future edits.

---

### Out of scope (related but not "Join a R@lly")

These also produce share links but go through different growth loops, not R@lly join:

- `ContactsTab.tsx`, `SquadInviteDialog.tsx`, `ContactInviteDialog.tsx` — **squad invites** and **generic R@lly app referrals**. They build `PUBLIC_APP_URL + ?ref=…` links. Themed flyer engine memory scopes `buildRallyShareUrl`/`buildTabShareUrl` to event/tab targets only; squad/referral shares are by design plain rlly.cloud links because there's no event/tab to render a flyer for.
- `event-reminder.tsx`, `rally-invite.tsx`, `squad-milestone.tsx` email templates — emails render their own HTML; OG/themed previews don't apply.

If we want themed previews for squad invites too, that's a separate, larger lift (new `share-preview` `type=squad` branch + Satori template) — call it out as a follow-up but don't bundle it here.

---

### Recommended fix queue (single PR, ~small)

1. **`RecapTimeline.tsx`** — replace the raw `${PUBLIC_APP_URL}/events/${eventId}` in `navigator.share({ url })` with `buildRallyShareUrl({ eventId })`.
2. **`JoinRally.fetchEvent`** — change guard from `< 6` to `< 4` to match the loosened submit handler.
3. **`useEventByInviteCode`** — change `enabled` guard from `>= 6` to `>= 4` for the same reason.
4. **`openSMSInvite`** — make `opts.eventId` required, drop the raw-URL fallback. Update the type signature.
5. **`EventDetail.tsx`** — remove the unused `PUBLIC_APP_URL` import.

After this PR, the only places `PUBLIC_APP_URL` appears in client code outside `shareUrls.ts`/`appUrl.ts` are the squad/referral surfaces — which is by design.

---

### Manual QA checklist after shipping

To prove the themed-preview pipeline end-to-end (do this once after merge):
- Send an SMS invite to yourself from `InviteToEventDialog` → tap the link in Messages → confirm the iMessage preview card shows the themed flyer (not the generic R@lly logo).
- Open the recap of any past event → tap "Share Recap" → AirDrop or text to yourself → confirm themed preview.
- Paste a copied invite link into Slack DM → confirm Slack unfurls the themed flyer.

Want me to ship the 5-item fix queue now?
