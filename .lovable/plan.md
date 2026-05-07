# Track Tab — Avatar-in-Pin Upgrade

## Context

The Track tab currently renders `AttendeeMap.tsx`, which is a **static Mapbox Static Images API** screenshot with `pin-s` overlays baked in. There are no real DOM markers to restyle — they're pixels in a JPEG. To deliver avatar-in-teardrop pins with a breathing glow on the current user's pin, we need an interactive map.

`mapbox-gl` is already a project dependency and is used in `BarHopStopsMap.tsx`, so no new packages are needed. All other behavior on the Track tab (the `LiveTracking` card above the map, the sharing/not-sharing lists below, realtime subscriptions, privacy controls, tap behavior) stays untouched.

## Scope (Additive Only)

- Replace ONLY the `<img>` static map preview block inside `AttendeeMap.tsx` with an interactive `mapbox-gl` map.
- Render each sharing attendee as a custom HTML marker built from a new `<AvatarPin />` SVG/DOM component.
- Keep the existing realtime subscription, the "Sharing Location" / "Not sharing" lists below the map, the "Open in Maps" external link affordance, the loading state, and the `<LiveTracking />` card above — all unchanged.
- No changes to: location tracking logic, privacy/visibility, `LiveTracking`, `LiveMemberTracker`, `BarHopStopsMap`, Rides tab, Chat tab, Dress Code, Song Rec's, alerts dedup, R@lly Feed placeholder, unified messaging, Uber/Lyft buttons, "Pick your ride." sheet, R@lly Rides sheet.

## Files

### New: `src/components/tracking/AvatarPin.tsx`
A small presentational component used to build a `mapboxgl.Marker` element.

- Props: `avatarUrl?: string | null`, `displayName?: string | null`, `isCurrentUser?: boolean`.
- Renders a teardrop SVG (~40×52, scaled to ~1.2× when `isCurrentUser`):
  - Rounded top circle + tapering triangular tip at the bottom.
  - Body fill: `bg-white/70 dark:bg-white/15` with `backdrop-blur-md`, 1px border (`border-black/15 dark:border-white/40`), soft drop shadow.
  - Avatar `<img>` clipped to a perfect circle inside the rounded top (~30px), inset for a clean frame. Falls back to initials on `bg-[#F47A19]` text-white when no `avatarUrl`.
- When `isCurrentUser`:
  - Wrapper class adds an outer breathing orange glow via a new keyframe `pin-breath` (3.5s ease-in-out infinite, `box-shadow` on a circular halo behind the teardrop). CSS-only — no JS loop.
  - Pin scaled 1.2× with `transform-origin: bottom center` so the tip stays anchored.
- The pin's bottom point is the visual anchor; we'll pass `anchor: 'bottom'` to `mapboxgl.Marker` so the lat/lng locks to the tip exactly.

### Edit: `src/components/tracking/AttendeeMap.tsx`
- Replace the `<img src={mapUrl} … />` block (and the `generateMapUrl()` helper) with an interactive `mapbox-gl` map mounted in a `ref` div, sized `h-48`.
- On mount (after `mapboxToken` is loaded): create `new mapboxgl.Map({ container, style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12', accessToken: mapboxToken })`. Disable `scrollZoom` to keep the embed calm; keep drag/pinch.
- Maintain a `Map<profileId, mapboxgl.Marker>`:
  - For each `sharingAttendee`, create a marker once using `createRoot()` to render `<AvatarPin>` into a div, then `new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat([lng, lat])`.
  - On attendee updates, call `marker.setLngLat([...])` only on the changed pin (smooth via CSS `transition: transform 400ms ease-in-out` applied to the marker element by mapbox-gl) — no re-creation, no full re-render.
  - When an attendee stops sharing or unmounts: `marker.remove()` and delete from map.
- Add an event-location marker (existing dark pin) using a simple DOM dot, anchored `bottom`.
- Fit bounds when marker set changes (>1 marker) using `map.fitBounds(...)` with padding; otherwise `map.setCenter(...)` at zoom 14.
- Re-apply style on theme change via `map.setStyle(...)`.
- Wrap the map in the existing `<a href={mapLinkUrl}>` only if it makes sense — actually move the "Open in Maps" affordance to a small floating chip in the top-right of the map container so the map itself remains interactive. Tap behavior on individual pins is preserved (we are not adding any new tap behavior; today there is no per-pin tap on the static image, so nothing to break).
- Keep `isLoading` spinner state and "Map unavailable" fallback exactly as today.
- Keep `useEffect` realtime subscription on `event_attendees` UPDATE → `setLiveAttendees` exactly as today; the marker `useEffect` reacts to `liveAttendees` changes.

### Edit: `src/index.css` (or `tailwind.config.ts` keyframes block)
- Add a single `@keyframes pin-breath` (opacity + box-shadow radius easing 0→1→0 over 3.5s) and a `.animate-pin-breath` utility, scoped so it can't leak. Color uses `hsl(27 91% 53% / …)` (R@lly Orange token).

## What stays exactly the same

- `LiveTracking.tsx`, `LiveMemberTracker.tsx`, `MemberLocationCard`, `AttendeeLocationItem`, `useLocationContext`, all hooks under `useLocation*`, all RLS / privacy filters, the "Sharing/Not sharing" lists below the map, the realtime subscription, and the current logic that filters `share_location && current_lat && current_lng` before showing a marker.
- Avatar fallback styling matches existing app convention (orange background, white initials).
- Identifying yourself uses `useAuth().profile.id === attendee.profile_id` — no schema change.

## Acceptance

1. Track tab shows an interactive map with one teardrop-avatar pin per sharing member, tip anchored on their lat/lng.
2. Current user's pin is ~1.2× and has a slow orange breathing glow (CSS-only).
3. Missing avatar → initials on R@lly Orange.
4. Pins move smoothly on realtime updates without remounting other pins.
5. Light + dark map styles look intentional.
6. Static-image-only behaviors that no longer apply (the `<img>` open-in-maps overlay) are replaced by an equivalent floating "Open in Maps" chip.
7. Every other shipped feature listed in the brief is untouched.
