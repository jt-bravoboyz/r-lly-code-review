

# Increase Video Upload Limit to 500 MB

## What's Changing
The video upload size limit will be raised from 50 MB to 500 MB in both places where it's enforced:
- The **Create Rally** media picker (where you stage files before creation)
- The **Rally Details** media uploader (where you add media to an existing rally)

## What You'll Notice
- When uploading a video, the limit message will say "max 500MB" instead of "max 50MB"
- Larger videos will be accepted -- keep in mind that bigger files will take longer to upload depending on your connection

## Technical Details

Two files need a one-line constant change each:

1. **src/components/events/StagedMediaPicker.tsx** -- change `MAX_VIDEO_SIZE` from `50 * 1024 * 1024` to `500 * 1024 * 1024` and update the error message
2. **src/components/events/RallyMediaUpload.tsx** -- same change

No database, storage, or backend changes are needed. The storage bucket already accepts files of any size.

