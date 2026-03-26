

# Launch Readiness & Universal Compatibility

## Already Complete (from previous remediation)
Items 4a-4d are already applied in the codebase:
- `useAdminData.tsx` SELECT already includes `cover_charge`, `location_name`, and all transport columns
- `Profile.tsx` already saves `home_lat` and `home_lng`
- `RideshareDrawer.tsx` already imports and calls `trackEvent`

---

## 1. Policy Scroll-to-Accept (`PolicyAcceptanceDialog.tsx`)

**Problem**: Accept button only requires checkbox ticks, not scrolling through content.

**Fix**:
- Add `onScroll` handler to the ScrollArea content
- Track whether user has scrolled to the bottom of the policy content
- Disable the Accept button until `hasScrolledToBottom === true` AND both checkboxes are checked
- Use `scrollHeight - scrollTop <= clientHeight + 20` threshold for "reached bottom"
- Add subtle hint text: "Scroll to review all policies" when not yet scrolled

**Keyboard overlap fix**:
- Add `pb-[env(keyboard-inset-height,0px)]` or use `visualViewport` resize listener
- Wrap the bottom section in a sticky footer with `position: sticky; bottom: 0` so it stays visible above the keyboard

---

## 2. Admin Navigation (`AdminDashboard.tsx`)

**Fix**: Add a "Return to App" button with Home icon to the admin header, between the title and the view mode toggle.

```
<Link to="/" className="...">
  <Home className="h-4 w-4" />
  <span>Return to App</span>
</Link>
```

Place it after the "R@lly Admin" title, before the `ml-auto` toggle group.

---

## 3. Universal Responsiveness

### 3a. `dvh` for full-screen containers
- Update `min-h-screen` to `min-h-[100dvh]` in key page wrappers: `Index.tsx`, `EventDetail.tsx`, `Auth.tsx`, `Onboarding.tsx`, `AdminDashboard.tsx`, `Profile.tsx`
- Add CSS fallback: `min-height: 100vh; min-height: 100dvh;`

### 3b. BottomNav safe-area
- Already uses `paddingBottom: env(safe-area-inset-bottom)` — verified correct
- Header already has `h-6` spacer but should use `env(safe-area-inset-top)` instead of fixed height
- Update Header: replace `<div className="h-6" />` with `<div style={{ height: 'env(safe-area-inset-top, 1.5rem)' }} />`

### 3c. 44px touch targets
- Audit all interactive elements. The BottomNav icons use `p-2.5` on a 20px icon = ~40px — bump to `p-3` for 44px
- Policy section buttons already use `p-3` + `p-4` — compliant
- Admin toggle pills use `px-3 py-1` — add `min-h-[44px]` for mobile

---

## 4. forwardRef Fix (`LiveActivityFeed.tsx`, `FeatureFlags.tsx`)

Wrap both components in `React.forwardRef` so they accept (and ignore) forwarded refs without console warnings.

```tsx
export const LiveActivityFeed = React.forwardRef<HTMLDivElement>((_, ref) => {
  // existing component body
  return <Card ref={ref}>...</Card>;
});
LiveActivityFeed.displayName = 'LiveActivityFeed';
```

Same pattern for `FeatureFlags`.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/legal/PolicyAcceptanceDialog.tsx` | Scroll-to-bottom gate, keyboard fix |
| `src/pages/AdminDashboard.tsx` | "Return to App" button with Home icon |
| `src/components/layout/Header.tsx` | Use `env(safe-area-inset-top)` instead of fixed `h-6` |
| `src/components/layout/BottomNav.tsx` | Bump touch target to 44px (`p-3`) |
| `src/index.css` | Add `dvh` utility class |
| `src/components/admin/LiveActivityFeed.tsx` | Wrap in `forwardRef` |
| `src/components/admin/FeatureFlags.tsx` | Wrap in `forwardRef` |
| Key page files (Index, Auth, EventDetail, Profile, Onboarding, AdminDashboard) | Replace `min-h-screen` with `min-h-[100dvh]` |

~10 files, all surgical edits. No user-facing flow changes.

