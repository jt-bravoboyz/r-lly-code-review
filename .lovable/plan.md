

# Updated Implementation Plan: Address Inputs, DD Workflow, Rides Tab Removal & Data Model Improvements

## Overview

This plan builds on the previously approved work and incorporates all the required adjustments for:
1. **LocationSearch data model updates** with structured location objects
2. **RallyHomeButton behavior** improvements with state reset and validation
3. **Rides tab removal** with proper migration path
4. **DD workflow backend safety** with idempotent operations and constraints
5. **Ride status lifecycle** and **priority ride offers data model**
6. **DD setup UX rules** and **disclaimer auditing**
7. **State and edge case handling** for robust user experience

---

## Part 1: LocationSearch Data Model Updates

### Current Issue
The `LocationSearch` component returns `{ name, address, lat, lng }` but consumers often store only `name` and coordinates separately, leading to potential mismatches.

### Solution: Structured Location Object Type

**Create new type definition: `src/types/location.ts`**
```typescript
export interface StructuredLocation {
  location_name: string;
  place_id: string | null;
  formatted_address: string;
  lat: number;
  lng: number;
}

export const EMPTY_LOCATION: StructuredLocation = {
  location_name: '',
  place_id: null,
  formatted_address: '',
  lat: 0,
  lng: 0,
};

export function isValidLocation(loc: StructuredLocation | null): boolean {
  return loc !== null && 
         loc.location_name.trim() !== '' && 
         loc.lat !== 0 && 
         loc.lng !== 0;
}
```

**Update LocationSearch component interface:**
```typescript
// Expand onLocationSelect callback to include place_id
onLocationSelect?: (location: {
  name: string;
  address: string;
  lat: number;
  lng: number;
  place_id?: string;  // NEW: Include place_id from Google/Mapbox
}) => void;
```

### Files to Modify:
| File | Change |
|------|--------|
| `src/types/location.ts` | **NEW** - Create structured location type and validation |
| `src/components/location/LocationSearch.tsx` | Add `place_id` to callback, extract from API responses |

---

## Part 2: EndRallyDialog with LocationSearch & Validation

### Changes to `src/components/events/EndRallyDialog.tsx`:

1. **Replace Input with LocationSearch**
2. **Use unified location state object**
3. **Block save if no valid selection made**

```typescript
// State: single unified location object
const [afterRallyLocation, setAfterRallyLocation] = useState<StructuredLocation | null>(null);
const [inputText, setInputText] = useState(''); // For display/typing
const [showLocationError, setShowLocationError] = useState(false);

// Handler: Only accept full location selection
const handleLocationSelect = (loc: LocationSelectResult) => {
  setAfterRallyLocation({
    location_name: loc.name,
    place_id: loc.place_id || null,
    formatted_address: loc.address,
    lat: loc.lat,
    lng: loc.lng,
  });
  setInputText(loc.name);
  setShowLocationError(false);
};

// Validation: Block if typed text but no selection
const handleAfterRally = async () => {
  if (!afterRallyLocation || !isValidLocation(afterRallyLocation)) {
    setShowLocationError(true);
    return; // Don't proceed
  }
  
  // Save all fields to events table
  await supabase.from('events').update({
    after_rally_location_name: afterRallyLocation.location_name,
    after_rally_location_lat: afterRallyLocation.lat,
    after_rally_location_lng: afterRallyLocation.lng,
  }).eq('id', eventId);
  // ...
};

// JSX: Use LocationSearch with error state
<LocationSearch
  value={inputText}
  onChange={(v) => {
    setInputText(v);
    // Clear location if text changed manually
    if (afterRallyLocation && v !== afterRallyLocation.location_name) {
      setAfterRallyLocation(null);
    }
  }}
  onLocationSelect={handleLocationSelect}
  placeholder="Search venue, restaurant..."
  showMapPreview={false}
/>
{showLocationError && (
  <p className="text-xs text-destructive">
    Please select a location from the dropdown
  </p>
)}
```

---

## Part 3: RallyHomeButton Behavior Improvements

### Changes to `src/components/home/RallyHomeButton.tsx`:

**1. Unified location state:**
```typescript
const [customLocation, setCustomLocation] = useState<StructuredLocation | null>(null);
const [customAddressText, setCustomAddressText] = useState('');
```

