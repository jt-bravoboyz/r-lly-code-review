# R@lly App Audit — Read-Only Report

Date: August 22, 2026  
Project: R@lly Code Review (`30a08aa7-cdeb-4250-a60c-0605f836113c`)  
Status: Audit only. No app, database, or Lovable changes were made.

## Bottom line

The app's main build is healthy enough to run, but it is not ready for paid cover-charge events or for users to depend on R@lly Home as a safety workflow.

- **Cover charges should remain a R@lly feature.** The screens and join gate are serving the right business purpose. The broken part is the payment engine underneath them: it is tied to Fluid Pay and can record simulated payments as successful.
- **R@lly Home has several real workflow failures.** The largest are a prompt that can close itself, a rejected DD-departure notification, conflicting safety choices, two independent sources of R@lly Home truth, and unsafe handling of destination/location information.
- **There are also three previously confirmed urgent security exposures:** public event/invite data, public access to email-queue actions, and payment simulation paths.

## Product priority and intended R@lly Home design

R@lly Home, DD/rider coordination, destination tracking, and the Host Safety Dashboard are the first product priority. This is the safety system that differentiates R@lly from ordinary event-planning apps.

R@lly Home intentionally has two valid ways to start:

1. **Event R@lly Home:** connected to an active R@lly, with safety status shared to the event host and the audience the traveler selected.
2. **Private R@lly Home:** usable when no event is active, or shared only with selected friends/squad members instead of an entire event.

The problem is therefore **not** that R@lly Home appears in two places. Both entry points must remain. The problem is that they currently use two independent safety records and two sets of rules. They need one underlying journey engine with different optional contexts and audiences.

## What was checked

- Current Lovable project and preview, without sending a Lovable prompt or using build credits
- Local source matching the current audited project
- Authentication and signed-out routes
- Event creation and joining
- Cover charges and related payment paths
- R@lly Home prompts, destinations, driver/rider matching, departure, drop-off, arrival, notifications, and host status
- Database access rules and location privacy design
- Automated tests, type checking, production build, lint debt, and dependency warnings

The current automated baseline remains: TypeScript passes, 112 tests pass, and the production build completes. Those checks do **not** prove the user workflows work; there are almost no real integration tests for R@lly Home or paid joining.

## Severity key

- **P0 — Stop and contain:** security, privacy, or false-payment risk
- **P1 — Fix next:** a central feature is broken or gives users the wrong result
- **P2 — Fix soon:** confusing, inconsistent, or fragile behavior
- **P3 — Technical debt:** raises future cost and bug risk

## Feature-by-feature findings

### 1. Host cover charge and paid joining

**Expected:** A host can enter a cover charge. A guest pays the exact server-approved amount. Only a verified successful payment unlocks joining. The host can later see and receive the money through the selected payment provider.

**Current result: not safe or production-ready.**

| Severity | Issue | What users experience | What it means |
|---|---|---|---|
| P0 | Fluid Pay is the only implemented card-payment engine | Paid joining depends on a provider R@lly should not use | Fluid Pay cannot simply be deleted while keeping the current paid flow; the engine must be replaced behind the existing cover-charge screens |
| P0 | Simulated tokens can be recorded as paid | A join can appear paid even though no real payment occurred | A guest could potentially enter without money being collected |
| P0 | The browser supplies the amount to the payment function | A hostile or modified client can try to submit a different amount | The server must obtain the price from the event record and ignore the browser's amount |
| P1 | Host payout/onboarding is tied to Fluid Pay merchant records | A host may set a charge without a valid, supported payout route | The app needs a clear “payments ready” state before a host can publish a paid event |
| P2 | Fluid Pay names, components, fields, functions, and saved-card data are spread across the app | Removing it in only one screen will leave hidden dependencies | Removal must be repository-wide and followed by a database cleanup/migration |

**Decision:** keep `cover_charge`, the host entry screen, the event price display, and the pay-before-join rule. Replace the provider-specific implementation with one server-owned payment contract. Until a replacement provider is chosen and verified, production should not allow a host to publish a paid event; it should never pretend payment succeeded.

### 2. R@lly Home prompt and enrollment

**Expected:** At the correct time, every attendee sees one stable choice: drive, ride with a DD, arrange their own trip while participating, or decline tracking.

