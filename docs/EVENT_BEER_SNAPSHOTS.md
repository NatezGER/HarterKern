# Optional beer snapshots (071)

Based on the current Sweet Spot branch, no statistics or badge changes.

## Persistence and compatibility
- Nullable events.beer_brand is the event default.
- Nullable attempts.beer_brand is a stored snapshot, not an event join.
- Both have an 80-character database limit; UI input limit is also 80.
- Start/edit trim whitespace, blank input becomes NULL.
- No backfill: previously existing rows remain NULL.
- sync_start_event_v5 delegates all existing setup to v4, then stores the default
  in the same transaction. v4 remains available.
- sync_create_event_attempt keeps its signature and validations; its existing
  active-event check now also reads the beer once. Both INSERT branches include
  the snapshot. No second attempt write or new trigger.
- sync_update_event_attempt_v2 preserves participant/result/time semantics and
  writes the beer in the same existing UPDATE. The explicit p_update_beer_brand
  flag distinguishes clearing from omission. Old update RPC remains available.
- sync_update_event_v3 delegates metadata/trophy validation to v2 and optionally
  changes the default only. No attempt is rewritten.
- Security mode/search_path and anon/authenticated grants follow the existing
  sync RPC contract; no new direct-table privileges.

## Request impact and visibility
No extra frontend requests, subscriptions or reads. Existing events/attempts
select-star responses include the columns. Event-detail maps its existing event
read. Mutations still use one RPC each; existing refresh behavior stays intact.

Beer appears only at start, in event management, in the edit dialog for event
attempts and once as small metadata on closed event results. Standalone historical
attempts and their storage are unchanged. Live cards/history/profile/stats/compare
do not display the brand.

## Verification and deployment
Run focused component/repository tests and check:quick.
supabase/tests/database/event_attempt_beer_brand.sql is a rollback-only pgTAP
fixture for a DISPOSABLE LOCAL database (never production). It covers start,
snapshot, default changes, individual overrides/clearing, guests, DNF, trophy
metadata, closure and lengths. It requires no active fixture event at start.
A SQL runtime run is still required if PostgreSQL/pgTAP are unavailable locally.
Apply 071 before deploying frontend calls to the new RPCs.

Manual check: start with beer, record a time and guest DNF, change default,
record again, override one attempt, reload, close event and check subtle metadata.
Also start without beer and check no new result metadata.

## Later statistics
Stored attempts support counts, average/best time by beer, beer per player,
most-used/fastest beer per player and league-wide most-used beer without changing
this model. Qualification, DNF handling and brand spelling/grouping remain future
product decisions; NULL is unknown, not a guessed default.
