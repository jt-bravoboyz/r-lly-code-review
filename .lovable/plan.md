
# Complete Plan: Address Inputs, Distance Units, After R@lly Opt-In Flow, and Rainbow Glide Transition

## Overview
This plan addresses four key issues:
1. **Missing LocationSearch dropdown** on several address inputs
2. **Metric units (km)** displaying instead of miles/feet for US users
3. **After R@lly theme transition** happening before users opt-in
4. **Rainbow glide transition** - create an extravagant, fun visual effect when transitioning to purple theme

---

## Part 1: Simplify DD Offer Ride Dialog

### Problem
The `CreateRideDialog.tsx` asks DDs to manually enter pickup location and destination, but DDs are already at the event.

### Solution
Remove unnecessary fields and auto-populate sensible defaults.

**Changes to `src/components/rides/CreateRideDialog.tsx`:**
- Remove `pickup_location` and `destination` form fields from UI
- Auto-set `pickup_location` to "Event Location"
- Auto-set `destination` to "Safe rides home"
- Keep only: Available Seats, Departure Time, and optional Notes

---

## Part 2: Add LocationSearch to Address Inputs

### Files to Update:

| File | Change |
|------|--------|
| `src/components/home/RallyHomeButton.tsx` | Replace plain Input with LocationSearch (2 places) |
| `src/components/events/EndRallyDialog.tsx` | Replace plain Input with LocationSearch, save coordinates |

### Implementation Pattern:
```tsx
<LocationSearch
  value={customAddress}
  onChange={setCustomAddress}
  onLocationSelect={(loc) => {
    setCustomAddress(loc.name);
    setCustomAddressCoords({ lat: loc.lat, lng: loc.lng });
  }}
  placeholder="Search for address..."
  showMapPreview={false}
/>
```

---

## Part 3: Display Distances in Miles (US Units)

### Solution
Create a centralized utility and update all distance displays.

**New File: `src/lib/formatDistance.ts`**
```typescript
export function formatDistance(meters: number, useFeet: boolean = true): string {
  if (useFeet) {
    const feet = meters * 3.28084;
    if (feet < 5280) return `${Math.round(feet)} ft`;
    return `${(feet / 5280).toFixed(1)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
```

**Files to Update:**
- `src/hooks/useDriverETA.tsx`
- `src/components/tracking/MemberLocationCard.tsx`
- `src/components/navigation/TurnByTurnNav.tsx`
- `src/components/location/LocationSearch.tsx`

---

## Part 4: After R@lly Theme Based on User Opt-In

### Current Problem
The purple theme applies immediately when event status changes to `after_rally`, before users have a chance to opt-in.

### Solution
Make theme conditional on BOTH event status AND user's personal opt-in choice.

**Changes to `src/pages/EventDetail.tsx`:**

1. **Query user's opt-in status:**
```tsx
const { data: myAttendee } = useQuery({
  queryKey: ['my-attendee', id, profile?.id],
  queryFn: async () => {
    if (!id || !profile?.id) return null;
    const { data } = await supabase
      .from('event_attendees')
      .select('after_rally_opted_in')
      .eq('event_id', id)
      .eq('profile_id', profile.id)
      .maybeSingle();
    return data;
  },
  enabled: !!id && !!profile?.id,
});
```

2. **Theme only for opted-in users:**
```tsx
const showAfterRallyTheme = isAfterRally && myAttendee?.after_rally_opted_in === true;
```

3. **Update container class:**
```tsx
<div className={`min-h-screen pb-20 ${showAfterRallyTheme ? 'after-rally-mode' : ''}`}>
```

4. **Trigger transition AFTER user opts in (not on event status change):**
```tsx
useEffect(() => {
  if (showAfterRallyTheme) {
    const transitionKey = `after_rally_transition_${id}`;
    if (!sessionStorage.getItem(transitionKey) && !afterRallyTriggeredRef.current) {
      sessionStorage.setItem(transitionKey, 'true');
      afterRallyTriggeredRef.current = true;
      setTimeout(() => {
        triggerAfterRallyTransition();
      }, 200);
    }
  }
}, [showAfterRallyTheme, id, triggerAfterRallyTransition]);
```

---

## Part 5: Rainbow Glide Transition Animation

### Goal
Create an extravagant, fun visual effect that sweeps like a rainbow across the screen before settling into the purple theme.

### Animation Design
- **Duration**: ~2.2 seconds (not too fast, not too slow)
- **Effect**: Horizontal rainbow wave that glides from left to right
- **Colors**: Full spectrum transitioning through warm colors to cool, ending in purple
- **Timing**: Easing curve for smooth, celebratory feel

### CSS Implementation in `src/index.css`

#### 1. Add Rainbow Overlay Element
```css
/* Rainbow transition overlay - appears during theme switch */
.after-rally-mode::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    hsl(0 90% 60%) 0%,      /* Red */
    hsl(30 95% 55%) 15%,    /* Orange */
    hsl(50 100% 50%) 30%,   /* Yellow */
    hsl(120 70% 45%) 45%,   /* Green */
    hsl(200 90% 50%) 60%,   /* Blue */
    hsl(260 80% 55%) 75%,   /* Indigo */
    hsl(280 70% 50%) 90%,   /* Purple */
    transparent 100%
  );
  background-size: 200% 100%;
  animation: rainbow-glide 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  pointer-events: none;
  z-index: 9999;
}

