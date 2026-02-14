
# Display Rider Distance in Miles

## Change Summary
Replace the `formatDistanceCompact` call in the RiderLine component with a simple miles-only formatter that converts meters to miles.

## What Changes

**src/components/rides/RiderLine.tsx** (display layer only):
- Add a small local helper function `formatMiles(meters)` that:
  - Converts meters to miles (`meters * 0.000621371`)
  - Returns `"Less than 0.1 mi"` if under 0.1 miles
  - Returns `"X.X mi"` with 1 decimal place otherwise
- Replace the `formatDistanceCompact(rider.distanceMeters)` call with `formatMiles(rider.distanceMeters)`
- Remove the unused `formatDistanceCompact` import

## What Does NOT Change
- Sorting logic (still sorts by raw `distanceMeters` before formatting)
- Backend calculations
- Live location updates
- UI layout
- Any other distance displays elsewhere in the app

## Technical Details

The formatting function:
```
function formatMiles(meters: number): string {
  const miles = meters * 0.000621371;
  if (miles < 0.1) return "Less than 0.1 mi";
  return `${miles.toFixed(1)} mi`;
}
```

Unit conversion: meters to miles using the standard factor (1 meter = 0.000621371 miles).
