

# Rally Join Onboarding Flow: "1, 2, 3" Guided Setup

## Overview

This plan implements a guided 3-step onboarding experience when someone joins a rally. Each step is a prominent banner/dialog that ensures every attendee is fully set up for the event:

1. **Step 1**: Accept/Join the Rally (full-screen invite banner)
2. **Step 2**: Choose your ride role (DD or Rider)
3. **Step 3**: Share your location for safety tracking

---

## User Experience Flow

```text
User receives rally invite
         ↓
┌─────────────────────────────────────────────────────┐
│  STEP 1: Rally Invite Banner (Full Screen)         │
│                                                     │
│  [Avatar] John invited you to:                      │
│                                                     │
│  "Saturday Night Hangout"                           │
│  📍 Downtown Bar & Grill                            │
│  📅 Tonight at 8:00 PM                              │
│                                                     │
│  [     I'M IN!     ]  [  Nah  ]                    │
└─────────────────────────────────────────────────────┘
         ↓ (Click "I'm In!")
┌─────────────────────────────────────────────────────┐
│  STEP 2: Rally Rides Banner                         │
│                                                     │
│  🚗 How are you getting there?                      │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │ 🛡️ I'M THE DD    │  │ 🚌 I NEED A RIDE │        │
│  │ (Drive others    │  │ (Find a ride     │        │
│  │  home safely)    │  │  from the crew)  │        │
│  └──────────────────┘  └──────────────────┘        │
│                                                     │
│  [ I'll figure it out later ]                       │
└─────────────────────────────────────────────────────┘
         ↓ (Make selection or skip)
┌─────────────────────────────────────────────────────┐
│  STEP 3: Location Sharing Banner                    │
│                                                     │
│  📍 "It's important for troops to stick together"  │
│                                                     │
│  Share your location with the crew so everyone      │
│  can find each other and stay safe.                 │
│                                                     │
│  [  SHARE MY LOCATION  ]                            │
│                                                     │
│  [ Maybe Later ]                                    │
└─────────────────────────────────────────────────────┘
         ↓
User lands on Event Detail page, fully set up
```

---

## Part 1: Rally Onboarding Context

**New File: `src/contexts/RallyOnboardingContext.tsx`**

Manages the 3-step flow state:
- Tracks current step: `invite` → `rides` → `location` → `complete`
- Stores event and invite data
- Handles auto-progression between steps
- Persists state to sessionStorage for refresh recovery

---

## Part 2: Step 1 - Rally Invite Banner

**New File: `src/components/onboarding/RallyInviteBanner.tsx`**

Full-screen overlay when user has pending invite:

- Slides down from top with smooth animation
- Shows event details (title, location, time, host avatar)
- **"I'm In!"** button - accepts invite, fires confetti, progresses to Step 2
- **"Nah"** button - declines invite and closes banner
- Sound effect on accept
- Triggered by pending invites or realtime new invite detection

---

## Part 3: Step 2 - Rally Rides Banner

**New File: `src/components/onboarding/RallyRidesBanner.tsx`**

Appears immediately after accepting:

- Two prominent cards: "I'm the DD" and "I Need a Ride"
- DD selection opens DDSetupDialog flow
- Rider selection opens RequestRideDialog
- "I'll figure it out later" skips to Step 3
- Progress indicator showing Step 2 of 3

---

## Part 4: Step 3 - Location Sharing Banner

**New File: `src/components/onboarding/LocationSharingBanner.tsx`**

Final step with safety messaging:

- Prominent text: "It's important for troops to stick together"
- Shield/safety visual
- "Share My Location" button requests permission and updates `event_attendees.share_location`
- "Maybe Later" completes onboarding without sharing
- Celebration animation when enabled

---

## Part 5: Integration Points

**Modified Files:**

| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap with RallyOnboardingProvider |
| `src/pages/Index.tsx` | Render onboarding banners as overlays |
| `src/pages/EventDetail.tsx` | Support continuing onboarding if navigated directly |
| `src/hooks/useEventInvites.tsx` | Add realtime subscription for instant invite detection |
| `src/index.css` | Banner slide animations and step indicator styles |

---

## Part 6: Banner Animation Styles

```css
@keyframes banner-slide-down {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.rally-onboarding-banner {
  animation: banner-slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Step indicator */
.step-dot.active { width: 24px; background: white; }
.step-dot.completed { background: #22c55e; }
```

---

## Summary of All Files

**New Files:**
| File | Purpose |
|------|---------|
| `src/contexts/RallyOnboardingContext.tsx` | State management for 3-step flow |
| `src/components/onboarding/RallyInviteBanner.tsx` | Step 1: "I'm In!" / "Nah" |
| `src/components/onboarding/RallyRidesBanner.tsx` | Step 2: DD or Rider selection |
| `src/components/onboarding/LocationSharingBanner.tsx` | Step 3: Location sharing prompt |

**Modified Files:**
| File | Changes |
|------|---------|
| `src/App.tsx` | Add RallyOnboardingProvider |
| `src/pages/Index.tsx` | Render banners, trigger on invite |
| `src/pages/EventDetail.tsx` | Support onboarding continuation |
| `src/hooks/useEventInvites.tsx` | Realtime invite subscription |
| `src/index.css` | Animation styles |

---

## Technical Details

**Realtime Detection:**
- Subscribe to `event_invites` INSERT events filtered by current user
- Immediately show Step 1 banner when new invite arrives
- Play notification sound

**State Persistence:**
- Store `{ eventId, step, startedAt }` in sessionStorage
- Resume onboarding if interrupted within 30 minutes
- Clear on completion

**Button Labels (Step 1):**
- Accept: **"I'm In!"**
- Decline: **"Nah"**

