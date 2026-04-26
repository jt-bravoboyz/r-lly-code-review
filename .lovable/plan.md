# Hamilton Marketing Pass — Admin Dashboard

A precision overhaul of the Partner → Story view. Every number appears once, attributed correctly, dressed for partner pitches.

---

## 1. Attribution — global K-Factor reconciles with Σ host impact

In `useAdminData.tsx`, after building `invitesByProfile` from the three invite tables, credit every `invite_link_copied` and `invite_code_redeemed` analytics event back to the host of the rally (via `metadata.event_id` → `creator_id`). Then compute:

```ts
const inviteCopied = Σ invitesByProfile     // single source of truth
const kFactor      = inviteCopied / totalEventsCreated
```

Drops the prior double-count (real-tables + analyticsCodeRedeemed). After this, Ansley Guyton's invites credited via analytics show up in her row, and the hero K-Factor equals the sum of the host pills.

Also expose `liveNowCount = filteredRallyEvents.filter(e => e.status === 'live').length` for the live indicator.

## 2. Economy — kill the redundant K-Factor card

In `AdminDashboard.tsx → renderPartner('story')`:
- Remove the standalone `<KFactorCard>` bento.
- Remove the `<AnalyticsCards>` block (its 6 stats are now consolidated into Pulse).
- Story renders only: `<GrowthNarrative>` then `<RallyPulse>`.

## 3. R@lly Pulse — one bar replaces six cards

New `src/components/admin/RallyPulse.tsx`. A single full-width `BentoCard span={12}` rendering a left→right flow:

```text
   Created      Committed Users     Verified Foot Traffic     Safe
     20      ►    47 (57% conv)   ►    38 attendees       ►   92%
```

- Pulsing green dot + "Live Now · {n} active" badge sits in the header when `liveNowCount > 0`.
- Steps separated by chevrons; collapses to a 2×2 grid below `sm`.
- All numbers use `tabular-nums`.
- `safetyRate` already capped at 100 in the hook.

Step labels rebranded for marketing voice:
- `Joined` → **Committed Users**
- `Checked-In` → **Verified Foot Traffic**

## 4. Storytelling polish in Growth Narrative

In `GrowthNarrative.tsx`:
- **High Velocity status badge** next to the K-Factor headline: green pill `↑ HIGH VELOCITY` when `kFactor >= 1`, amber `BELOW THRESHOLD` when `< 1`. Replaces the static "We're growing on our own" copy with a status chip.
- **Trendsetter badge** on the #1 host row: small gold `★ TRENDSETTER` chip next to the name (only on `idx === 0`, only if the host has > 0 invites).
- Per-host meta line becomes conditional: only render `R@llies / invites / attendees` segments when their value is `> 0`. If all zero, show only avatar + name + viral pill.
- Wrap every numeric span in `tabular-nums`.

## 5. Story sub-tab final layout

```text
┌─────────────────────────────────────────────────────────────┐
│  ✦ GROWTH NARRATIVE                  ● Live Now · 1 active  │
│                                                             │
│  7.00x   ↑ HIGH VELOCITY                                    │
│  Each R@lly creates 7.00 new invites on average.            │
│  20 R@llies · 140 invites · +12.4% repeat WoW               │
│                                                             │
│  Top Hosts by Impact                                        │
│   1. ★ Caroline Kay  7 R@llies · 8 invites · 19 attend  1.14x│
│   2.   Ansley Guyton 3 R@llies · 5 invites · 8 attend   1.67x│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  R@LLY PULSE              ● Live Now · 1 active             │
│  Created 20 ─► Committed 47 ─► Verified 38 ─► Safe 92%      │
└─────────────────────────────────────────────────────────────┘
```

Other Partner sub-tabs (Hosts, Geography, Retention, Founders) are untouched — the sub-tab system already isolates Story.

---

## Technical changes

**`src/hooks/useAdminData.tsx`**
- After invite-table aggregation, loop `events.filter(e => e.event_name === 'invite_link_copied' || 'invite_code_redeemed')`, lookup `metadata.event_id → eventCreatorById[id]`, `addInvite(host, 1)`.
- `inviteCopied = Σ invitesByProfile`. Remove `analyticsLinkCopied/analyticsCodeRedeemed` constants.
- New `liveNowCount`; export in returned object.

**`src/components/admin/RallyPulse.tsx`** (new)
- Props: `{ created, committed, verified, conversionRate, safetyRate, liveNowCount }`.
- `BentoCard span={12}` with header containing optional pulsing green dot.
- 4 flex steps with `ChevronRight` between; mobile grid-cols-2.

**`src/components/admin/GrowthNarrative.tsx`**
- New `liveNowCount?: number` prop → renders pulsing dot in header.
- Replace plain caption with status chip (`HIGH VELOCITY` / `BELOW THRESHOLD`).
- Conditional meta segments via `[r,i,a].filter(Boolean).join(' · ')`.
- Trendsetter chip on `idx === 0 && invitesCopied > 0`.

**`src/pages/AdminDashboard.tsx`**
- `renderPartner('story')`: drop `<KFactorCard>` bento and `<AnalyticsCards>` wrapper.
- Pass `liveNowCount={data.liveNowCount}` to both `GrowthNarrative` and `RallyPulse`.
- Add `<RallyPulse … />` directly after `<GrowthNarrative …/>`.

**Out of scope:** Hosts/Geography/Retention/Founders sub-tabs. `KFactorCard.tsx` and `AnalyticsCards.tsx` files remain on disk (still imported by other surfaces if any) but no longer render on Story.
