

# Fix Swipe-to-Dismiss Persistence

## Root Cause
The `notifications` table has RLS policies for SELECT, INSERT, and UPDATE — but **no DELETE policy**. The `supabase.from('notifications').delete()` call silently returns no error but deletes nothing. The optimistic cache removal works instantly, but on tab switch the query refetches from the database where the record still exists.

## Fix

### Database Migration
Add a DELETE RLS policy so users can delete their own notifications:

```sql
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
```

### Code Change — `src/hooks/useNotifications.tsx`
Add `onSettled` to the `useDeleteNotification` mutation to invalidate the query cache after the mutation completes (success or failure). This ensures the cache stays in sync even if something goes wrong:

```typescript
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
},
```

## Files

| File | Change |
|------|--------|
| New migration | Add DELETE RLS policy for notifications |
| `src/hooks/useNotifications.tsx` | Add `onSettled` invalidation to delete mutation |

2 changes. The RLS policy is the critical fix; the `onSettled` is a safety net.

