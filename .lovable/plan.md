# Mobile Video Thumbnails — Final Fix

Implemented:
- Removed the broken `_thumb.jpg` derived URL fallback (those files never existed in storage, so the UI was painting blank tiles).
- Replaced the blank video tile with a clear branded placeholder (FileVideo icon over muted gradient) so mobile never shows pale white squares.
- Dropped the "owner-only" restriction in the opportunistic thumbnail backfill so any event member can generate and patch missing thumbnails for legacy videos.
- Added a SECURITY DEFINER RPC `set_rally_media_thumbnail(media_id, thumb_url)` that lets event members set thumbnails for shared videos but never overwrites existing ones.
- Throttled background backfill to 3 videos per render pass to avoid network thrash on big galleries.
- Realtime subscription will now live-update tiles as thumbnails come in.