| Severity | Issue | What users experience | Cause/effect |
|---|---|---|---|
| P1 | The automatic prompt can open and immediately remove itself | The prompt may flash, fail to open, or disappear before a choice can be made | The child opens its dialog and then tells the parent to unmount the entire child in the same effect |
| P1 | “I'm good” has different meanings in different screens | A user may think they chose self-transport, while another part of the app treats them as not participating | Different handlers update different combinations of flags |
| P1 | Old DD, rider, destination, and opt-in flags are not consistently cleared | Host and attendee screens can show conflicting statuses for the same person | State changes are partial instead of one complete transition |
| P2 | Several overlapping prompts use both database flags and per-tab browser memory | Prompts can repeat, be skipped, or fight each other after reloads and event changes | Too many separate gates control the same decision |

### 3. Destination and location tracking

**Expected:** A user understands what is shared, with whom, and for how long. Automatic arrival works when permission and a valid destination are present; manual arrival always works.

| Severity | Issue | What users experience | Cause/effect |
|---|---|---|---|
| P0 | Event attendees can query the underlying attendee rows containing location/destination columns | A destination or coordinates may be visible beyond the person's selected audience | Row-level security protects rows, not individual columns; the app often queries the raw table instead of the masked view/function |
| P1 | A destination can save even when address geocoding produced no coordinates | The app says the destination was saved, but automatic arrival never starts | Auto-arrival requires latitude/longitude and silently skips tracking when they are missing |
| P1 | Automatic arrival only runs while the event page and location watcher are active | Users may reasonably expect background arrival confirmation that the web app cannot reliably provide | The current hook is page-lifecycle tracking, not a dependable background safety service |
| P2 | Notification failure does not change the success message | The app can say “your squad has been notified” even when notification delivery failed | Notification calls often do not inspect or surface the returned function error |

### 4. DD and rider workflow

**Expected:** A confirmed rider sees their driver, receives a departure alert, and the driver can confirm every assigned passenger's drop-off.

| Severity | Issue | What users experience | Cause/effect |
|---|---|---|---|
| P1 | DD departure uses the unsupported message type `dd_departure` | Confirmed riders do not receive “Your DD is heading out” | The server rejects the type because it is absent from its allowed list |
| P1 | The rider plan screen only looks for status `accepted` | A rider with status `confirmed` can see “waiting for a DD” even though a driver is assigned | Other ride screens correctly treat `accepted` and `confirmed` as equivalent |
| P1 | A driver can only confirm drop-off after the passenger has set “going home” | A real assigned passenger can disappear from the driver's drop-off list | Drop-off is incorrectly gated on a separate passenger button press |
| P2 | DD-confirmed drop-off and attendee-confirmed arrival use different fields | Some dashboards say safe while analytics or other screens do not | There is no single canonical “safe arrival” result |

### 5. Host safety dashboard and completion

**Expected:** The host sees one current status for every attendee and the event completes only when everyone has a valid final state.

| Severity | Issue | What users experience | Cause/effect |
|---|---|---|---|
| P1 | Event R@lly Home and private/squad R@lly Home store separate safety records | The same person can be “safe” in one screen and “still traveling” in another | The two intentional entry points do not share one journey engine or one set of transition rules |
| P1 | Completion rules differ from displayed status rules | The dashboard can consider a person decided/complete while another view shows them undecided | Each component reinterprets raw flags instead of using one shared state machine |
| P2 | Event-wide safety data does not consistently own a realtime subscription | Some host views may stay stale until another action forces a refresh | Realtime invalidation is coupled to whichever components happen to be mounted |

### 6. Notifications

**Expected:** Important safety alerts are accepted by the server, sent only to the intended people, and visibly retried or reported when they fail.

**Current result:** ordinary `going_home` and `arrived_safe` types exist, but error handling is mostly silent. The DD-departure type is definitely rejected. Success messages should not promise delivery until the server has accepted the request. Delivery results should be logged without exposing private location details.

### 7. Authentication and account handling

The latest Lovable source includes the signed-out route guard and legal-page cleanup, and the project reports passing typecheck, tests, and build after that work. Remaining issues from the broader audit include:

- P1: the requested destination can still be lost during some authentication return flows
- P1: there is no complete user-facing account deletion workflow
- P2: biometric wording can imply stronger protection than the web implementation provides
- P2: policy acceptance/version tracking is not strong enough for reliable proof of consent

### 8. Database and server security

These stay ahead of normal feature polishing:

- P0: anonymous access to the safe-event listing currently reveals event rows and invite codes too broadly
- P0: anonymous callers can reach email-queue wrapper actions that should be server-only
- P0: location/destination privacy is not enforceable while ordinary event members can select raw attendee columns
- P1: caller-supplied identity in destination-visibility helpers must not be trusted; identity must come from the authenticated session

### 9. Test and technical-debt condition

