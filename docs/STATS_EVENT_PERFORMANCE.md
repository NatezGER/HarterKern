# Stats overview and event performance (069)

## Diagnosis before correction

Migration 062's isolated Performance RPC used different populations:

- `valid` / `average`: approved, nondeleted regular-player event attempts,
  without AK/archived players; DNF excluded from valid count and average.
- `sub5/sub4/sub3/sub25/sub2`: `qualified_official_times` (All-Time) or
  `season_qualified_official_times` (season), including historical times.
  These sources already exclude DNF, AK and archived players.
- Seasonal qualified times require an event for attempt rows. Eventless
  attempts can enter the All-Time source, but not the seasonal source.

Thus two DNF do **not** explain 84 versus 86 in the old threshold. Historical
times are the identifiable extra source in the 2026 path. The code establishes
the source mismatch, not that Paul's production data actually has exactly two
historical times. That remains to be verified with
`supabase/tests/read_only/statistics_event_population_diagnosis.sql`.
For the requested event-only definition, the valid event count is authoritative.

Top-ten selection previously used value/name/id, while final JSON ordering
added sample count only after the cutoff. A larger tied group under five
seconds could therefore exclude a player included under four seconds.
Sample count now participates before the cutoff. Competition rank still
depends solely on the exact rate, never name or sample size.

## Definitions

- One scoped `official_event_attempts` read supplies permanent regular players.
  Its valid subset excludes DNF/null time. Threshold numerators use strict
  boundaries 500/400/300/250/200; denominator is the same valid event subset.
- `event-max`: largest valid count within one event, with event name/date.
- `common`: each player's maximum exact-time frequency; faster time wins
  a tie for the example detail. Overall value is the highest personal frequency.
- Historical PB/WR, median, fastest-five and consistency sources are unchanged.
  All-start sequence metrics still retain DNF as sequence breaks.
- Existing Compare/Trophy definitions are **not** silently changed by this
  route correction. The isolated Performance service supplies matching labels.

## Overview

Header/navigation → shared large beer milestone card → regular players,
distinct guests, closed events → unchanged Rivalries → area navigation.
WR progression remains on Performance; redundant Highlights are removed.
Beer uses `community-valid`, includes valid guest event times and reuses
the milestone catalogue, current/next progress and optional managed artwork.
The existing scoped data group now tags its statistics snapshot; stale
overview facts/volume are hidden synchronously during a scope change.

Guest identity uses existing `event_guests.normalized_name`, distinct across
nondeleted events in the selected scope (registered guests, including those
without a valid time). Closed events require status `closed`; no new
three-player qualification requirement. Existing regular-player and generic
event-count definitions remain unchanged.

## Bingos

`bingo-lines` is returned by the existing badge-statistics RPC, without a
new network request or frontend calculation. All-Time uses canonical
`player_bingo_lines`; seasons reuse `bingo_line_cells` with scoped qualified
hits and the existing per-field thresholds 1/2/3/5. Historical times remain
eligible here, matching existing BINGO semantics.

Each completed geometric line contributes its highest reached color's weight
once: Bronze 1, Silver 2, Gold 3, Diamond 5 points. All actual rows, columns
and diagonals contribute, not the player's highest badge tier. Lower colors
are not added again for the same line. Two Bronze + one Silver + one Diamond
score 9; one Gold + two Silver score 7; four Bronze score 4.
No badges, award ledger entries, triggers or source data change.

## Verification

069 is additive and must be deployed before relying on the new facts/ranking.
The pgTAP regression is for a disposable local database only and rolls back.
Static contract tests do not establish PostgreSQL compile/runtime success.
The old 062 parity scripts document the old contract: after 069 the threshold,
event-max and common differences from legacy Unified are intentional; do not
expect exact legacy parity or reapply 062 over the corrected function.

## Changed files

- `src/pages/StatsOverviewPage.tsx`
- `src/components/stats/TeamMilestones.tsx`
- `src/constants/statMetricRegistry.ts`
- `src/services/dataGroupService.ts`
- `src/services/performanceDashboardService.ts`
- `src/services/statsService.ts`
- `src/types/database.ts`
- `src/types/index.ts`
- `src/pages/StatsStructure.test.tsx`
- `src/components/stats/TeamMilestones.test.tsx`
- `src/services/badgeDashboardService.test.ts`
- `src/services/dataGroupService.test.ts`
- `src/services/performanceDashboardService.test.ts`
- `src/services/statsServiceMetrics.test.ts`
- `src/services/statisticsOverviewSql.test.ts`
- `supabase/migrations/202610150069_statistics_overview_event_performance.sql`
- `supabase/tests/database/statistics_overview_event_performance.sql`
- `supabase/tests/read_only/statistics_event_population_diagnosis.sql`
- `docs/STATS_EVENT_PERFORMANCE.md`
