

# R@lly Final Beta Stabilization -- 3 Fixes

## Fix 1: Wrap 30 `console.log` Calls Across 12 Files

Every `console.log` (NOT `console.error`) gets wrapped in `if (import.meta.env.DEV)`. Here are the exact files and line counts:

| File | Lines to Wrap |
|------|--------------|
| `src/hooks/useRides.tsx` | 4 logs (lines 176, 202, 212, 272) |
| `src/hooks/useRideRequests.tsx` | 1 log (line 220) |
| `src/hooks/usePushNotifications.tsx` | 2 logs (lines 75, 112) |
| `src/hooks/useBarHopStopsRealtime.tsx` | 1 log (line 23) |
| `src/hooks/useAfterRallyTransition.tsx` | 1 log (line 77) |
| `src/hooks/useBatteryOptimizedLocation.tsx` | 1 log (line 127) |
| `src/hooks/useHaptics.tsx` | 1 log (line 96) |
| `src/contexts/LocationContext.tsx` | 1 log (line 419) |
| `src/components/location/LocationSearch.tsx` | 1 log (line 100) |
| `src/hooks/useOfflineQueue.tsx` | 1 log (line 38) |
| `src/hooks/useIndoorPositioning.tsx` | 1 log (line 203) |
| `src/components/events/InviteToEventDialog.tsx` | 1 log (line 112) |

`DDArrivedButton.tsx` has no unwrapped `console.log` calls -- verified clean.

All `console.error` and `console.warn` calls remain untouched.

---

## Fix 2: Fix Skeleton forwardRef Warning

The console warning says "Function components cannot be given refs" pointing to `Skeleton` inside `PendingInvites`. The `Skeleton` component in `src/components/ui/skeleton.tsx` is a plain function -- not wrapped in `forwardRef`. React is attempting to pass a ref to it (likely via Radix internals or animation library).

**Fix**: Convert `Skeleton` to use `forwardRef`:

```typescript
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Skeleton = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
  )
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
```

This eliminates the React warning. No behavioral change.

Note: The `QuickRallyDialog` already uses `forwardRef` correctly -- no fix needed there. The console warning was misattributed in earlier analysis; it originates from `Skeleton`.

---

## Fix 3: Lifecycle Verification

After applying fixes 1 and 2, verify the console is clean by checking:
- No `console.log` output in production mode
- No React warnings (forwardRef resolved)
- No unhandled promise rejections

This is a verification step, not a code change.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/ui/skeleton.tsx` | Add `forwardRef` |
| 12 hook/component files | Wrap `console.log` in `import.meta.env.DEV` |

**No new dependencies. No schema changes. No behavioral changes. Console cleanup only.**