/* Make the rainbow overlay disappear completely after animation */
@keyframes rainbow-glide {
  0% {
    background-position: -100% 0;
    opacity: 0;
  }
  5% {
    opacity: 0.85;
  }
  40% {
    background-position: 50% 0;
    opacity: 0.9;
  }
  70% {
    background-position: 150% 0;
    opacity: 0.7;
  }
  90% {
    background-position: 200% 0;
    opacity: 0.3;
  }
  100% {
    background-position: 300% 0;
    opacity: 0;
    visibility: hidden;
  }
}
```

#### 2. Enhanced Background Transition
Replace the current `after-rally-enter` keyframe with a more dramatic version:

```css
@keyframes after-rally-enter {
  0% {
    background: linear-gradient(180deg, hsl(0 0% 98%) 0%, hsl(0 0% 96%) 100%);
    filter: brightness(1) saturate(1);
  }
  10% {
    filter: brightness(1.1) saturate(1.3);
  }
  30% {
    background: linear-gradient(180deg, hsl(30 60% 85%) 0%, hsl(45 50% 80%) 100%);
    filter: brightness(1.2) saturate(1.5);
  }
  50% {
    background: linear-gradient(180deg, hsl(200 50% 60%) 0%, hsl(220 60% 50%) 100%);
    filter: brightness(1.15) saturate(1.4);
  }
  70% {
    background: linear-gradient(180deg, hsl(260 55% 40%) 0%, hsl(270 60% 25%) 100%);
    filter: brightness(1.1) saturate(1.2);
  }
  85% {
    filter: brightness(1.05) saturate(1.1);
  }
  100% {
    background: linear-gradient(180deg, hsl(270 60% 12%) 0%, hsl(275 70% 6%) 100%);
    filter: brightness(1) saturate(1);
  }
}
```

#### 3. Sparkle Burst During Transition
Add celebratory sparkles that appear during the transition:

```css
/* Sparkle particles during rainbow transition */
.after-rally-mode .rainbow-sparkle {
  position: fixed;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: sparkle-burst 1.5s ease-out forwards;
  pointer-events: none;
  z-index: 10000;
}

@keyframes sparkle-burst {
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: scale(1.5) rotate(180deg);
    opacity: 1;
  }
  100% {
    transform: scale(0) rotate(360deg);
    opacity: 0;
  }
}
```

#### 4. Update Animation Duration
```css
.after-rally-mode {
  background: linear-gradient(180deg, hsl(270 60% 12%) 0%, hsl(275 70% 6%) 100%);
  animation: after-rally-enter 2.2s cubic-bezier(0.16, 1, 0.3, 1);
}
```

### React Component for Sparkles
Add sparkle burst effect in `src/hooks/useAfterRallyTransition.tsx`:

```tsx
const createSparkles = useCallback(() => {
  const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#9B59B6'];
  const container = document.body;
  
  for (let i = 0; i < 20; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'rainbow-sparkle';
    sparkle.style.left = `${Math.random() * 100}vw`;
    sparkle.style.top = `${Math.random() * 100}vh`;
    sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
    sparkle.style.boxShadow = `0 0 10px ${colors[Math.floor(Math.random() * colors.length)]}`;
    sparkle.style.animationDelay = `${Math.random() * 0.8}s`;
    container.appendChild(sparkle);
    
    // Remove after animation
    setTimeout(() => sparkle.remove(), 2500);
  }
}, []);

