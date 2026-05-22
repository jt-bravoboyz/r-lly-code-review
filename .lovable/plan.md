## Export Users for TestFlight

I'll pull every user from the backend and generate a downloadable CSV you can paste straight into App Store Connect → TestFlight → External Testers.

### What gets exported

For each user with a real email address:
- **First Name** (parsed from full name)
- **Last Name** (parsed from full name)
- **Email** (TestFlight's only required column)

TestFlight's CSV import expects exactly these three columns in this order, so the file will drop in with zero edits.

### Filters applied

- Excludes users with no email (shouldn't be any, but safe)
- Excludes Apple Private Relay addresses (`@privaterelay.appleid.com`) — TestFlight invites bounce off these. I'll output them in a second sheet/file so you can decide case-by-case.
- Keeps internal/test accounts (`@bravoboyz.com`, `appreview@rlly.cloud`) but flags them in a separate file so you can choose whether to invite them.

### Deliverables

Three CSV files in `/mnt/documents/`:
1. `testflight-external-testers.csv` — clean list, ready to upload
2. `testflight-private-relay.csv` — Apple relay emails (will likely bounce)
3. `testflight-internal.csv` — your team / test accounts

### Current count

Database has ~75+ users. Final tester count will be visible after the export runs.

Approve and I'll generate the files.
