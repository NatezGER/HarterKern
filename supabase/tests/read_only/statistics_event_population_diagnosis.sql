-- Read-only evidence for the reported Paul / 2026 difference.
-- Real IDs are discovered by canonical normalized name; no guessed production ID.
-- Zero rows means no matching permanent player. No RPC, writes or migration.
with target as (
  select id, display_name from public.players
  where normalized_name = public.normalize_player_name('Paul')
), old_source as (
  select q.player_id,
    count(*) old_threshold_denominator,
    count(*) filter (where q.source_type = 'historical_attempt') historical_times,
    count(*) filter (where q.source_type = 'attempt') qualified_attempt_times
  from public.season_qualified_official_times q join target t on t.id = q.player_id
  where q.season_year = 2026 and not q.is_guest group by q.player_id
), event_source as (
  select a.player_id,
    count(*) filter (where a.is_valid_time) valid_event_times,
    count(*) filter (where a.is_dnf) dnf_starts,
    count(*) filter (where a.is_valid_time and a.time_hundredths < 400) sub4,
    count(*) filter (where a.is_valid_time and a.time_hundredths < 500) sub5
  from public.official_event_attempts a join target t on t.id = a.player_id
  join public.events e on e.id = a.event_id
  where extract(year from e.start_date)::integer = 2026 group by a.player_id
)
select t.id, t.display_name,
  coalesce(o.old_threshold_denominator,0) old_threshold_denominator,
  coalesce(e.valid_event_times,0) corrected_threshold_denominator,
  coalesce(o.historical_times,0) historical_times,
  coalesce(o.qualified_attempt_times,0) qualified_attempt_times,
  coalesce(e.dnf_starts,0) dnf_starts_excluded_from_both_denominators,
  coalesce(e.sub4,0) sub4, coalesce(e.sub5,0) sub5,
  coalesce(o.old_threshold_denominator,0)-coalesce(e.valid_event_times,0) difference
from target t left join old_source o on o.player_id=t.id
left join event_source e on e.player_id=t.id;
