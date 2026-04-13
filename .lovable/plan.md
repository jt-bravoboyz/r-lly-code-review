

# Plan: Add Founder 25 Diamond to Nav Bar Avatar

## Changes

### 1. `src/components/layout/Header.tsx`
- Import `MiniFounderGem` and `useAuth` (already imported)
- After the `<Avatar>` closing tag (line 54), inside the `<Link>` wrapper, add the founder gem positioned absolutely at bottom-right of the avatar:

```tsx
{profile?.id && (
  <MiniFounderGem profileId={profile.id} className="absolute -bottom-0.5 -right-0.5 z-10" />
)}
```

- Update `MiniFounderGem` to accept an optional `className` prop for positioning overrides.

### 2. `src/pages/Index.tsx`
- Import `MiniFounderGem`
- After the `<Avatar>` closing tag (line 121), inside the `<Link>` wrapper, add the same positioned gem using `profile.id`

### 3. `src/components/badges/MiniFounderGem.tsx`
- Add optional `className` prop that merges with the default `inline-flex items-center ml-1` classes
- When `className` is provided, use it instead of the default `ml-1` spacing (so it works both inline next to names and absolutely positioned on avatars)

No changes to avatar size, nav layout, or existing elements.