const triggerAfterRallyTransition = useCallback(() => {
  playTransitionSound();
  createSparkles();
  
  // Haptic pattern: dramatic pulse sequence
  setTimeout(() => triggerHaptic('heavy'), 100);
  setTimeout(() => triggerHaptic('medium'), 600);
  setTimeout(() => triggerHaptic('medium'), 900);
  setTimeout(() => triggerHaptic('success'), 1500);
}, [playTransitionSound, createSparkles, triggerHaptic]);
```

---

## Visual Effect Summary

```text
User clicks "I'm In!" on After R@lly dialog
                    |
                    v
     [0.0s] Rainbow wave starts from left edge
                    |
                    v
     [0.5s] Colors sweep across: Red -> Orange -> Yellow
            Sparkles burst randomly across screen
            Haptic: Heavy pulse
                    |
                    v
     [1.0s] Colors continue: Green -> Blue -> Indigo
            Background begins warming up
            Haptic: Medium pulse
                    |
                    v
     [1.5s] Rainbow reaches purple tones
            Background shifts to deep purple
            Haptic: Medium pulse
                    |
                    v
     [2.0s] Rainbow fades out to right
            Purple theme fully visible
            Stars twinkle animation begins
            Haptic: Success pulse
                    |
                    v
     [2.2s] Transition complete
            Full After R@lly experience active
```

---

## Summary of All Files to Modify

| File | Changes |
|------|---------|
| `src/components/rides/CreateRideDialog.tsx` | Remove pickup/destination inputs, auto-populate defaults |
| `src/components/home/RallyHomeButton.tsx` | Replace Input with LocationSearch (2 places) |
| `src/components/events/EndRallyDialog.tsx` | Replace Input with LocationSearch, save coords |
| `src/lib/formatDistance.ts` | **NEW** - Centralized distance formatting utility |
| `src/hooks/useDriverETA.tsx` | Update formatDistance to support feet/miles |
| `src/components/tracking/MemberLocationCard.tsx` | Use app settings for distance units |
| `src/components/navigation/TurnByTurnNav.tsx` | Use app settings for distance units |
| `src/components/location/LocationSearch.tsx` | Use app settings for distance units |
| `src/pages/EventDetail.tsx` | Theme based on user opt-in, query attendee status |
| `src/components/events/AfterRallyOptInDialog.tsx` | Show on normal screen, trigger R@lly Home on decline |
| `src/index.css` | Rainbow glide animation, enhanced enter effect, sparkle keyframes |
| `src/hooks/useAfterRallyTransition.tsx` | Add sparkle creation, update haptic timing |

---

## Testing Checklist

**Address Inputs:**
- [ ] DD Offer Ride shows simplified form without pickup/destination
- [ ] R@lly Home custom address shows LocationSearch dropdown
- [ ] End R@lly "After R@lly" location shows LocationSearch dropdown

**Distance Units:**
- [ ] All distances display in miles/feet format (e.g., "0.5 mi" not "0.8km")

**After R@lly Theme Flow:**
- [ ] Opt-in dialog shows on NORMAL (white) screen
- [ ] Clicking "I'm In!" triggers rainbow glide transition
- [ ] Rainbow sweeps smoothly from left to right (~2.2s)
- [ ] Sparkles burst across screen during transition
- [ ] Purple theme fully activates after rainbow fades
- [ ] Sound and haptics sync with visual transition
- [ ] Clicking "I'm Heading Home" keeps normal screen and opens R@lly Home
- [ ] Only opted-in users see purple theme