- 112 automated tests pass, but R@lly Home tests mostly duplicate simplified logic instead of exercising the real components and hooks
- No full test proves: prompt → choice → driver assignment → departure → drop-off/arrival → host completion
- Lint previously found 739 errors and 59 warnings; much of this is weak typing and duplicated logic that makes these state bugs easier to create
- The production bundle is large and should be split after correctness/security fixes
- Dependency scanning found known vulnerable packages that require controlled upgrades and regression testing

## The repair plan

### Phase 0 — Contain immediate risk

1. Disable simulated-payment success in every production path.
2. Prevent new paid events from being published until the replacement processor is ready; preserve existing cover-charge data.
3. Lock anonymous event/invite and email-queue access.
4. Stop client access to raw private location/destination columns; expose only server-filtered safety summaries.

**Acceptance test:** an anonymous user cannot enumerate events/invite codes, invoke email jobs, read private destinations, or create a successful fake payment.

### Phase 1 — Build one R@lly Home engine with two entry points

1. Define one explicit state machine: `undecided`, `planned`, `en_route`, `arrived`, or `declined`.
2. Define transport separately: `self`, `dd_driver`, `dd_rider`, or `external`.
3. Make one server operation perform each transition and clear incompatible old fields atomically.
4. Create one canonical journey record that can optionally be connected to an event, a squad/friend circle, both, or neither.
5. Store the sharing audience separately from the journey: `event_host`, `event_attendees`, `squad`, `selected_friends`, or a controlled combination.
6. Make the event and private/squad screens two views of that same engine—not two copies of the safety data.
7. When a private journey is not shared with the event, the Host Safety Dashboard must show only a privacy-safe result such as “handling my own trip / not shared,” never the private destination or selected friends.

**Acceptance test:** a person can use R@lly Home with an event, without an event, or privately with selected friends. Every authorized screen agrees on their state after refresh and on a second device, while unauthorized viewers cannot see the destination or live location.

### Phase 2 — Repair the R@lly Home user journey

1. Keep the auto-open component mounted until the user finishes or dismisses it.
2. Replace ambiguous “I'm good” labels with distinct choices and short explanations.
3. Require valid destination coordinates when automatic arrival is promised; otherwise explain that manual confirmation is required.
4. Let a DD confirm any assigned accepted/confirmed rider's drop-off without requiring the rider to press a second button first.
5. Normalize `accepted` and `confirmed` everywhere.
6. Add the DD-departure notification type (or use one canonical existing ride type), inspect function errors, and report delivery honestly.
7. Make host completion, badges, analytics, and attendee screens use the same final-state calculation.

**Acceptance test:** run the complete event flow with a host, DD, rider, self-transport attendee, and declining attendee on separate accounts/devices. Then run a private friends-only journey with no event and a journey linked to an event but hidden from general attendees.

### Phase 3 — Replace the payment engine while keeping cover charges

1. Select the new processor and decide who legally receives funds, fees, refunds, disputes, and tax reporting.
2. Create a provider-neutral server interface so the UI does not know the processor name.
3. Server loads the event price; browser never decides the amount.
4. A verified provider webhook changes payment to `paid`; the browser response alone never unlocks joining.
5. Require host payout readiness before a paid event can be published.
6. Migrate/remove Fluid Pay functions, UI, environment variables, database fields, saved tokens, webhook code, and branding.
7. Add refund, duplicate-payment, retry, decline, abandoned checkout, and guest-authentication tests.

**Acceptance test:** real sandbox money flow works end to end, duplicate attempts charge once, altered amounts fail, and no search of source/config/database schema finds an active Fluid Pay dependency.

### Phase 4 — Finish authentication, maintenance, and regression protection

1. Preserve auth return destinations, add account deletion, correct biometric wording, and version policy acceptance.
2. Add integration tests for the top event, join, payment, and R@lly Home workflows.
3. Reduce lint errors in touched areas, then upgrade vulnerable dependencies in small groups.
4. Split the largest bundles after behavior is stable.

## Recommended execution order

Do only the minimum Phase 0 containment required to prevent active security/privacy/payment harm. Then make R@lly Home Phases 1–2 the primary implementation project. Preserve both the event and private/friends-only experiences. Implement the replacement payment system only after the processor/business choice is made. Finish broader debt last in small verified batches.

## What is deliberately not decided in this audit

- The replacement payment processor
- The marketplace/payout legal model and fee structure
- Whether automatic background arrival will be a native-app promise or a foreground-only web feature

Those choices materially change implementation and cost. They should be decided before code changes, not guessed during the audit.
