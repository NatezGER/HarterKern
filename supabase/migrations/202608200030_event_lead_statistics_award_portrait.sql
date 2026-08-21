-- Event lead statistics and portrait trophy asset support.

create view public.event_player_best_progression
with (security_invoker = true)
as
with eligible_attempts as (
  select a.id, a.event_id, a.player_id, a.time_hundredths, a.submitted_at,
    min(a.time_hundredths) over (
      partition by a.event_id, a.player_id
      order by a.submitted_at, a.id
      rows between unbounded preceding and 1 preceding
    ) prior_personal_best
  from public.attempts a
  join public.qualified_event_players qualified
    on qualified.event_id = a.event_id and qualified.player_id = a.player_id
  join public.events e on e.id = a.event_id
    and e.deleted_at is null and e.status = 'closed'
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_ak and not a.is_dnf and a.time_hundredths is not null
), personal_best_changes as (
  select * from eligible_attempts
  where prior_personal_best is null or time_hundredths < prior_personal_best
)
select id source_attempt_id, event_id, player_id,
  submitted_at achieved_at, time_hundredths personal_best_hundredths,
  lead(submitted_at) over (
    partition by event_id, player_id order by submitted_at, id
  ) next_personal_best_at,
  row_number() over (
    partition by event_id, player_id order by submitted_at, id
  )::integer sequence
from personal_best_changes;

create view public.event_lead_segments
with (security_invoker = true)
as
with eligible_attempts as materialized (
  select a.id, a.event_id, a.player_id, a.time_hundredths, a.submitted_at
  from public.attempts a
  join public.qualified_event_players qualified
    on qualified.event_id = a.event_id and qualified.player_id = a.player_id
  join public.events e on e.id = a.event_id
    and e.deleted_at is null and e.status = 'closed'
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_ak and not a.is_dnf and a.time_hundredths is not null
), first_player_attempts as (
  select event_id, player_id, min(submitted_at) first_valid_at
  from eligible_attempts
  group by event_id, player_id
), qualification_candidates as (
  select event_id, first_valid_at,
    row_number() over (
      partition by event_id order by first_valid_at, player_id
    ) player_sequence
  from first_player_attempts
), qualified_events as (
  select q.event_id, q.first_valid_at qualification_started_at,
    (select max(a.submitted_at) from eligible_attempts a
      where a.event_id = q.event_id) statistical_ended_at
  from qualification_candidates q
  where q.player_sequence = 3
), initial_leaders as (
  select distinct on (q.event_id)
    q.event_id, a.player_id, q.qualification_started_at lead_started_at,
    a.time_hundredths leading_time_hundredths, a.id source_attempt_id
  from qualified_events q
  join eligible_attempts a on a.event_id = q.event_id
    and a.submitted_at <= q.qualification_started_at
  order by q.event_id, a.time_hundredths, a.submitted_at, a.id
), later_attempts as (
  select a.*,
    min(a.time_hundredths) over (
      partition by a.event_id order by a.submitted_at, a.id
      rows between unbounded preceding and 1 preceding
    ) prior_best
  from eligible_attempts a
  join qualified_events q on q.event_id = a.event_id
), lead_changes as (
  select a.event_id, a.player_id, a.submitted_at lead_started_at,
    a.time_hundredths leading_time_hundredths, a.id source_attempt_id
  from later_attempts a
  join qualified_events q on q.event_id = a.event_id
  where a.submitted_at > q.qualification_started_at
    and a.time_hundredths < a.prior_best
), lead_points as (
  select * from initial_leaders
  union all
  select * from lead_changes
), ordered_segments as (
  select points.*,
    lead(points.lead_started_at) over (
      partition by points.event_id
      order by points.lead_started_at, points.source_attempt_id
    ) next_lead_started_at,
    row_number() over (
      partition by points.event_id
      order by points.lead_started_at, points.source_attempt_id
    )::integer sequence
  from lead_points points
)
select segments.event_id, segments.player_id,
  segments.lead_started_at,
  coalesce(segments.next_lead_started_at, events.statistical_ended_at) lead_ended_at,
  greatest(0, extract(epoch from (
    coalesce(segments.next_lead_started_at, events.statistical_ended_at)
      - segments.lead_started_at
  )))::bigint duration_seconds,
  segments.leading_time_hundredths, segments.sequence,
  events.qualification_started_at, events.statistical_ended_at,
  extract(year from e.start_date)::integer season_year
from ordered_segments segments
join qualified_events events on events.event_id = segments.event_id
join public.events e on e.id = segments.event_id;

create view public.event_lead_player_statistics
with (security_invoker = true)
as
with contextual_segments as (
  select segments.*,
    lag(player_id) over (partition by event_id order by sequence) previous_player_id,
    lead(player_id) over (partition by event_id order by sequence) next_player_id
  from public.event_lead_segments segments
), player_event_stats as (
  select event_id, season_year, player_id,
    sum(duration_seconds)::bigint lead_duration_seconds,
    count(*) filter (
      where sequence > 1 and previous_player_id is distinct from player_id
    )::integer lead_takeovers,
    count(*) filter (
      where next_player_id is not null and next_player_id is distinct from player_id
    )::integer lead_losses,
    count(*)::integer lead_segment_count,
    max(duration_seconds)::bigint longest_lead_seconds,
    max(extract(epoch from (statistical_ended_at - qualification_started_at)))::bigint
      statistical_event_duration_seconds
  from contextual_segments
  group by event_id, season_year, player_id
)
select stats.player_id, p.display_name, p.avatar_url, p.avatar_path,
  stats.season_year,
  sum(stats.lead_duration_seconds)::bigint total_lead_seconds,
  sum(stats.lead_takeovers)::integer lead_takeovers,
  sum(stats.lead_losses)::integer lead_losses,
  count(distinct stats.event_id)::integer events_led,
  max(stats.longest_lead_seconds)::bigint longest_lead_seconds,
  sum(stats.lead_segment_count)::integer lead_segment_count,
  sum(stats.statistical_event_duration_seconds)::bigint qualified_event_duration_seconds,
  round(sum(stats.lead_duration_seconds)::numeric
    / nullif(sum(stats.statistical_event_duration_seconds), 0) * 100, 1)
    lead_share_percent,
  round(sum(stats.lead_duration_seconds)::numeric
    / nullif(sum(stats.lead_segment_count), 0))::bigint average_lead_seconds
from player_event_stats stats
join public.players p on p.id = stats.player_id
group by stats.player_id, p.display_name, p.avatar_url, p.avatar_path,
  stats.season_year;

alter table public.award_assets
  drop constraint award_assets_height_check;
alter table public.award_assets
  add constraint award_assets_dimensions_check check (
    width >= 512 and height >= 512
    and (asset_type = 'trophy' or height = width)
  );

grant select on public.event_player_best_progression,
  public.event_lead_segments,
  public.event_lead_player_statistics to anon, authenticated;
