# PR 7 implementation plan

PR 7 is split into three independently deployable pull requests. The complete
scope from the PR 7 master prompt remains assigned; the split prevents schema,
storage, authentication and several large user interfaces from being reviewed
as one inseparable change.

## PR 7A — foundation (this pull request)

- additive event metadata (`description`, `is_important`, soft-delete audit data)
- central soft-delete enforcement in RLS and all public/statistical views
- admin-only soft-delete, restore and two-phase permanent purge RPCs
- separate Storage buckets and policies for player avatars and event photos
- event-photo metadata with public visibility coupled to the parent event
- one central, tie-aware event podium
- central PB progression and per-attempt-number statistics
- player participation, win, second-place and third-place aggregates
- badge definitions separated from deterministic derived awards
- idempotent historical badge backfill through views, with automatic withdrawal
  after attempt correction or event soft-delete
- TypeScript contracts, database regression tests and migration/runbook notes

No new public control is activated in PR 7A. The current management-code screen
is a local UI lock, not a Supabase authentication session, and must not be used
as authorization for destructive or Storage operations.

## PR 7B — history, profiles and live workflow

Depends on PR 7A.

- integrate a real authenticated admin session backed by `admin_roles`
- complete historical event pages, attempt filters and PB/WR/EB annotations
- avatar upload, replacement and removal using `player-avatars`
- event photo upload/gallery/removal using `event-photos`
- trash UI, restore and permanent purge orchestration
- mobile participant image grid and time/DNF bottom sheet
- DNF feedback, realtime subscriptions and browser coverage
- expanded profile statistics and attempt-number analysis

Permanent event deletion uses a deliberate two-phase workflow:

1. `admin_prepare_event_purge` returns every registered event-photo path.
2. The authenticated client deletes those objects with the Storage API and
   removes their metadata.
3. `admin_finalize_event_purge` refuses to continue while photo metadata exists,
   then deletes the event graph transactionally.

This prevents a database transaction from pretending that external Storage
bytes were deleted successfully.

## PR 7C — prestige and progression

Depends on PR 7A and PR 7B.

- badge medal gallery and badge detail UX
- important-event podium badge presentation
- animated WR and PB step charts, duration calculations and reduced motion
- dashboard activity feed, recent PB/WR/badge/event summaries and streaks
- final visual and responsive polish

## Central domain decisions

- Deleted events are excluded in database policies and views. UI filtering is
  only defence in depth.
- Event podium uses `dense_rank` over each participant's fastest approved,
  non-DNF event attempt. Identical best times share a rank.
- Guests may occupy an event podium but never receive permanent player badges.
- AK/archived players never contribute to official long-term results.
- Valid-attempt and streak badges use regular event attempts only.
- Performance and official-WR badges may use qualified historical attempts,
  matching PR 6C's established long-term-record rules.
- The under-three streak runs across event boundaries in deterministic
  `submitted_at, attempt_id` order. DNF and times of 3.00 seconds or slower
  break it.
- Historical rows without a time use `attempt_date`, then `sort_order`, then the
  row UUID for deterministic ordering.
- Badge awards are derived rather than copied into mutable grant rows. Their
  stable `award_key` prevents duplicates; edits, deletes and restores are
  reflected immediately without a fragile trigger/recompute race.

## Security boundary

All new administrative RPCs and Storage writes require both an authenticated
Supabase user and `public.is_admin()`. They are not granted to `anon`. PR 7B
must establish the authenticated client session before enabling related UI.
The avatar bucket is public for stable profile URLs. The event-photo bucket is
private so a soft-deleted event cannot remain reachable through a known public
object URL; PR 7B will create short-lived signed URLs for authorized public
reads through the event-aware select policy.

## Migration and rollback

Apply migrations in filename order:

1. `202607300013_pr7a_event_foundation.sql`
2. `202607300014_pr7a_badge_foundation.sql`

Before applying to production, take a Supabase database backup and export the
current Storage object inventory. Both migrations are additive and preserve
existing rows.

Rollback must be performed only after removing PR-7B/7C consumers. Drop the new
views, policies, functions and tables, then remove the additive event columns.
Do not remove either Storage bucket until its objects have been exported and
verified. A soft-deleted event can be restored simply by the admin RPC; this is
not a schema rollback.

## Deployment notes

- No new Vite environment variable is introduced by PR 7A.
- Create no buckets manually; the migration owns bucket configuration.
- Verify that the existing admin user still has an `admin_roles` row.
- The public application remains deployable before PR 7B because no unfinished
  public UI consumes the new schema.
