
# Plan: Timeline Slider for Time Selection

## Overview

Replace the dropdown time picker in the Create Event dialog with a premium horizontal timeline slider that lets users visually scrub through evening hours and snap to 15-minute increments.

---

## Current Implementation

| Component | Current UI | Location |
|-----------|-----------|----------|
| CreateEventDialog | Dropdown Select with 96 time options (24 hours × 4) | Lines 256-280 |
| QuickRallyDialog | Dropdown Select with preset options (Now, +1hr, etc.) | Lines 306-324 |

Both use `<Select>` with `<SelectContent>` requiring scrolling through options.

---

## New Component: `TimelineSlider.tsx`

A reusable horizontal timeline slider with the following specs:

```text
            ┌─────────────────────────────────────────────────────┐
            │              Rally Start Time                       │
            │                  9:30 PM                            │
            │                                                     │
            │  6PM    7PM    8PM    9PM    10PM   11PM   12AM   1AM   2AM  │
            │   │      │      │      │      │      │      │     │     │   │
            │ ──┼──────┼──────┼──────┼──────┼──────┼──────┼─────┼─────┼── │
            │                    ◉                                │
            │                                                     │
            │   Early          Prime            Late              │
            └─────────────────────────────────────────────────────┘
```

### Timeline Specifications

| Property | Value |
|----------|-------|
| Range | 6:00 PM → 2:00 AM (8 hours = 480 minutes) |
| Increments | 15-minute snap points (33 total positions) |
| Default (create) | Now + 30 minutes (rounded to nearest 15) |
| Default (edit) | Load existing time |

### Visual Design

- **Track**: Full-width horizontal bar with subtle gradient (darker at late hours)
- **Tick marks**: Larger ticks at each hour, smaller ticks at 15-min intervals
- **Thumb**: Large pill-shaped handle (44px touch target) with glow effect
- **Selected range**: Gradient fill from start to current position
- **Time display**: Large, prominent text above slider showing "9:30 PM"
- **Quick labels**: "Early" (6-8PM), "Prime" (8-11PM), "Late" (11PM-2AM)

---

## Files to Create

### 1. `src/components/events/TimelineSlider.tsx` (NEW)

New component with:

```typescript
interface TimelineSliderProps {
  value: string; // "HH:mm" format (e.g., "21:30")
  onChange: (value: string) => void;
  selectedDate?: Date; // For blocking past times
  minTime?: string; // Optional minimum time
  className?: string;
}
```

**Key Logic:**

1. **Slider Value Mapping**
   - Slider range: 0 → 32 (33 positions for 15-min intervals across 8 hours)
   - Position 0 = 18:00 (6 PM)
   - Position 32 = 02:00 (2 AM next day)
   - Formula: `sliderValue * 15 + 18*60` gives minutes since midnight

2. **Past Time Handling**
   - Calculate minimum valid slider position based on current time
   - If selected date is today and current time is 7:30 PM, block positions 0-5
   - Visually dim/disable past portion of the track
   - Auto-shift to next valid time if current selection becomes invalid

3. **Snap Behavior**
   - Use Radix Slider's `step` prop for automatic 15-min snapping
   - No manual snap logic needed

---

## Files to Modify

### 2. `src/components/events/CreateEventDialog.tsx`

**Changes:**
- Import new `TimelineSlider` component
- Replace lines 256-280 (the Select time picker) with TimelineSlider
- Add logic to calculate default time (now + 30 min rounded to 15)
- Pass selected date to TimelineSlider for past-time blocking

**Before (lines 256-280):**
```tsx
<FormField name="time" ...>
  <Select onValueChange={field.onChange} value={field.value}>
    <SelectContent className="max-h-60">
      {timeOptions.map(...)}
    </SelectContent>
  </Select>
</FormField>
```

**After:**
```tsx
<FormField name="time" ...>
  <TimelineSlider
    value={field.value}
    onChange={field.onChange}
    selectedDate={form.watch('date')}
  />
</FormField>
```

### 3. `src/components/events/QuickRallyDialog.tsx` (Optional Enhancement)

Could also benefit from this slider, but keeping the preset buttons may be better for "quick" flow. I'll leave this unchanged unless requested.

---

## Technical Implementation Details

### Time Mapping Logic

