

# Plan: Create a Visual Demo of the Full R@lly Recap

## Problem
The Recap only renders on `completed` events, and none of your completed events have rogue alerts, reactions, or multiple attendees. So you've only ever seen the bare-bones version (just the Safe & Sound badge).

## Solution
Seed one of your completed events with sample data so all 5 sections of the Recap are visible, then you can navigate to it and see the full cinematic experience.

### Step 1: Seed Demo Data into "WHIMSY KNIGHT OUT" (already completed, has 7 photos)
Insert into the database:
- **3 rogue alerts** with fake "Final Words" quotes (linked to existing or test profiles)
- **5-8 rogue reactions** (🤮, 😍, 🍆 emojis) on those alerts
- **A DD entry** in `event_attendees` with `is_dd=true` and a linked ride with accepted passengers (so "The Guardian" award appears)

This gives us data for:
- ✅ Hero Header — "Shot of the Night" (already has photos)
- ✅ Stats Bar — photo count, rogue count, reaction count
- ✅ Rogue Timeline — 3 entries with final words + emoji reactions
- ✅ Photo Bundle — masonry grid (7 photos, "View All" button)
- ✅ Squad Stars — The Guardian, The Ghost, The Paparazzi awards
- ✅ Safe & Sound Finale — always renders

### Step 2: Navigate to the Event
Open `/events/f3f1ec57-531f-4cbc-a9f7-01b1d7d9725b` (WHIMSY KNIGHT OUT) in the preview to see the full Recap.

### What Is NOT Touched
| Item | Status |
|---|---|
| All app code | Unchanged — no component edits |
| Existing event data | Unchanged — only adding rows |
| RLS / Security | Unchanged |

This is a data-only operation — inserting test rows so the existing Recap UI has something to render.

