-- PR 9C: season PB and WR progression without changing all-time read models.

create view public.season_world_record_history
with (security_invoker = true)
as
with qualified_times as (
  select extract(year from e.start_date)::integer season_year,
    a.id record_id, a.player_id, p.display_name, p.avatar_url, p.avatar_path,
    a.time_hundredths, a.submitted_at achieved_at,
    (a.submitted_at at time zone 'Europe/Berlin')::date achieved_date,
    a.event_id, coalesce(nullif(trim(e.name), ''), 'Spieleabend') source_label,
    'attempt'::text source_type, 2 source_priority, 0 source_order
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
    and not p.is_ak and not p.is_archived
    and extract(year from e.start_date)::integer >= 2026
  union all
  select extract(year from h.attempt_date)::integer,
    h.id, h.player_id, p.display_name, p.avatar_url, p.avatar_path,
    h.time_hundredths,
    h.attempt_date::timestamp at time zone 'Europe/Berlin', h.attempt_date,
    null::uuid, coalesce(nullif(trim(h.historical_label), ''),
      'Historischer Einzelversuch'),
    'historical_attempt'::text, 1, h.sort_order
  from public.historical_attempts h
  join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
    and extract(year from h.attempt_date)::integer >= 2026
), timestamp_candidates as (
  select *, row_number() over (
    partition by season_year, achieved_at
    order by time_hundredths, source_priority, source_order, record_id
  ) timestamp_rank
  from qualified_times
), ordered as (
  select *, min(time_hundredths) over (
    partition by season_year
    order by achieved_at, source_priority, source_order, record_id
    rows between unbounded preceding and 1 preceding
  ) previous_record
  from timestamp_candidates
  where timestamp_rank = 1
), records as (
  select * from ordered
  where previous_record is null or time_hundredths < previous_record
), sequenced as (
  select *, row_number() over (
    partition by season_year
    order by achieved_at, source_priority, source_order, record_id
  ) sequence_number
  from records
), compared as (
  select *,
    lag(time_hundredths) over (
      partition by season_year order by sequence_number
    ) previous_record_hundredths,
    lead(achieved_date) over (
      partition by season_year order by sequence_number
    ) period_end_date,
    max(sequence_number) over (partition by season_year) final_sequence
  from sequenced
)
select season_year, record_id, player_id, display_name, avatar_url, avatar_path,
  time_hundredths, achieved_at, achieved_date, event_id, source_label,
  source_type, sequence_number::integer, previous_record_hundredths,
  case when previous_record_hundredths is null then null
    else previous_record_hundredths - time_hundredths end improvement_hundredths,
  period_end_date,
  greatest(0, coalesce(period_end_date, current_date) - achieved_date)::integer
    duration_days,
  sequence_number = final_sequence is_current
from compared;

create or replace function public.get_player_season_pb_history(
  p_player_id uuid,
  p_season_year integer
)
returns table (
  source_id uuid,
  player_id uuid,
  display_name text,
  time_hundredths integer,
  achieved_at timestamptz,
  achieved_date date,
  event_id uuid,
  source_label text,
  source_type text,
  sequence_number integer,
  previous_best_hundredths integer,
  improvement_hundredths integer,
  period_end_date date,
  duration_days integer,
  is_current boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with qualified_times as (
    select a.id source_id, a.player_id, p.display_name, a.time_hundredths,
      a.submitted_at achieved_at,
      (a.submitted_at at time zone 'Europe/Berlin')::date achieved_date,
      a.event_id, coalesce(nullif(trim(e.name), ''), 'Spieleabend') source_label,
      'attempt'::text source_type, 2 source_priority, 0 source_order
    from public.attempts a
    join public.events e on e.id = a.event_id and e.deleted_at is null
    join public.players p on p.id = a.player_id
    where a.player_id = p_player_id
      and extract(year from e.start_date)::integer = p_season_year
      and a.status = 'approved' and a.deleted_at is null
      and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
      and not p.is_ak and not p.is_archived
    union all
    select h.id, h.player_id, p.display_name, h.time_hundredths,
      h.attempt_date::timestamp at time zone 'Europe/Berlin', h.attempt_date,
      null::uuid, 'Historischer Einzelversuch',
      'historical_attempt'::text, 1, h.sort_order
    from public.historical_attempts h
    join public.players p on p.id = h.player_id
    where h.player_id = p_player_id
      and extract(year from h.attempt_date)::integer = p_season_year
      and h.deleted_at is null and not h.is_guest and not h.out_of_competition
      and not p.is_ak and not p.is_archived
      and p_season_year >= 2026
  ), timestamp_candidates as (
    select *, row_number() over (
      partition by achieved_at
      order by time_hundredths, source_priority, source_order, source_id
    ) timestamp_rank
    from qualified_times
  ), ordered as (
    select *, min(time_hundredths) over (
      order by achieved_at, source_priority, source_order, source_id
      rows between unbounded preceding and 1 preceding
    ) previous_best
    from timestamp_candidates
    where timestamp_rank = 1
  ), improvements as (
    select * from ordered
    where previous_best is null or time_hundredths < previous_best
  ), sequenced as (
    select *, row_number() over (
      order by achieved_at, source_priority, source_order, source_id
    ) sequence_number
    from improvements
  ), compared as (
    select *,
      lag(time_hundredths) over (order by sequence_number) previous_hundredths,
      lead(achieved_date) over (order by sequence_number) next_date,
      max(sequence_number) over () final_sequence
    from sequenced
  )
  select source_id, player_id, display_name, time_hundredths, achieved_at,
    achieved_date, event_id, source_label, source_type,
    sequence_number::integer, previous_hundredths,
    case when previous_hundredths is null then null
      else previous_hundredths - time_hundredths end,
    next_date,
    greatest(0, coalesce(next_date, current_date) - achieved_date)::integer,
    sequence_number = final_sequence
  from compared
  where p_season_year >= 2026
  order by sequence_number;
$$;

grant select on public.season_world_record_history to anon, authenticated;
revoke all on function public.get_player_season_pb_history(uuid, integer)
  from public;
grant execute on function public.get_player_season_pb_history(uuid, integer)
  to anon, authenticated;
