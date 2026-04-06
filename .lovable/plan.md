

# Referral Stabilization, Redirect Fix, and Admin Audit

## 1. Data Repair (One-Time)
Use the database insert tool to:
- Add Mini Dallison to Kincade's Krew via `INSERT INTO squad_members`
- Award Nick points via `rly_award_points` RPC (event_type: `referral_signup`)

## 2. Harden Referral Tracking

### `src/pages/Auth.tsx` (lines 47-56)
Expand the referral param capture to also check `?referrer=` and `?invite=` aliases:
```ts
const r = params.get('r') || params.get('referrer') || params.get('invite');
```

### `src/hooks/useAuth.tsx` (lines 121-134)
Replace the `setTimeout` with a retry loop:
- 3 attempts, 2 seconds apart
- Each attempt checks if profile exists, then updates `referred_by`
- On success, call `rly_award_points` RPC for the referrer with `p_event_type: 'referral_signup'` and `p_source_id: signUpData.user.id`

## 3. Fix Squad Join Redirect

### `src/pages/JoinSquad.tsx` (line 134)
Change `navigate('/squads')` to:
```ts
navigate(invite?.squad_id ? `/squads/${invite.squad_id}` : '/squads');
```

## 4. Admin Referral Audit

### New file: `src/components/admin/ReferralAudit.tsx`
- Card with a table showing all referred users
- Columns: Referrer Name, Referee Name, Signup Date, Points Status
- "Manual Award" button per row calling `rly_award_points` RPC
- Data passed via props from the admin data hook

### `src/hooks/useAdminData.tsx`
Add a `referralDetails` array to the returned data, derived from existing `profiles` query:
```ts
const referralDetails = (profiles || [])
  .filter(p => p.referred_by)
  .map(p => ({
    refereeId: p.id,
    refereeName: p.display_name,
    refereeCreatedAt: p.created_at,
    referrerId: p.referred_by,
    referrerName: profiles?.find(r => r.id === p.referred_by)?.display_name || 'Unknown',
  }));
```

### `src/pages/AdminDashboard.tsx`
Import and render `ReferralAudit` in the Partner tab, after `TopConnectors`.

## Files Touched
- `src/hooks/useAuth.tsx` — retry loop for `referred_by` + auto-award points
- `src/pages/Auth.tsx` — add `?referrer=` and `?invite=` aliases
- `src/pages/JoinSquad.tsx` — redirect to specific squad
- `src/hooks/useAdminData.tsx` — add `referralDetails` to return
- `src/pages/AdminDashboard.tsx` — render ReferralAudit
- `src/components/admin/ReferralAudit.tsx` — new component

## Scope Guard
No changes to CSS, `squad_media`, `PolicyAcceptanceDialog`, or any other files.

