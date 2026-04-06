

# Admin Referral Audit: Historical Backfill + Squad Column

## 1. Database Migration — Backfill `referred_by` for Historical Users

Execute the user's SQL to link referral chains:
- Test → JT, Nick, Sko
- Nick → Mini Dallison
- Sko → Fake Eric, Jazmin
- Caroline → Ansley, Gray
- JT → Caroline, Aidan, Bobby Brown

Uses `AND referred_by IS NULL` guard to avoid overwriting existing data.

## 2. `src/hooks/useAdminData.tsx` — Fetch Squads for "Current Squad" Column

Add two new queries after the existing profiles fetch:
- `supabase.from('squads').select('id, name, owner_id')`
- `supabase.from('squad_members').select('squad_id, profile_id')`

Build a `profileSquadMap: Map<string, string>` combining ownership and membership. Update `referralDetails` to include `currentSquad`:

```ts
const referralDetails = (profiles || [])
  .filter(p => p.referred_by)
  .map(p => ({
    refereeId: p.id,
    refereeName: p.display_name,
    refereeCreatedAt: p.created_at,
    referrerId: p.referred_by!,
    referrerName: profiles?.find(r => r.id === p.referred_by)?.display_name || 'Unknown',
    currentSquad: profileSquadMap.get(p.id) || null,
  }));
```

## 3. `src/components/admin/ReferralAudit.tsx` — Add "Current Squad" Column

- Add `currentSquad: string | null` to the `ReferralDetail` interface
- Add a "Current Squad" table column between "Signup Date" and "Action"
- Display squad name or "—"

## Files Modified
- `src/hooks/useAdminData.tsx` — add squad queries + map
- `src/components/admin/ReferralAudit.tsx` — add squad column
- Database migration for historical `referred_by` backfill

No changes to CSS, squad_media, PolicyAcceptanceDialog, or auth logic.

