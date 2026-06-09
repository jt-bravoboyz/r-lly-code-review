## Why receipt scanning fails

The console shows the upload to the `receipts` storage bucket is rejected with `403 — new row violates row-level security policy`. Because the upload fails, the signed URL is never created and `parse-receipt` never runs — that's why every snapped receipt comes back with "Could not read receipt".

The existing `receipts` bucket has three policies (`receipts host upload/read/delete`) that all require the **first folder segment of the path to be an `event_id` the user hosts**. That works for the event flow (`ReceiptUploader` uploads to `${eventId}/${draftId}/...`), but the new **standalone tab** flow in `StartTabDialog` uploads to:

```
{profile.id}/tabs/{uuid}.{ext}
```

That path's first segment is a user id, not an event id, so RLS blocks it. No standalone tab can ever attach a receipt photo.

## Fix

Add storage RLS policies on the `receipts` bucket that allow an authenticated user to upload / read / delete objects whose **first path segment is their own `auth.uid()` and second segment is `tabs`** — i.e. exactly the path shape `StartTabDialog` writes. This leaves the existing event-host policies untouched, so the event receipt flow continues to work.

### SQL (single migration)

```sql
create policy "receipts owner tabs upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'tabs'
);

create policy "receipts owner tabs read"
on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'tabs'
);

create policy "receipts owner tabs delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'tabs'
);
```

No client code changes needed — the existing `StartTabDialog` path already matches this shape, and `parse-receipt` consumes a signed URL so it does not need a separate read policy.

## Verification

After the migration:
1. Open R@lly Wallet → New Tab → Snap a receipt.
2. Expect: upload succeeds, "Reading your receipt…" resolves, line items populate the review step.
3. Existing event-attached receipt uploads (`ReceiptUploader`) continue to work unchanged.