```typescript
// Constants
const START_HOUR = 18; // 6 PM
const END_HOUR = 26; // 2 AM next day (treated as 26:00)
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60; // 480 minutes
const STEPS = TOTAL_MINUTES / 15; // 32 steps

// Slider value (0-32) → Time string ("HH:mm")
function sliderToTime(value: number): string {
  const totalMinutes = START_HOUR * 60 + value * 15;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Time string ("HH:mm") → Slider value (0-32)
function timeToSlider(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  // Handle next-day times (0-2 AM)
  const adjustedHours = hours < START_HOUR ? hours + 24 : hours;
  const totalMinutes = adjustedHours * 60 + minutes;
  const sliderValue = (totalMinutes - START_HOUR * 60) / 15;
  return Math.max(0, Math.min(STEPS, sliderValue));
}
```

### Past Time Blocking

```typescript
function getMinSliderValue(selectedDate: Date | undefined): number {
  if (!selectedDate) return 0;
  
  const now = new Date();
  const isToday = selectedDate.toDateString() === now.toDateString();
  
  if (!isToday) return 0; // No restriction for future dates
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = START_HOUR * 60;
  
  if (currentMinutes < startMinutes) return 0; // Before 6 PM
  if (currentMinutes >= END_HOUR * 60 % (24*60)) return STEPS; // Past 2 AM
  
  // Calculate minimum slider position (round up to next 15 min)
  const minPosition = Math.ceil((currentMinutes - startMinutes) / 15);
  return Math.min(minPosition, STEPS);
}
```

### Haptic Feedback on Hour Snap

```typescript
const { triggerHaptic } = useHaptics();
const lastHourRef = useRef<number>(-1);

function handleSliderChange(value: number) {
  const time = sliderToTime(value);
  const [hours] = time.split(':').map(Number);
  
  // Trigger haptic when crossing an hour boundary
  if (hours !== lastHourRef.current && value % 4 === 0) {
    triggerHaptic('selection');
    lastHourRef.current = hours;
  }
  
  onChange(time);
}
```

---

## CSS Styling

Custom styles for the timeline slider:

```css
/* Track with gradient from sunset to night */
.timeline-slider-track {
  background: linear-gradient(
    to right,
    hsl(35, 90%, 60%) 0%,      /* Sunset orange at 6PM */
    hsl(270, 50%, 40%) 50%,    /* Dusk purple at 10PM */
    hsl(240, 40%, 20%) 100%    /* Night blue at 2AM */
  );
}

/* Hour tick marks */
.timeline-tick-hour {
  height: 12px;
  width: 2px;
  background: currentColor;
}

/* 15-min tick marks */
.timeline-tick-quarter {
  height: 6px;
  width: 1px;
  background: currentColor;
  opacity: 0.5;
}

/* Large thumb for touch */
.timeline-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  border: 3px solid hsl(var(--primary));
}
```

---

## Accessibility

| Feature | Implementation |
|---------|----------------|
| Large touch target | 44px minimum thumb size |
| Clear label | "Rally start time" above slider |
| Keyboard support | Arrow keys (Radix Slider built-in) |
| Screen reader | aria-label, aria-valuetext for time |
| Focus visible | Ring outline on focus |

---

## Component Structure

```
TimelineSlider/
├── Time Display (prominent, e.g. "9:30 PM")
├── Slider Track
│   ├── Background gradient (sunset → night)
│   ├── Past time overlay (dimmed)
│   ├── Active range (highlighted)
│   └── Thumb (large, draggable)
├── Tick Marks Row
│   ├── Hour ticks (larger)
│   └── 15-min ticks (smaller)
├── Hour Labels Row
│   └── "6PM", "7PM", ... "2AM"
└── Quick Labels Row (optional)
    └── "Early" | "Prime" | "Late"
```

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No date selected | Show full range, no blocking |
| Today selected, current time 7:45 PM | Block 6-7:30 PM, start at 8 PM |
| Today selected, past 2 AM | All times blocked, show message |
| Tomorrow selected | Full range available |
| Editing existing event | Pre-populate with existing time |
| Time outside 6PM-2AM range | Clamp to nearest valid time |

---

## Deliverables Summary

1. **New file**: `src/components/events/TimelineSlider.tsx`
   - Horizontal slider with 6PM-2AM range
   - 15-minute snap points
   - Visual tick marks and hour labels
   - Past time dimming
   - Haptic feedback on hour boundaries
   - Premium sunset-to-night gradient styling

2. **Modified file**: `src/components/events/CreateEventDialog.tsx`
   - Replace Select dropdown with TimelineSlider
   - Calculate smart default time (now + 30 min)
   - Pass selected date for validation

3. **No changes to**:
   - Backend/database schema
   - Form validation logic
   - Submission handling
   - Time field format ("HH:mm" string)
