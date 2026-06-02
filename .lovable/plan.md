# Phase 3: Standalone Squad R@lly Home

Add a squad-scoped safety check-in session that mirrors the event R@lly Home experience but works without an event. Any squad member can start a session, all members auto-join, and each member sets their plan, marks departure, and confirms safe arrival.

## 1. Database migration

Two new tables in `public`:

**`rally_home_sessions`** — one per active squad safety check-in
- `squad_id` (FK → squads, cascade), optional `event_id` (FK → events, set null)
- `created_by` (FK → profiles), `name`, `status` ('active'|'completed'|'expired') default 'active'
- `started_at`, `ended_at`, `created_at`
- Partial index on `(squad_id, status) WHERE status='active'`

**`rally_home_participants`** — one row per squad member per session
- `session_id`, `profile_id`, `opted_out`
- `destination_name`, `destination_lat`, `destination_lng`
- `going_home_at`, `arrived_safely`, `arrived_at`
- `is_dd`, `needs_ride`, `not_participating_confirmed`
- `UNIQUE(session_id, profile_id)`, index on `session_id`

GRANTs (authenticated + service_role only — auth-only feature, no anon).

RLS policies:
- Sessions: SELECT/INSERT for squad members + owner; UPDATE for `created_by`
- Participants: SELECT/INSERT for squad members of the session's squad; UPDATE only own row

## 2. Hooks — `src/hooks/useSquadRallyHome.tsx`

- `useActiveSquadSession(squadId)` — `maybeSingle()` active session + most recent completed session (for history line)
- `useSessionParticipants(sessionId)` — participants joined with `safe_profiles`, with realtime subscription on `rally_home_participants` filtered by `session_id` (pattern from `useMyAttendeeStatus`)
- `useMySessionParticipant(sessionId)` — current user's row
- `useStartSquadSession(squadId)` — insert session, then bulk insert participants for every `squad_members` row + squad owner
- `useEndSquadSession()` — set status='completed', ended_at=now()
- `useUpdateMyParticipantStatus()` — partial update of current user's participant row

All mutations invalidate `['squad-rally-home-session', squadId]` and `['squad-rally-home-participants', sessionId]`.

## 3. Component — `src/components/home/SquadRallyHomeCard.tsx`

Props: `squadId: string`, `squadName: string`, `isOwner: boolean`.

**State A — No active session**
- Card with title "🏠 R@lly Home" + subtitle "Keep your squad safe tonight"
- If a completed session exists: muted line "Last session: {date} — {summary}"
- Full-width primary "Start R@lly Home for Squad" button (`rounded-full h-12 bg-primary font-montserrat font-bold`)

**State B — Active session** (three sections, same `text-xs font-semibold text-muted-foreground uppercase tracking-wide` header style as event tab):

1. **Your Status** — single primary CTA driven by `myParticipant`:
   - arrived → disabled green "Arrived Safely ✓"
   - going_home_at set → green h-14 "I've Arrived Safely" → `{arrived_safely:true, arrived_at:now}`
   - destination set, not departed → orange "I'm Heading Home Now" → `{going_home_at:now}`
   - opted_out / not_participating_confirmed → muted "You opted out" + "Rejoin" link
   - no plan → orange "Set My Home Plan" → opens bottom sheet (Sheet component) with destination text input, "I'm the DD tonight" toggle, "I need a ride home" toggle, "I'm all good on my own" option, "Not joining this session" link, Save

2. **Getting Around** — simple text-only ride coordination (no map):
   - List participants where `is_dd=true` with Car icon: "{name} is driving tonight 🚗"
   - List participants where `needs_ride=true` with person icon
   - "You're the DD 🚗" badge if applicable
   - Empty state: "No ride plans set yet"

3. **Everyone's Status** — inline reuse of `HomeStatusRing` visual pattern using `useSessionParticipants`. Green ring avatars for arrived, dimmed for still out, first name below each. Count: "X of Y home safe 🏠"

Footer (if `isOwner` or `created_by === profile.id`): small "End session" link → confirm dialog → `useEndSquadSession`.

Card style: `rounded-xl border-0 shadow-[0_4px_12px_rgba(0,0,0,0.04)] bg-card`. All buttons `rounded-full`. Semantic tokens only — no hardcoded colors.

## 4. Integrate into `SquadDetail.tsx`

Import and render `<SquadRallyHomeCard squadId={squad.id} squadName={squad.name} isOwner={isOwner} />` after the action buttons row and before the Members section.

## Technical notes

- Use existing `getPrivateName` from `@/lib/identity` for avatar labels (private name appropriate for safety context)
- Realtime subscription cleanup pattern matches `useMyAttendeeStatus` (ref guard + unsubscribe on unmount)
- Bottom sheet uses existing `Sheet` from shadcn — destination is text-only for v1 (no Mapbox)
- Migration runs first; types regenerate before hook/component code is written