**2. Reset state on dialog close / mode switch:**
```typescript
// Reset when dialog closes
useEffect(() => {
  if (!open) {
    setCustomLocation(null);
    setCustomAddressText('');
    setDestinationType('home');
    setVisibility('squad');
    setSelectedPeople([]);
  }
}, [open]);

// Reset when destination type changes
const handleDestinationChange = (value: DestinationType) => {
  setDestinationType(value);
  setCustomLocation(null);
  setCustomAddressText('');
};
```

**3. Remove geocoding fallback - strict validation:**
```typescript
const handleGoHome = async () => {
  let finalLocation: StructuredLocation | null = null;
  
  if (destinationType === 'home' && profile?.home_address) {
    // Use stored home - but we need coords
    // If profile doesn't have home_lat/home_lng, require LocationSearch
    if (profile.home_lat && profile.home_lng) {
      finalLocation = {
        location_name: 'Home',
        place_id: null,
        formatted_address: profile.home_address,
        lat: profile.home_lat,
        lng: profile.home_lng,
      };
    } else {
      // Home address exists but no coords - treat as custom
      if (!customLocation) {
        toast.error('Please search and select your home address');
        return;
      }
      finalLocation = customLocation;
    }
  } else {
    // Custom/friend/hotel - require valid location selection
    if (!customLocation || !isValidLocation(customLocation)) {
      toast.error('Please select an address from the dropdown');
      return;
    }
    finalLocation = customLocation;
  }
  
  // NO GEOCODING FALLBACK - we have coords or we error
  // ...save to database
};
```

**4. Persist last successful destination to profile:**
```typescript
// After successful "Go Home"
if (finalLocation) {
  await supabase.from('profiles').update({
    last_rally_home_destination: finalLocation.formatted_address,
    last_rally_home_lat: finalLocation.lat,
    last_rally_home_lng: finalLocation.lng,
  }).eq('id', profile.id);
}
```

**5. Database migration for profile fields:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_rally_home_destination text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_rally_home_lat double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_rally_home_lng double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_lat double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_lng double precision;
```

---

## Part 4: Rides Tab Removal & Migration

### Strategy: Redirect `/rides` to `/events` with informational message

**1. Update BottomNav.tsx - Remove Rides tab:**
```typescript
const navItems = [
  { path: '/', icon: Home, label: 'Home', tutorialId: 'nav-home' },
  { path: '/events', icon: Zap, label: 'R@lly', tutorialId: 'nav-events' },
  // REMOVED: { path: '/rides', icon: Car, label: 'Rides', tutorialId: 'nav-rides' },
  { path: '/notifications', icon: Bell, label: 'Alerts', tutorialId: 'nav-notifications' },
  { path: '/squads', icon: Users, label: 'Squads', tutorialId: 'nav-squads' },
  { path: '/profile', icon: User, label: 'Profile', tutorialId: 'nav-profile' },
];
```

**2. Replace Rides.tsx with redirect:**
```typescript
// src/pages/Rides.tsx - Replace entire file
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function Rides() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event');

  useEffect(() => {
    // If there's an event ID, redirect to that event's rides tab
    if (eventId) {
      navigate(`/events/${eventId}`, { replace: true });
    } else {
      toast.info('Rides are now managed within each event', {
        description: 'Open an event to offer or request rides',
        duration: 4000,
      });
      navigate('/events', { replace: true });
    }
  }, [navigate, eventId]);

  return null;
}
```

**3. Update useTutorial.tsx - Remove rides tutorial step:**
```typescript
// Remove or modify the 'rides-intro' step
// Change targetRoute from '/rides' to point to event detail rides tab
{
  id: 'rides-intro',
  title: 'TRANSPORT LOGISTICS',
  command: 'COORDINATE RIDES',
  instruction: 'Need a ride or can offer one? Rides are coordinated within each event. Open an event to access the Rides tab.',
  targetSelector: '[data-tutorial="nav-events"]', // Changed from nav-rides
  requiredAction: 'navigate',
  targetRoute: '/events',
  position: 'top',
},
```

**4. Update FirstTimeWelcomeDialog.tsx:**
```typescript
{
  icon: Car,
  title: 'Ride Coordination',
  description: 'Offer or request rides within each event',  // Updated text
},
```

**5. Update sw.js notification click handler:**
```typescript
// Line 132: Change default URL
const urlToOpen = event.notification.data?.url || '/events'; // Was '/rides'
```

**6. Update RequestRideDialog.tsx notification URL:**
```typescript
// Line 116: Use event detail URL instead
url: `/events/${eventId}`, // Was `/rides?event=${eventId}`
```

---

## Part 5: DD Workflow Backend Safety

### Database Schema Changes

**1. Create ride_offers table for priority ride offers:**
```sql
CREATE TABLE ride_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  to_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'declined', 'expired')),
  offered_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '15 minutes'),
  UNIQUE(ride_id, to_profile_id)
);

