-- PR 9D: season-scoped Most Wanted while preserving all-time read models.

create view public.season_qualified_official_times
with (security_invoker = true)
as
select
  extract(year from e.start_date)::integer season_year,
  q.*
from public.qualified_official_times q
join public.events e on e.id = q.event_id and e.deleted_at is null
where q.source_type = 'attempt'
  and extract(year from e.start_date)::integer >= 2026
union all
select
  extract(year from q.occurred_date)::integer season_year,
  q.*
from public.qualified_official_times q
where q.source_type = 'historical_attempt'
  and extract(year from q.occurred_date)::integer >= 2026;

create view public.season_most_wanted_endings
with (security_invoker = true)
as
with seasons as (
  select generate_series(
    2026,
    greatest(2026, extract(year from current_date)::integer)
  )::integer season_year
), endings as (
  select s.season_year, generate_series(0, 99)::integer ending
  from seasons s
), ranked as (
  select
    q.*,
    mod(q.time_hundredths, 100)::integer ending,
    row_number() over (
      partition by q.season_year, mod(q.time_hundredths, 100)
      order by q.occurred_at, q.source_priority, q.source_order, q.source_id
    ) hit_sequence
  from public.season_qualified_official_times q
), ending_counts as (
  select
    q.season_year,
    mod(q.time_hundredths, 100)::integer ending,
    count(*)::integer hit_count,
    count(distinct case when q.is_guest then concat('guest:', q.display_name)
      else concat('player:', q.player_id) end)::integer participant_count
  from public.season_qualified_official_times q
  group by q.season_year, mod(q.time_hundredths, 100)
), first_hits as (
  select * from ranked where hit_sequence = 1
)
select
  e.season_year,
  e.ending,
  lpad(e.ending::text, 2, '0') ending_label,
  f.source_id first_source_id,
  f.player_id first_player_id,
  f.guest_id first_guest_id,
  f.display_name first_display_name,
  f.avatar_url first_avatar_url,
  f.avatar_path first_avatar_path,
  coalesce(f.is_guest, false) first_is_guest,
  f.time_hundredths first_time_hundredths,
  f.occurred_at first_occurred_at,
  f.occurred_date first_occurred_date,
  coalesce(f.has_exact_time, false) first_has_exact_time,
  f.event_id first_event_id,
  f.source_type first_source_type,
  coalesce(nullif(trim(ev.name), ''), h.historical_label,
    case when f.source_id is null then null else 'Historischer Einzelversuch' end) source_label,
  coalesce(c.hit_count, 0)::integer hit_count,
  coalesce(c.participant_count, 0)::integer participant_count,
  f.source_id is not null achieved
from endings e
left join first_hits f
  on f.season_year = e.season_year and f.ending = e.ending
left join ending_counts c
  on c.season_year = e.season_year and c.ending = e.ending
left join public.events ev on ev.id = f.event_id and ev.deleted_at is null
left join public.historical_attempts h
  on h.id = f.source_id and f.source_type = 'historical_attempt';

create view public.season_most_wanted_progress
with (security_invoker = true)
as
select
  season_year,
  count(*) filter (where achieved)::integer reached_count,
  100::integer total_count,
  round(count(*) filter (where achieved) * 100.0, 1) progress_percent,
  array_agg(ending order by ending) filter (where not achieved) open_endings,
  (array_agg(ending order by hit_count desc, ending) filter (where achieved))[1]
    most_common_ending,
  coalesce(max(hit_count), 0)::integer most_common_hit_count,
  array_agg(ending order by hit_count, ending) filter (
    where achieved and hit_count = (
      select min(inner_mw.hit_count)
      from public.season_most_wanted_endings inner_mw
      where inner_mw.season_year = mw.season_year and inner_mw.achieved
    )
  ) rarest_achieved_endings
from public.season_most_wanted_endings mw
group by season_year;

grant select on public.season_qualified_official_times,
  public.season_most_wanted_endings,
  public.season_most_wanted_progress to anon, authenticated;
