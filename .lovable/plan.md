

# Plan: Add Founder 25 Diamond to Rally & Alerts Tab Avatars

## Changes

### 1. `src/pages/Events.tsx`
- Import `MiniFounderGem`
- After the `</Avatar>` tag (line 93), inside the `<Link>` wrapper (line 86), add:
```tsx
{profile?.id && (
  <MiniFounderGem profileId={profile.id} className="absolute -bottom-0.5 -right-0.5 z-10 animate-mini-founder-glow" />
)}
```

### 2. `src/pages/Notifications.tsx`
- Import `MiniFounderGem`
- After the `</Avatar>` tag (line 122), inside the `<Link>` wrapper (line 115), add the same gem overlay.

No other changes needed. Same pattern already used in Header.tsx and Index.tsx.

