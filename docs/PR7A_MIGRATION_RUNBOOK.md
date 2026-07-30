# PR 7A migration runbook

## Before migration

1. Create a Supabase database backup.
2. Export the `storage.objects` inventory for existing buckets.
3. Confirm migrations through `202607290012_pr6c_production_data.sql` are
   applied.
4. Confirm the production admin user has a row in `public.admin_roles`.

## Apply

Run these files in order:

1. `supabase/migrations/202607300013_pr7a_event_foundation.sql`
2. `supabase/migrations/202607300014_pr7a_badge_foundation.sql`

The first migration adds event history, soft-delete, RLS, Storage and central
event/statistics behavior. The second adds badge definitions and derived awards.
Neither migration inserts demo/product activity or deletes existing data.

## Smoke checks

- public event/history queries do not return a row whose `deleted_at` is set
- Hall of Fame, WR progression and global/player/event statistics ignore it
- restoring the row makes the same results visible again
- an anonymous call to an `admin_*event*` PR-7 RPC is rejected
- `player-avatars` is limited to 5 MiB and `event-photos` to 8 MiB
- both buckets accept only JPEG, PNG and WebP
- repeated reads of `public_player_badges` have unique `award_key` values

## Permanent purge safety

Never call `admin_finalize_event_purge` before deleting every path returned by
`admin_prepare_event_purge` through the Supabase Storage API and deleting the
matching `event_photos` metadata. The finalizer intentionally refuses events
that still have registered photos.

## Recovery

If product verification fails, do not delete data. Restore soft-deleted events
with `admin_restore_event`. For schema rollback, first deploy a client that does
not depend on PR 7A, export new Storage content, and only then remove PR-7
objects in reverse dependency order.