-- RLS policies
ALTER TABLE ride_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ride drivers can create offers" ON ride_offers FOR INSERT
  WITH CHECK (ride_id IN (
    SELECT id FROM rides WHERE driver_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view offers to them" ON ride_offers FOR SELECT
  USING (to_profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) OR ride_id IN (
    SELECT id FROM rides WHERE driver_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Offered users can respond" ON ride_offers FOR UPDATE
  USING (to_profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));
```

**2. Add ride status enum and constraint:**
```sql
-- Add status constraint to rides table
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_status_check;
ALTER TABLE rides ADD CONSTRAINT rides_status_check 
  CHECK (status IN ('active', 'full', 'paused', 'ended', 'canceled'));

-- Migrate existing data
UPDATE rides SET status = 'active' WHERE status = 'available';
UPDATE rides SET status = 'ended' WHERE status = 'completed';
```

**3. Enforce one active ride per DD per event:**
```sql
-- Create unique partial index for one active ride per driver per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_ride_per_driver_event 
  ON rides (driver_id, event_id) 
  WHERE status IN ('active', 'full', 'paused');
```

**4. DD disclaimer acceptance auditing table:**
```sql
CREATE TABLE dd_disclaimer_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  disclaimer_version text NOT NULL DEFAULT '1.0',
  app_version text,
  UNIQUE(profile_id, event_id)
);

ALTER TABLE dd_disclaimer_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own acceptance" ON dd_disclaimer_acceptances FOR INSERT
  WITH CHECK (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view own acceptances" ON dd_disclaimer_acceptances FOR SELECT
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));
```

---

## Part 6: DDSetupDialog Component

### Create `src/components/rides/DDSetupDialog.tsx`

This component combines disclaimer + ride setup with proper validation:

```typescript
interface DDSetupDialogProps {
  eventId: string;
  eventLocationName?: string;
  eventLocationLat?: number;
  eventLocationLng?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

// Component handles:
// 1. Disclaimer step with checkboxes
// 2. Ride setup with auto-populated event location
// 3. Priority selection from attendees (excluding self + those with rides)
// 4. Validation of seats vs priority count
// 5. LocationSearch if event location missing

const [step, setStep] = useState<'disclaimer' | 'setup'>('disclaimer');
const [acceptedTerms, setAcceptedTerms] = useState(false);
const [acknowledgedLiability, setAcknowledgedLiability] = useState(false);
const [availableSeats, setAvailableSeats] = useState(4);
const [priorityPeople, setPriorityPeople] = useState<string[]>([]);
const [notes, setNotes] = useState('');
const [pickupLocation, setPickupLocation] = useState<StructuredLocation | null>(null);
const [eventAttendees, setEventAttendees] = useState([]);
const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
const [attendeesError, setAttendeesError] = useState<string | null>(null);

// Fetch attendees excluding:
// - Current user
// - Users who already have accepted rides for this event
useEffect(() => {
  if (step === 'setup' && open) {
    setIsLoadingAttendees(true);
    fetchEligibleAttendees()
      .then(setEventAttendees)
      .catch((e) => setAttendeesError(e.message))
      .finally(() => setIsLoadingAttendees(false));
  }
}, [step, open]);

// Validate priority count vs seats
const priorityExceedsSeats = priorityPeople.length > availableSeats;

// Handle complete - idempotent operations
const handleComplete = async () => {
  // 1. Record disclaimer acceptance
  await supabase.from('dd_disclaimer_acceptances').upsert({
    profile_id: profile.id,
    event_id: eventId,
    disclaimer_version: '1.0',
    app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
  }, { onConflict: 'profile_id,event_id' });
  
  // 2. Upsert is_dd = true
  await supabase.from('event_attendees').update({ is_dd: true })
    .eq('event_id', eventId).eq('profile_id', profile.id);
  
  // 3. Upsert ride (will fail gracefully if exists due to unique index)
  const { data: existingRide } = await supabase.from('rides')
    .select('id').eq('event_id', eventId).eq('driver_id', profile.id)
    .in('status', ['active', 'full', 'paused']).maybeSingle();
    
  let rideId: string;
  if (existingRide) {
    // Update existing ride
    await supabase.from('rides').update({
      available_seats: availableSeats,
      notes,
      pickup_location: pickupLocation?.formatted_address || eventLocationName,
      pickup_lat: pickupLocation?.lat || eventLocationLat,
      pickup_lng: pickupLocation?.lng || eventLocationLng,
    }).eq('id', existingRide.id);
    rideId = existingRide.id;
  } else {
    // Create new ride
    const { data } = await supabase.from('rides').insert({
      driver_id: profile.id,
      event_id: eventId,
      available_seats: availableSeats,
      destination: 'Safe rides home',
      pickup_location: pickupLocation?.formatted_address || eventLocationName,
      pickup_lat: pickupLocation?.lat || eventLocationLat,
      pickup_lng: pickupLocation?.lng || eventLocationLng,
      status: 'active',
      notes,
    }).select('id').single();
    rideId = data.id;
  }
  
  // 4. Create priority offers (15-minute exclusive window)
  if (priorityPeople.length > 0) {
    const offers = priorityPeople.map(profileId => ({
      ride_id: rideId,
      to_profile_id: profileId,
      status: 'offered',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }));
    await supabase.from('ride_offers').upsert(offers, { onConflict: 'ride_id,to_profile_id' });
    
    // Send priority notifications
    for (const profileId of priorityPeople) {
      await supabase.from('notifications').insert({
        profile_id: profileId,
        type: 'priority_ride_offer',
        title: 'Priority Ride Offer! 🚗',
        body: `${profile.display_name} is offering you a ride first! Accept within 15 minutes.`,
        data: { ride_id: rideId, event_id: eventId, expires_at: offers[0].expires_at },
      });
    }
  }
  
  // 5. Send system message
  const chatId = await getEventChatId(eventId);
  if (chatId) {
    await sendDDVolunteeredMessage(chatId, profile.display_name);
  }
  
  onComplete();
};
```

**Priority Behavior (Exclusive Window):**
- Priority recipients get 15-minute exclusive access
- After expiry, ride becomes visible to all attendees
- A background job or client-side check expires offers

---

## Part 7: Update DDVolunteerButton

### Changes to `src/components/rides/DDVolunteerButton.tsx`:

```typescript
export function DDVolunteerButton({ eventId, eventLocationName, eventLocationLat, eventLocationLng }: DDVolunteerButtonProps) {
  const [showSetup, setShowSetup] = useState(false);
  const { profile } = useAuth();
  const { data: isDD } = useIsDD(eventId);
  const { data: existingRide } = useExistingDDRide(eventId); // NEW hook
  
  // If already DD with active ride, show "Edit Ride" instead
  if (isDD && existingRide) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          <Badge className="bg-primary/20 text-primary border-primary">
            <Car className="h-3 w-3 mr-1" />
            You're the DD
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSetup(true)}
            className="text-xs"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit Ride
          </Button>
        </div>
        <DDSetupDialog
          eventId={eventId}
          eventLocationName={eventLocationName}
          eventLocationLat={eventLocationLat}
          eventLocationLng={eventLocationLng}
          open={showSetup}
          onOpenChange={setShowSetup}
          onComplete={() => setShowSetup(false)}
          mode="edit" // NEW prop to skip disclaimer
          existingRide={existingRide}
        />
      </div>
    );
  }

  if (isDD) {
    // DD but no ride yet - show setup
    return (
      <>
        <Badge className="bg-primary/20 text-primary border-primary">
          <Car className="h-3 w-3 mr-1" />
          You're the DD
        </Badge>
        <Button variant="outline" size="sm" onClick={() => setShowSetup(true)}>
          Set Up Ride
        </Button>
        <DDSetupDialog {...props} mode="setup" />
      </>
    );
  }

  // Not DD yet - show volunteer button
  return (
    <>
      <Button onClick={() => setShowSetup(true)}>
        <Shield className="h-4 w-4 mr-2" />
        Volunteer as DD
      </Button>
      <DDSetupDialog {...props} mode="full" />
    </>
  );
}
```

---

## Part 8: State & Edge Case Handling

### Dialog State Persistence
```typescript
// In DDSetupDialog - save draft state to sessionStorage
useEffect(() => {
  if (open && step === 'setup') {
    const draft = { availableSeats, priorityPeople, notes };
    sessionStorage.setItem(`dd_setup_draft_${eventId}`, JSON.stringify(draft));
  }
}, [open, step, availableSeats, priorityPeople, notes]);

