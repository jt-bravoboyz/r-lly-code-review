## Fix: Long names overflow PYMK card

**Root cause:** Card is `w-[170px]` but the inner `ProfileTapWrapper` is a flex column without `w-full`, so it shrink-wraps to the longest child (the name). The `truncate w-full` on the name `<p>` becomes 100% of that shrink-wrapped width — effectively the name's own width — so it never truncates.

**Change (one file, one line):** `src/components/contacts/PeopleYouMayKnowCarousel.tsx` line 86 — add `w-full min-w-0` to `ProfileTapWrapper`'s className so the name `<p className="truncate w-full">` truncates against the 170px card width.

No other changes. Filter logic, friend request flow, styling, and other sections untouched.