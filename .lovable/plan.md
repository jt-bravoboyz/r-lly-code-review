

# Increase Profile Picture Size Limit to 50 MB

## What Changes
Update the profile picture upload limit from 10 MB to 50 MB so you can upload higher-resolution photos.

## Files to Update

**src/pages/Profile.tsx** -- Change the file size check from `10 * 1024 * 1024` to `50 * 1024 * 1024` and update the error message to say "50MB" instead of "10MB".

## What Won't Change
- Rally media photo limits (event photos) stay at 10 MB
- Video upload limits stay at 500 MB
- No layout, styling, or functionality changes
- The cropping dialog and upload flow remain the same