// Restore on reopen
useEffect(() => {
  if (open) {
    const draft = sessionStorage.getItem(`dd_setup_draft_${eventId}`);
    if (draft) {
      const { availableSeats: s, priorityPeople: p, notes: n } = JSON.parse(draft);
      setAvailableSeats(s);
      setPriorityPeople(p);
      setNotes(n);
    }
  }
}, [open, eventId]);

// Clear on complete
const handleComplete = async () => {
  // ... operations
  sessionStorage.removeItem(`dd_setup_draft_${eventId}`);
  onComplete();
};
```

### Network Retry Handling
```typescript
// Use React Query's built-in retry for mutations
const createRideMutation = useMutation({
  mutationFn: createOrUpdateDDRide,
  retry: 1,
  retryDelay: 1000,
  onError: (error) => {
    if (error.message.includes('unique constraint')) {
      // Already exists - refetch and show edit mode
      queryClient.invalidateQueries(['dd-ride', eventId]);
    }
  },
});
```

---

## Summary of All Files

### New Files:
| File | Purpose |
|------|---------|
| `src/types/location.ts` | Structured location type definition |
| `src/components/rides/DDSetupDialog.tsx` | Combined DD disclaimer + ride setup |
| `supabase/migrations/XXXX_ride_offers.sql` | ride_offers table, constraints, disclaimer audit |

### Modified Files:
| File | Changes |
|------|---------|
| `src/components/location/LocationSearch.tsx` | Add place_id to callback |
| `src/components/events/EndRallyDialog.tsx` | LocationSearch with structured state, validation |
| `src/components/home/RallyHomeButton.tsx` | LocationSearch, state reset, no geocoding fallback, persist destination |
| `src/components/layout/BottomNav.tsx` | Remove Rides tab |
| `src/pages/Rides.tsx` | Replace with redirect to /events |
| `src/hooks/useTutorial.tsx` | Update rides tutorial step |
| `src/components/events/FirstTimeWelcomeDialog.tsx` | Update ride coordination text |
| `public/sw.js` | Change default notification URL to /events |
| `src/components/rides/RequestRideDialog.tsx` | Update notification URL |
| `src/components/rides/DDVolunteerButton.tsx` | Use DDSetupDialog, handle edit mode |
| `src/hooks/useDDManagement.tsx` | Add disclaimer recording, priority offer logic |
| `src/pages/EventDetail.tsx` | Pass event location props to DD components |

### Database Migrations:
1. Profile columns for last destination and home coords
2. ride_offers table with RLS
3. Unique index for one active ride per driver per event
4. dd_disclaimer_acceptances audit table
5. rides status constraint update

---

## Testing Checklist

**LocationSearch & Validation:**
- [ ] EndRallyDialog requires dropdown selection, blocks typed-only input
- [ ] RallyHomeButton resets state on close and mode switch
- [ ] Error message shows if user types but doesn't select
- [ ] No geocoding fallback - missing coords = error

**Rides Tab Removal:**
- [ ] Bottom nav shows 5 tabs (no Rides)
- [ ] /rides redirects to /events with toast message
- [ ] /rides?event=X redirects to /events/X
- [ ] Tutorial updated to not reference removed tab
- [ ] Service worker default URL updated
- [ ] Notification deep links go to event detail

**DD Workflow:**
- [ ] DDSetupDialog shows disclaimer first, then setup
- [ ] Disclaimer acceptance recorded with timestamp and version
- [ ] Priority selection excludes self and users with rides
- [ ] Seat count validation against priority count
- [ ] One active ride per DD per event enforced
- [ ] Double-tap/retry doesn't create duplicate rides
- [ ] Already-DD users see "Edit Ride" not "Volunteer"
- [ ] Draft state persists if dialog closed mid-flow

**Priority Offers:**
- [ ] Priority recipients get exclusive 15-minute window
- [ ] Offers stored in ride_offers table
- [ ] Notifications reference ride_offers
- [ ] After expiry, ride visible to all

