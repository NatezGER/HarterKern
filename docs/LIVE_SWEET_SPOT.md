# Live Sweet Spot (070)

## Canonical definition

`getPlayerAttemptNumbers` calls `get_player_attempt_number_statistics(uuid)`
(036). `AttemptNumberChart` only scales/renders these means. Numbering is
per player/event, ordered by submitted_at/id, after approved/nondeleted/non-AK
filtering and exclusion of deleted events/archived players. DNF occupies a
number but does not enter the mean. Standalone historical attempts have no
event ordinal and are absent. The chart includes current as well as closed
events, All-Time; Sweet Spot intentionally uses that same population and
rounded hundredths, not a separate closed-event or season variant.

Sweet Spot is the lowest non-null chart mean; tied means select the earlier
ordinal. One valid sample qualifies. The new RPC simply selects from the
existing canonical chart RPC, without recalculating its averages.

## Read path

The live snapshot has raw approved/nondeleted attempts, not canonical chart
aggregates. Computing personal history from it would duplicate the statistics
engine (and rely on an unpaginated raw read). The existing chart API accepts
one player only; the first-attempt benchmark API cannot return other ordinals.
070 therefore adds one event-batched read, restricted to active, nondeleted
events and their regular permanent participants. Internally it calls the
indexed player-scoped chart function for each participant; no league-wide
aggregation. It returns one row per player plus the canonical next ordinal.

`useSweetSpots` issues one optional browser RPC per active-event/live-group
version, independent of the existing first-benchmark request. No card queries,
no per-render fetch, no new polling/subscription, no save-path dependency.
Normal live refresh, participant changes, attempt update/delete and focus
refresh use the existing live-version mechanism. Event/version guards and
effect cleanup discard stale responses. Failures hide this optional hint.

The live visibility helper counts the matching event/player's official
attempts from the already filtered LiveState, including DNF and excluding AK.
Contiguous row_number ordinals mean the next number is this count plus one;
raw array order does not affect it. It must also match the server's next
ordinal, suppressing responses ahead of or behind the live snapshot.
No frontend averages or Sweet Spot selection.

## Card footprint

The existing min-h-36/p-3 mobile card, min-h-28 button, size-16 avatar,
text-lg name and two-column grid are preserved. A single absolute h-3
bottom slot takes no normal-flow height or width. Empty, benchmark and Sweet
Spot states use the same slot. Text truncates without wrapping; its full
value remains in text/aria-label/title. Desktop uses the gap above the action.
When #1 is also the Sweet Spot, the Sweet Spot takes priority; otherwise the slot shows the first-attempt benchmark, or remains empty.
Compared with main, the optional benchmark no longer adds a paragraph's
margins/height; cards never grow to accommodate the new hint.

## Validation / live-event gate

Focused UI/service/helper/lifecycle/static-contract tests plus quick check.
The pgTAP fixture requires a disposable migrated local DB, never production.
070 must be deployed separately before the read exists; missing RPC is a
silent optional fallback and cannot prevent saving.

Manual checks still required: 360/390/430px with long names and both hints,
desktop placement, font scaling, first-attempt text truncation, save/DNF,
delete/AK-edit, participant addition and fast event switching. The absolute
slot's footprint is structurally tested, not browser-measured. Production-like
RPC cold/warm latency and current-event load must be measured before rollout;
no latency claims or database execution are implied by static tests.

## Files in this change

- `supabase/migrations/202610160070_live_sweet_spot.sql`
- `src/services/sweetSpotService.ts`
- `src/hooks/useSweetSpots.ts`
- `src/lib/sweetSpot.ts`
- `src/types/database.ts`
- `src/pages/LiveEventPage.tsx`
- `src/components/events/ParticipantCard.tsx`
- `src/services/sweetSpotService.test.ts`
- `src/hooks/useSweetSpots.test.ts`
- `src/lib/sweetSpot.test.ts`
- `src/components/events/ParticipantCard.test.tsx`
- `supabase/tests/database/live_sweet_spot.sql`
- `docs/LIVE_SWEET_SPOT.md`
