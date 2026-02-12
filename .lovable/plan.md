

# Add Upload Progress Indicator for Rally Media

## What's Changing
When uploading photos or video during Rally creation (or on the Rally Details media section), instead of a static "Uploading Media..." spinner, you'll see:
- A progress bar showing upload percentage for each file
- Text like "Uploading photo 2 of 5..." or "Uploading video..."
- "Finalizing..." text when saving metadata after upload completes
- On failure: error message with a Retry option; already-uploaded files stay intact

## What You'll See
- During Create Rally: the submit button area shows a progress bar + status text
- During Rally Details media upload: a progress bar appears above the upload buttons
- Progress updates smoothly as bytes transfer
- Disappears immediately on completion

## Technical Details

### 1. `src/hooks/useRallyMedia.tsx`
- Add an optional `onUploadProgress` callback parameter to `useUploadRallyMedia`
- Pass it to `supabase.storage.from('rally-media').upload(filePath, file, { upsert: false, onUploadProgress })`
- This gives us real byte-level progress from the storage SDK

### 2. `src/components/events/CreateEventDialog.tsx`
- Add state: `uploadStatus` (string like "Uploading photo 1 of 3...") and `uploadPercent` (0-100)
- In the upload loop, set status text before each file and pass `onUploadProgress` to track percentage
- Replace the static "Uploading Media..." button text with the dynamic status + a `<Progress>` bar component (already exists in the project)
- On failure: track failed files in state and show a retry button that re-attempts only the failed uploads

### 3. `src/components/events/RallyMediaUpload.tsx`
- Add the same `uploadStatus` + `uploadPercent` state
- Show a `<Progress>` bar and status text above the upload buttons while uploading
- Pass `onUploadProgress` callback when calling `uploadMedia.mutateAsync`
- On failure: show error with retry option

### Files Changed (3 files)
1. `src/hooks/useRallyMedia.tsx` -- accept + pass `onUploadProgress` callback
2. `src/components/events/CreateEventDialog.tsx` -- progress state + UI
3. `src/components/events/RallyMediaUpload.tsx` -- progress state + UI

No database or backend changes needed.

