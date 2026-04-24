# Add Mia Abbott as JT Referral + Join "We Did IT!" Event

## Context

- **Mia Abbott** profile: `82d4faee-6f83-441e-877a-42926a50a462`
  - Currently `referred_by` = Mason Martin (`58580bc7-27da-400d-a1e1-ac7b5c72f3c7`)
- **JT** profile: `536e4694-245b-48d8-9930-018d72f266e0`
- **"We Did IT!" event**: `a0a8208c-6ee1-4f08-8d7c-369640bca378` (created by JT, starts 2026-04-25)
- Mia is **not** currently an attendee
- No existing friendship row between JT and Mia

## Changes

### 1. Update Mia's referral
Update `profiles` row for Mia:
- `referred_by` = JT's profile id (`536e4694-245b-48d8-9930-018d72f266e0`)

This overrides the previous Mason Martin referral per the user's request.

### 2. Add Mia to the event
Insert into `event_attendees`:
- `event_id` = `a0a8208c-6ee1-4f08-8d7c-369640bca378`
- `profile_id` = Mia's id
- `status` = `attending`

### 3. Auto-friendship (per existing referral rule)
Per the `auto-friendship-referrals` memory, referred users become friends with their referrer. Insert a `friendships` row:
- `requester_id` = JT, `recipient_id` = Mia, `status` = `accepted`, `responded_at` = now()

## Out of scope
- No notifications fired (silent admin action).
- No code changes — data only.
