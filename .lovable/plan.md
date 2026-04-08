

# Fix: RecapTour Fullscreen Coverage

## Problem
The RecapTour overlay uses `z-50`, which ties with the BottomNav (`z-50`) and only barely beats the Header (`z-40`). On some devices/browsers, the nav bar and header bleed through.

## Fix

### `src/components/events/recap/RecapTour.tsx` (line 89)
Change the overlay's class from `z-50` to `z-[100]` so it renders above everything — header, bottom nav, and any other overlays.

One line change. No logic, data, or layout changes.

