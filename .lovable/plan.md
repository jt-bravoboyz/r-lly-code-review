
# Plan: Full-Day Timeline Slider with "Until we're done" End State

## Overview

Update the existing `TimelineSlider` component to support:
1. Full 24-hour range (12:00 AM → 11:59 PM)
2. "Until we're done" label when slider is at maximum position
3. Data persistence via `end_time = null` to indicate open-ended events

---

## Current Implementation

| Aspect | Current Value |
|--------|---------------|
| Range | 6 PM → 2 AM (8 hours) |
| Steps | 32 positions (0-32) |
| Labels | 6PM, 7PM, ... 2AM |
| Quick Labels | Early, Prime, Late |

---

## New Implementation

| Aspect | New Value |
|--------|-----------|
| Range | 12:00 AM → 11:59 PM (24 hours) |
| Steps | 96 positions (0-96) for 15-min increments |
| Position 96 | Maps to "Until we're done" (stored as `null` end_time) |
| Labels | 12AM, 6AM, 12PM, 6PM, 12AM (minimal, readable) |
| Quick Labels | Morning, Afternoon, Evening, Night |

---

## Technical Details

### Slider Value Mapping (24 hours)

```typescript
// Constants for full day range
const START_HOUR = 0;   // 12:00 AM
const END_HOUR = 24;    // 11:59 PM (position 95) or "open" (position 96)
const TOTAL_MINUTES = 24 * 60; // 1440 minutes
const STEPS = 96;       // 96 positions (0-95 = times, 96 = open-ended)

// Slider value (0-95) → Time string ("HH:mm")
function sliderToTime(value: number): string {
  if (value >= STEPS) return 'open'; // Position 96 = "Until we're done"
  const totalMinutes = value * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Time string ("HH:mm" or "open") → Slider value (0-96)
function timeToSlider(time: string): number {
  if (!time || time === 'open') return STEPS; // Return max for open-ended
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 32; // Default to 8 AM
  const sliderValue = (hours * 60 + minutes) / 15;
  return Math.max(0, Math.min(STEPS - 1, sliderValue));
}
```

### "Until we're done" Logic

| Slider Position | Display | Stored Value |
|-----------------|---------|--------------|
| 0-95 | Normal time (e.g., "10:30 PM") | `"22:30"` |
| 96 (max) | "Until we're done" | `"open"` |

### Display Formatting

```typescript
function formatTimeDisplay(time: string): string {
  if (!time || time === 'open') return "Until we're done";
  // ... existing 12-hour formatting logic
}
```

---

## Files to Modify

### 1. `src/components/events/TimelineSlider.tsx`

Changes:
- Update constants: `START_HOUR = 0`, `STEPS = 96`
- Modify `sliderToTime()` to handle position 96 → `'open'`
- Modify `timeToSlider()` to handle `'open'` → position 96
- Update `formatTimeDisplay()` to show "Until we're done" for `'open'`
- Update `HOUR_LABELS` to: `12AM, 6AM, 12PM, 6PM, 12AM`
- Update `QUICK_LABELS` to: `Morning, Afternoon, Evening, Night`
- Update haptic feedback to trigger every 4 positions (hourly)

### 2. `src/components/events/CreateEventDialog.tsx`

Changes:
- In `onSubmit()`: Handle `time === 'open'` case
  - If `'open'`: set `end_time: null` (no explicit end time)
  - Otherwise: calculate end_time normally
- No schema changes needed (already has nullable `end_time`)

---

## Hour Labels (Minimal, Readable)

```typescript
const HOUR_LABELS = [
  { position: 0, label: '12AM' },   // Midnight
  { position: 24, label: '6AM' },   // Morning
  { position: 48, label: '12PM' },  // Noon
  { position: 72, label: '6PM' },   // Evening
  { position: 96, label: '12AM' },  // End / Open
];
```

---

## Quick Labels (Time of Day)

```typescript
const QUICK_LABELS = [
  { start: 0, end: 24, label: 'Morning', center: 12 },    // 12AM-6AM
  { start: 24, end: 48, label: 'Afternoon', center: 36 }, // 6AM-12PM
  { start: 48, end: 72, label: 'Evening', center: 60 },   // 12PM-6PM
  { start: 72, end: 96, label: 'Night', center: 84 },     // 6PM-12AM
];
```

---

## Data Handling

| User Action | Form Value | Database Storage |
|-------------|------------|------------------|
| Selects 10:00 PM | `"22:00"` | `start_time = date + 22:00` |
| Drags to max | `"open"` | `start_time = date + 23:45`, `end_time = null` |

For "Until we're done":
- Store a reasonable `start_time` (either user's last position before max, or a sensible default like 8 PM)
- Set `end_time = null` to indicate open-ended
- On load/edit: if `end_time === null`, restore slider to max position

---

## Past Time Blocking Update

The `getMinSliderValue()` function will be updated to work with the full 24-hour range:

```typescript
function getMinSliderValue(selectedDate: Date | undefined): number {
  if (!selectedDate) return 0;
  
  const now = new Date();
  const isToday = selectedDate.toDateString() === now.toDateString();
  
  if (!isToday) return 0; // No restriction for future dates
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const bufferMinutes = 15;
  const minPosition = Math.ceil((currentMinutes + bufferMinutes) / 15);
  
  return Math.max(0, Math.min(STEPS, minPosition));
}
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User at position 96 then moves left | Revert to normal time display |
| Loading event with `end_time = null` | Slider at position 96, show "Until we're done" |
| Loading event with `end_time` set | Calculate slider position from `start_time` |
| Today past 11 PM | Allow position 96 ("Until we're done") |

---

## Visual Styling Updates

The existing gradient will be updated to span the full day:

```css
.timeline-slider-track {
  background: linear-gradient(
    to right,
    hsl(240, 40%, 30%) 0%,    /* Night blue at 12AM */
    hsl(200, 60%, 50%) 25%,   /* Dawn blue at 6AM */
    hsl(45, 90%, 60%) 50%,    /* Sunny yellow at 12PM */
    hsl(25, 80%, 55%) 75%,    /* Sunset orange at 6PM */
    hsl(270, 50%, 35%) 100%   /* Night purple at 12AM */
  );
}
```

---

## Deliverables Summary

1. **Modified file**: `src/components/events/TimelineSlider.tsx`
   - Full 24-hour range (96 positions)
   - Position 96 = "Until we're done"
   - Updated hour labels and quick labels
   - Updated past-time blocking for full day
   - Haptic feedback on hour boundaries

2. **Modified file**: `src/components/events/CreateEventDialog.tsx`
   - Handle `'open'` time value in submission
   - Set `end_time: null` for open-ended events

3. **Modified file**: `src/index.css`
   - Update gradient to span full day (night → dawn → noon → sunset → night)

4. **No database changes required**
   - Uses existing nullable `end_time` column
