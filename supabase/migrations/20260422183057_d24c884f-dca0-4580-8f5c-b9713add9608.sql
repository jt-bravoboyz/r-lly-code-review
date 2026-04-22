-- Delete JT Butler test account (profile id: 7f2cae33-0699-4ad4-86f3-39a09b10764b, auth user: 3b1a8046-6548-47fc-a611-bfac244ef715)
-- Deleting from auth.users will cascade through all FKs that reference it,
-- and the profile row cascades from there to all profile-linked data.
DELETE FROM auth.users WHERE id = '3b1a8046-6548-47fc-a611-bfac244ef715';