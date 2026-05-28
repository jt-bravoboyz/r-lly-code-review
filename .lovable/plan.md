Update the recap media rendering so vertical photos are no longer cropped out of the square boxes, while preserving the clean, even Facebook-style grid.

Plan:
1. Modify `RecapMediaTile.tsx` square mode:
   - Keep the outer tile as `aspect-square` so every grid cell stays the same size.
   - Change image rendering from `object-cover` to `object-contain` for square recap tiles.
   - Add a subtle themed background behind contained photos so portrait images show fully without looking broken or leaving harsh blank space.
   - Keep videos/thumbnail behavior intact.

2. Update `RecapTour.tsx` gallery step:
   - Keep `grid grid-cols-3 gap-2` exactly as the Facebook-style uniform grid.
   - Remove the face-aware crop override because the goal is now full-image visibility, not cropped framing.

3. Update spotlight media in `RecapTour.tsx`:
   - Change hero video and best-photo spotlight from cropped `object-cover` to full-frame `object-contain` inside the existing `aspect-[3/4]` frame.
   - Keep rounded corners, rings, overlays, badges, and animation unchanged.

4. Check the recap route after changes to confirm vertical images are fully visible and the grid remains even.