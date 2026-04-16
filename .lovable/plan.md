

# Plan: Fix Security Scan Errors and Warnings

## Overview

A single database migration to address all 7 security findings: 2 errors (Realtime authorization, chat-images access) and 5 warnings (phone privacy, admin escalation, bucket listing, profile access logs, analytics realtime).

---

## Migration Details

### 1. Chat-Images Storage — Membership Check (ERROR)

Replace the current permissive policies with ones that verify chat membership via the file path. Chat images are stored as `{chatId_or_eventId}/{filename}`.

- **INSERT**: Check `is_chat_member` or `is_event_member` using the first folder segment
- **SELECT**: Same membership check (private bucket, signed URLs used, but policy still needed)

Since chat images use either event IDs or generic paths as folders, create a helper function `is_chat_image_authorized` that checks if the folder maps to an event the user is a member of, or a chat they participate in.

### 2. Rally-Media SELECT — Membership Check (ERROR, partial)

Drop the open "Anyone can view rally media" SELECT policy. Replace with one requiring `is_event_member` on the first folder segment, matching the existing INSERT policy pattern.

### 3. Realtime Authorization (ERROR)

Enable RLS on `realtime.messages` and add a permissive SELECT policy scoped to authenticated users. This is the standard Supabase approach — the actual data filtering happens via table-level RLS on the published tables. The realtime.messages RLS prevents unauthenticated channel subscriptions.

> Note: We cannot add topic-level authorization policies on `realtime.messages` since it is in the `realtime` reserved schema. Instead, we will **remove tables from realtime publication** that don't need it (analytics_events, system_feedback) and rely on table-level RLS for the rest.

### 4. Analytics/Feedback Realtime Exposure (WARNING)

Remove `analytics_events` and `system_feedback` from the realtime publication since they don't need real-time streaming.

### 5. Phone Invites Privacy (WARNING)

Replace the current SELECT policy to restrict `phone_number` visibility. Since RLS can't mask individual columns, change the policy to only allow the **original inviter** or **admins** to SELECT. Remove the `is_event_host_or_cohost` branch that gives cohosts access to phone numbers.

### 6. Profile Access Logs — Accessed User Visibility (WARNING)

Add a second SELECT policy so users can view logs where they are the **accessed** profile (i.e., see who viewed them).

### 7. Admin Role Escalation Protection (WARNING)

Replace the current INSERT policy on `user_roles` to prevent admins from granting the `admin` role to others via RLS. Only `moderator` and `user` roles can be granted by admins. The `admin` role can only be assigned via service role / migrations.

### 8. Bucket Listing Prevention (WARNING)

Set `avoids_listing = true` on public buckets (`rally-media`, `squad-images`, `avatars`, `event-images`, `email-assets`) to prevent directory enumeration while still allowing direct file access.

---

## Technical Details

### Files changed
- **1 new migration file** in `supabase/migrations/`

### No application code changes needed
All fixes are RLS/storage policy changes at the database level.

### Key SQL operations

```text
1. DROP + CREATE chat-images SELECT/INSERT policies with membership check
2. DROP + CREATE rally-media SELECT policy with is_event_member check  
3. ALTER PUBLICATION supabase_realtime DROP TABLE analytics_events, system_feedback
4. DROP + CREATE phone_invites SELECT (inviter-only + admin)
5. ADD SELECT policy on profile_access_logs for accessed users
6. DROP + CREATE user_roles INSERT policy blocking admin-role grants
7. UPDATE storage.buckets SET avoids_listing = true for public buckets
```

