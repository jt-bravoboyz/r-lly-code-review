
# Plan: Add Rank Quotations to Badges & Ranks System

## Overview

Add a unique quotation under each rank in the "All Tiers" section of the Badges & Ranks tab. Quotes are only visible once unlocked; locked ranks show "Unlock to reveal" placeholder text.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/badges.ts` | Replace existing messages in `getMotivationalMessage` with new quotes |
| `src/components/badges/TierLadder.tsx` | Add quote display below tier name/points |

---

## Implementation Details

### 1. Update `src/lib/badges.ts`

Replace the content of `getMotivationalMessage` with the exact quotes provided:

```typescript
export const getTierQuote = (tierKey: string): string => {
  const quotes: Record<string, string> = {
    bronze: '"B stands for bitch cup. Hold up, drink this."',
    silver: '"Private, you\'ve moved up in rank! You\'re officially moving out of the dorm basement and into sophomore year of the R@lly army. Thank you for your service."',
    gold: '"Look at you, a professional pussy footer! We\'re definitely seeing your potential but there is more work to be done if you want to be a champion."',
    emerald: '"If ya look good, ya feel good. If ya feel good, you play good. And if you play good, they pay good."\n— Deion Sanders',
    sapphire: '"Wow... you\'ve done a lot of drinking. We\'re not sure if that\'s an achievement or a cry for help, but either way—we\'re celebrating you tonight."',
    ruby: '"Damn you might actually be a penis stomper! Keep showing out in practice and maybe you\'ll see the field."',
    amethyst: '"You honestly could have gone D1 for drinking. Too bad it\'s just another reason for your parents to disapprove of your life choices."',
    diamond: '"In the words of Lyndon B. Johnson, \'You fuck.\'"',
    pink_diamond: '"You don\'t follow the crowd—you lead it, shot for shot. And hopefully, one day, that same leadership shows up in a part of your life that doesn\'t make you a total degenerate."',
    galaxy_opal: '"You\'re a certified party general now. The troops salute you and your dedication to your craft."',
    dark_matter: '"You don\'t pre-game, you pre-career. You\'re the AA leader. Uber drivers put YOU on their vision boards. Your liver has its own gym membership. You\'ve gone beyond the frat house, beyond the campus, beyond the galaxy. Dark Matter unlocked. Job well done."',
  };
  return quotes[tierKey] || '';
};
```

### 2. Update `src/components/badges/TierLadder.tsx`

Add quote display in the tier info section:

**Location**: After the points display (`<div className="text-xs text-muted-foreground">...pts</div>`)

**Logic**:
- If `isUnlocked`: Show the quote with italic styling and muted color
- If `!isUnlocked`: Show "Unlock to reveal" placeholder

```tsx
{/* Quote - only revealed when unlocked */}
{isUnlocked ? (
  <p className="text-xs italic text-muted-foreground/80 mt-1 leading-relaxed">
    {getTierQuote(tier.tier_key)}
  </p>
) : (
  <p className="text-xs italic text-muted-foreground/50 mt-1">
    Unlock to reveal
  </p>
)}
```

---

## Styling Details

| Element | Styling |
|---------|---------|
| Quote text | `text-xs italic text-muted-foreground/80` |
| Locked placeholder | `text-xs italic text-muted-foreground/50` |
| Quote container | `mt-1 leading-relaxed` for spacing |

---

## Conditional Logic

The existing `isUnlocked` variable in `TierLadder.tsx` (line 19) handles the unlock check:

```typescript
const isUnlocked = index <= currentTierIndex;
```

- If user is at Bronze (index 0), only Bronze quote shows
- If user is at Gold (index 2), Bronze, Silver, and Gold quotes show
- All higher tiers show "Unlock to reveal"

---

## No Changes Required

- No database schema changes
- No changes to unlock logic or point thresholds
- No changes to the tier progression system
- No new components needed

---

## Deliverables

1. **`src/lib/badges.ts`** - Add `getTierQuote` function with all 11 quotes
2. **`src/components/badges/TierLadder.tsx`** - Import and render quotes conditionally
