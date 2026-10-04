-- Canonical statistical event time, explicit pauses and pairwise rivalries.

create table public.event_statistical_pauses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  paused_at timestamptz not null,
  resumed_at timestamptz not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_statistical_pauses_positive_interval
    check (resumed_at > paused_at)
);

create index event_statistical_pauses_event_interval_idx
  on public.event_statistical_pauses(event_id, paused_at, resumed_at);

create trigger event_statistical_pauses_set_updated_at
before update on public.event_statistical_pauses
for each row execute function public.set_updated_at();

alter table public.event_statistical_pauses enable row level security;

create policy event_statistical_pauses_public_read
on public.event_statistical_pauses for select
to anon, authenticated using (true);

create policy event_statistical_pauses_admin_insert
on public.event_statistical_pauses for insert
to authenticated with check (public.is_admin());

create policy event_statistical_pauses_admin_update
on public.event_statistical_pauses for update
to authenticated using (public.is_admin()) with check (public.is_admin());

create policy event_statistical_pauses_admin_delete
on public.event_statistical_pauses for delete
to authenticated using (public.is_admin());

create or replace function public.event_active_elapsed_seconds(
  p_event_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz
) returns bigint
language sql stable security invoker set search_path = public as $$
  with recursive clamped as (
    select greatest(paused_at, p_started_at) interval_start,
      least(resumed_at, p_ended_at) interval_end
    from public.event_statistical_pauses
    where event_id = p_event_id
      and p_started_at is not null and p_ended_at is not null
      and p_ended_at > p_started_at
      and paused_at < p_ended_at and resumed_at > p_started_at
  ), ordered as (
    select interval_start, interval_end,
      max(interval_end) over (
        order by interval_start, interval_end
        rows between unbounded preceding and 1 preceding
      ) prior_max_end
    from clamped
    where interval_end > interval_start
  ), islands as (
    select interval_start, interval_end,
      sum(case when prior_max_end is null or interval_start > prior_max_end
        then 1 else 0 end) over (order by interval_start, interval_end) island_id
    from ordered
  ), merged as (
    select min(interval_start) interval_start, max(interval_end) interval_end
    from islands group by island_id
  ), paused as (
    select coalesce(sum(extract(epoch from interval_end - interval_start)), 0) seconds
    from merged
  )
  select greatest(0, floor(extract(epoch from p_ended_at - p_started_at)
    - paused.seconds))::bigint
  from paused
  where p_started_at is not null and p_ended_at is not null;
$$;

create or replace function public.event_timestamp_after_active_seconds(
  p_event_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_active_seconds bigint
) returns timestamptz
language plpgsql stable security invoker set search_path = public as $$
declare
  cursor_at timestamptz := p_started_at;
  remaining_seconds numeric := greatest(0, p_active_seconds);
  pause_record record;
  gap_seconds numeric;
begin
  if p_started_at is null or p_ended_at is null or p_ended_at <= p_started_at then
    return p_started_at;
  end if;

  for pause_record in
    with clamped as (
      select greatest(paused_at, p_started_at) interval_start,
        least(resumed_at, p_ended_at) interval_end
      from public.event_statistical_pauses
      where event_id = p_event_id
        and paused_at < p_ended_at and resumed_at > p_started_at
    ), ordered as (
      select interval_start, interval_end,
        max(interval_end) over (
          order by interval_start, interval_end
          rows between unbounded preceding and 1 preceding
        ) prior_max_end
      from clamped where interval_end > interval_start
    ), islands as (
      select interval_start, interval_end,
        sum(case when prior_max_end is null or interval_start > prior_max_end
          then 1 else 0 end) over (order by interval_start, interval_end) island_id
      from ordered
    )
    select min(interval_start) interval_start, max(interval_end) interval_end
    from islands group by island_id order by min(interval_start)
  loop
    gap_seconds := greatest(0, extract(epoch from pause_record.interval_start - cursor_at));
    if remaining_seconds <= gap_seconds then
      return least(p_ended_at, cursor_at + make_interval(secs => remaining_seconds::double precision));
    end if;
    remaining_seconds := remaining_seconds - gap_seconds;
    cursor_at := greatest(cursor_at, pause_record.interval_end);
  end loop;

  return least(p_ended_at, cursor_at + make_interval(secs => remaining_seconds::double precision));
end;
$$;

create or replace view public.official_event_attempts
with (security_invoker = true) as
select a.id attempt_id, a.event_id, a.player_id, a.submitted_at,
  a.time_hundredths, a.is_dnf,
  (not a.is_dnf and a.time_hundredths is not null) is_valid_time
from public.attempts a
join public.events e on e.id = a.event_id and e.deleted_at is null
join public.players p on p.id = a.player_id
  and not p.is_ak and not p.is_archived
where a.status = 'approved' and a.deleted_at is null
  and not a.is_ak and a.player_id is not null;

create or replace view public.event_statistical_windows
with (security_invoker = true) as
select attempts.event_id,
  min(attempts.submitted_at) statistical_started_at,
  max(attempts.submitted_at) statistical_ended_at,
  public.event_active_elapsed_seconds(
    attempts.event_id,
    min(attempts.submitted_at),
    max(attempts.submitted_at)
  ) duration_seconds,
  count(*)::integer official_attempt_count
from public.official_event_attempts attempts
group by attempts.event_id;

create or replace view public.event_lead_windows
with (security_invoker = true) as
with first_attempts as (
  select distinct on (event_id, player_id)
    event_id, player_id, submitted_at first_attempt_at,
    attempt_id first_attempt_id
  from public.official_event_attempts
  order by event_id, player_id, submitted_at, attempt_id
), qualification_candidates as (
  select first_attempts.*,
    row_number() over (
      partition by event_id order by first_attempt_at, first_attempt_id, player_id
    ) player_sequence
  from first_attempts
)
select candidates.event_id,
  candidates.first_attempt_at qualification_started_at,
  candidates.first_attempt_id qualification_attempt_id,
  windows.statistical_ended_at,
  public.event_active_elapsed_seconds(
    candidates.event_id,
    candidates.first_attempt_at,
    windows.statistical_ended_at
  ) duration_seconds
from qualification_candidates candidates
join public.event_statistical_windows windows using (event_id)
where candidates.player_sequence = 3;

create or replace view public.event_lead_segments_all
with (security_invoker = true) as
with official as materialized (
  select attempts.* from public.official_event_attempts attempts
), qualified_events as (
  select windows.event_id, windows.qualification_started_at,
    windows.qualification_attempt_id, windows.statistical_ended_at
  from public.event_lead_windows windows
), valid as materialized (
  select official.*,
    min(time_hundredths) over (
      partition by event_id order by submitted_at, attempt_id
      rows between unbounded preceding and 1 preceding
    ) prior_event_best
  from official
  where is_valid_time
), initial_leaders as (
  select distinct on (events.event_id)
    events.event_id, attempts.player_id,
    events.qualification_started_at lead_started_at,
    attempts.time_hundredths leading_time_hundredths,
    attempts.attempt_id source_attempt_id
  from qualified_events events
  join valid attempts on attempts.event_id = events.event_id
    and (attempts.submitted_at, attempts.attempt_id)
      <= (events.qualification_started_at, events.qualification_attempt_id)
  order by events.event_id, attempts.time_hundredths,
    attempts.submitted_at, attempts.attempt_id
), later_lead_points as (
  select attempts.event_id, attempts.player_id,
    attempts.submitted_at lead_started_at,
    attempts.time_hundredths leading_time_hundredths,
    attempts.attempt_id source_attempt_id
  from valid attempts
  join qualified_events events using (event_id)
  where (attempts.submitted_at, attempts.attempt_id)
      > (events.qualification_started_at, events.qualification_attempt_id)
    and (attempts.prior_event_best is null
      or attempts.time_hundredths < attempts.prior_event_best)
), lead_points as (
  select * from initial_leaders
  union all
  select * from later_lead_points
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
select segments.event_id, segments.player_id, segments.lead_started_at,
  coalesce(segments.next_lead_started_at, events.statistical_ended_at) lead_ended_at,
  public.event_active_elapsed_seconds(
    segments.event_id,
    segments.lead_started_at,
    coalesce(segments.next_lead_started_at, events.statistical_ended_at)
  ) duration_seconds,
  segments.leading_time_hundredths, segments.sequence,
  events.qualification_started_at, events.statistical_ended_at,
  extract(year from source_event.start_date)::integer season_year
from ordered_segments segments
join qualified_events events using (event_id)
join public.events source_event on source_event.id = segments.event_id;

create or replace view public.event_lead_segments
with (security_invoker = true) as
select segments.event_id, segments.player_id, segments.lead_started_at,
  segments.lead_ended_at, segments.duration_seconds,
  segments.leading_time_hundredths, segments.sequence,
  segments.qualification_started_at, segments.statistical_ended_at,
  segments.season_year
from public.event_lead_segments_all segments
join public.events events on events.id = segments.event_id
  and events.status = 'closed' and events.deleted_at is null;

create or replace view public.event_lead_player_statistics
with (security_invoker = true) as
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
    max(public.event_active_elapsed_seconds(
      event_id, qualification_started_at, statistical_ended_at
    ))::bigint statistical_event_duration_seconds
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

create or replace function public.get_qualified_leadership_metrics(
  p_player_ids uuid[] default null,
  p_season_year integer default null,
  p_event_id uuid default null
) returns table (
  metric_key text, player_id uuid, value numeric,
  hit_count numeric, sample_count numeric, detail text
)
language sql stable security invoker set search_path = public as $$
with scoped_segments as materialized (
  select segments.*,
    lag(player_id) over (
      partition by event_id order by sequence
    ) previous_player_id
  from public.event_lead_segments_all segments
  join public.events events on events.id = segments.event_id
  where (p_event_id is null and events.status = 'closed'
      or p_event_id is not null and events.id = p_event_id
        and events.awards_trophies)
    and (p_event_id is not null or p_season_year is null
      or segments.season_year = p_season_year)
), break_counts as (
  select player_id, count(*)::numeric breaks
  from scoped_segments
  where sequence > 1
    and (p_player_ids is null or player_id = any(p_player_ids))
  group by player_id
), takeover_counts as (
  select player_id, count(*)::numeric takeovers
  from scoped_segments
  where sequence > 1 and previous_player_id is distinct from player_id
    and (p_player_ids is null or player_id = any(p_player_ids))
  group by player_id
), chaos as (
  select participant player_id, count(*)::numeric changes
  from (
    select previous_player_id participant
    from scoped_segments
    where sequence > 1 and previous_player_id is distinct from player_id
    union all
    select player_id
    from scoped_segments
    where sequence > 1 and previous_player_id is distinct from player_id
  ) involved
  where participant is not null
    and (p_player_ids is null or participant = any(p_player_ids))
  group by participant
)
select 'event-breaks'::text, player_id::uuid, breaks::numeric,
  null::numeric, null::numeric, null::text
from break_counts where breaks > 0
union all
select 'takeovers'::text, player_id::uuid, takeovers::numeric,
  null::numeric, null::numeric, null::text
from takeover_counts where takeovers > 0
union all
select 'chaos-magnet'::text, player_id::uuid, changes::numeric,
  null::numeric, null::numeric, null::text
from chaos where changes > 0;
$$;

revoke all on function public.get_qualified_leadership_metrics(
  uuid[], integer, uuid
) from public;
grant execute on function public.get_qualified_leadership_metrics(
  uuid[], integer, uuid
) to anon, authenticated;

create or replace view public.event_lead_time_badge_awards
with (security_invoker = true) as
with tiers(badge_key, threshold) as (
  values ('event-lead-time-bronze'::text, 1::bigint),
    ('event-lead-time-silver', 36000::bigint),
    ('event-lead-time-gold', 360000::bigint),
    ('event-lead-time-diamond', 3600000::bigint)
), progression as (
  select segments.*,
    coalesce(sum(duration_seconds) over (
      partition by player_id order by lead_started_at, event_id, sequence
      rows between unbounded preceding and 1 preceding
    ), 0)::bigint prior_total,
    sum(duration_seconds) over (partition by player_id)::bigint current_total
  from public.event_lead_segments segments
  where duration_seconds > 0
), crossings as (
  select progression.*, tiers.badge_key, tiers.threshold,
    row_number() over (
      partition by progression.player_id, tiers.badge_key
      order by progression.lead_started_at, progression.event_id,
        progression.sequence
    ) crossing_sequence
  from progression
  join tiers on progression.prior_total < tiers.threshold
    and progression.prior_total + progression.duration_seconds >= tiers.threshold
)
select concat(player_id, ':', badge_key) award_key, player_id, badge_key,
  'event'::text source_type, null::uuid source_attempt_id,
  null::uuid source_historical_attempt_id, event_id source_event_id,
  public.event_timestamp_after_active_seconds(
    event_id, lead_started_at, lead_ended_at, threshold - prior_total
  ) awarded_at,
  jsonb_build_object('progress', current_total) metadata
from crossings
where crossing_sequence = 1;

create or replace view public.event_pair_attempt_states
with (security_invoker = true) as
with player_windows as (
  select distinct on (event_id, player_id)
    event_id, player_id,
    first_value(submitted_at) over attempt_order first_attempt_at,
    first_value(attempt_id) over attempt_order first_attempt_id,
    last_value(submitted_at) over full_attempt_order last_attempt_at,
    last_value(attempt_id) over full_attempt_order last_attempt_id
  from public.official_event_attempts
  window attempt_order as (
    partition by event_id, player_id order by submitted_at, attempt_id
  ), full_attempt_order as (
    partition by event_id, player_id order by submitted_at, attempt_id
    rows between unbounded preceding and unbounded following
  )
  order by event_id, player_id
), pairs as materialized (
  select low.event_id, low.player_id player_low_id,
    high.player_id player_high_id,
    case when (low.first_attempt_at, low.first_attempt_id)
      >= (high.first_attempt_at, high.first_attempt_id)
      then low.first_attempt_at else high.first_attempt_at end pair_started_at,
    case when (low.first_attempt_at, low.first_attempt_id)
      >= (high.first_attempt_at, high.first_attempt_id)
      then low.first_attempt_id else high.first_attempt_id end pair_start_attempt_id,
    case when (low.last_attempt_at, low.last_attempt_id)
      >= (high.last_attempt_at, high.last_attempt_id)
      then low.last_attempt_at else high.last_attempt_at end pair_ended_at,
    case when (low.last_attempt_at, low.last_attempt_id)
      >= (high.last_attempt_at, high.last_attempt_id)
      then low.last_attempt_id else high.last_attempt_id end pair_end_attempt_id
  from player_windows low
  join player_windows high on high.event_id = low.event_id
    and high.player_id > low.player_id
), pair_attempts as (
  select pairs.*, attempts.attempt_id, attempts.player_id,
    attempts.submitted_at, attempts.time_hundredths,
    attempts.is_dnf, attempts.is_valid_time,
    min(attempts.time_hundredths) filter (
      where attempts.player_id = pairs.player_low_id and attempts.is_valid_time
    ) over pair_order low_best_hundredths,
    min(attempts.time_hundredths) filter (
      where attempts.player_id = pairs.player_high_id and attempts.is_valid_time
    ) over pair_order high_best_hundredths
  from pairs
  join public.official_event_attempts attempts on attempts.event_id = pairs.event_id
    and attempts.player_id in (pairs.player_low_id, pairs.player_high_id)
  window pair_order as (
    partition by pairs.event_id, pairs.player_low_id, pairs.player_high_id
    order by attempts.submitted_at, attempts.attempt_id
    rows between unbounded preceding and current row
  )
), scoped_states as (
  select pair_attempts.*,
    case
      when low_best_hundredths is null and high_best_hundredths is null then null::uuid
      when high_best_hundredths is null then player_low_id
      when low_best_hundredths is null then player_high_id
      when low_best_hundredths = high_best_hundredths then null::uuid
      when low_best_hundredths < high_best_hundredths then player_low_id
      else player_high_id
    end leader_player_id
  from pair_attempts
  where (submitted_at, attempt_id) >= (pair_started_at, pair_start_attempt_id)
), contextual as (
  select scoped_states.*,
    lag(leader_player_id) over (
      partition by event_id, player_low_id, player_high_id
      order by submitted_at, attempt_id
    ) previous_leader_player_id,
    row_number() over (
      partition by event_id, player_low_id, player_high_id
      order by submitted_at, attempt_id
    )::integer state_sequence
  from scoped_states
)
select * from contextual;

create or replace view public.event_pair_lead_segments
with (security_invoker = true) as
with state_changes as (
  select states.*
  from public.event_pair_attempt_states states
  where state_sequence = 1
    or leader_player_id is distinct from previous_leader_player_id
), segments as (
  select state_changes.*,
    lead(submitted_at) over (
      partition by event_id, player_low_id, player_high_id
      order by submitted_at, attempt_id
    ) next_state_at
  from state_changes
)
select event_id, player_low_id, player_high_id, leader_player_id,
  submitted_at lead_started_at,
  coalesce(next_state_at, pair_ended_at) lead_ended_at,
  public.event_active_elapsed_seconds(
    event_id, submitted_at, coalesce(next_state_at, pair_ended_at)
  ) duration_seconds,
  low_best_hundredths, high_best_hundredths,
  row_number() over (
    partition by event_id, player_low_id, player_high_id
    order by submitted_at, attempt_id
  )::integer sequence
from segments;

create or replace view public.event_direct_lead_takeovers
with (security_invoker = true) as
select states.event_id, states.player_low_id, states.player_high_id,
  states.previous_leader_player_id previous_player_id,
  states.leader_player_id takeover_player_id,
  states.attempt_id source_attempt_id,
  states.submitted_at takeover_at,
  row_number() over (
    partition by states.event_id
    order by states.submitted_at, states.attempt_id,
      states.player_low_id, states.player_high_id
  )::integer lead_sequence
from public.event_pair_attempt_states states
where states.previous_leader_player_id is not null
  and states.leader_player_id is not null
  and states.previous_leader_player_id <> states.leader_player_id
  and states.player_id = states.leader_player_id
  and states.is_valid_time;

create or replace view public.event_pair_summaries
with (security_invoker = true) as
with pair_windows as (
  select event_id, player_low_id, player_high_id,
    min(pair_started_at) pair_started_at,
    max(pair_ended_at) pair_ended_at
  from public.event_pair_attempt_states
  group by event_id, player_low_id, player_high_id
), takeovers as (
  select event_id, player_low_id, player_high_id,
    count(*)::integer direct_takeovers,
    count(*) filter (where takeover_player_id = player_low_id)::integer low_takeovers,
    count(*) filter (where takeover_player_id = player_high_id)::integer high_takeovers,
    min(takeover_at) first_takeover_at,
    max(takeover_at) last_takeover_at
  from public.event_direct_lead_takeovers
  group by event_id, player_low_id, player_high_id
), lead_times as (
  select event_id, player_low_id, player_high_id,
    coalesce(sum(duration_seconds) filter (
      where leader_player_id = player_low_id
    ), 0)::bigint low_lead_seconds,
    coalesce(sum(duration_seconds) filter (
      where leader_player_id = player_high_id
    ), 0)::bigint high_lead_seconds
  from public.event_pair_lead_segments
  group by event_id, player_low_id, player_high_id
)
select windows.event_id, windows.player_low_id, windows.player_high_id,
  events.start_date event_date, events.status event_status,
  coalesce(events.closed_at, events.ends_at, windows.pair_ended_at) closed_at,
  coalesce(takeovers.direct_takeovers, 0)::integer direct_takeovers,
  coalesce(takeovers.direct_takeovers, 0) >= 3 is_rivalry_event,
  takeovers.first_takeover_at, takeovers.last_takeover_at,
  windows.pair_started_at, windows.pair_ended_at,
  coalesce(leads.low_lead_seconds, 0)::bigint low_lead_seconds,
  coalesce(leads.high_lead_seconds, 0)::bigint high_lead_seconds,
  coalesce(takeovers.low_takeovers, 0)::integer low_takeovers,
  coalesce(takeovers.high_takeovers, 0)::integer high_takeovers
from pair_windows windows
join public.events events on events.id = windows.event_id
  and events.deleted_at is null
left join takeovers using (event_id, player_low_id, player_high_id)
left join lead_times leads using (event_id, player_low_id, player_high_id);

create or replace view public.rivalry_pair_events
with (security_invoker = true) as
select event_id, player_low_id, player_high_id, event_date, closed_at,
  direct_takeovers, is_rivalry_event, first_takeover_at, last_takeover_at,
  pair_started_at, pair_ended_at, low_lead_seconds, high_lead_seconds,
  low_takeovers, high_takeovers
from public.event_pair_summaries
where event_status = 'closed';

drop function public.get_pair_rivalry(uuid, uuid, integer);

create function public.get_pair_rivalry(
  p_player_a_id uuid,
  p_player_b_id uuid,
  p_season_year integer default null
) returns table (
  event_id uuid, direct_takeovers integer, is_rivalry_event boolean,
  common_events integer, rivalry_events integer,
  total_direct_takeovers integer,
  first_rivalry_date date, last_rivalry_date date,
  player_a_lead_seconds bigint, player_b_lead_seconds bigint,
  player_a_takeovers integer, player_b_takeovers integer,
  pair_started_at timestamptz, pair_ended_at timestamptz
)
language sql stable security invoker set search_path = public as $$
  with requested as materialized (
    select * from public.rivalry_pair_events
    where player_low_id = least(p_player_a_id, p_player_b_id)
      and player_high_id = greatest(p_player_a_id, p_player_b_id)
      and (p_season_year is null
        or extract(year from event_date)::integer = p_season_year)
  ), summary as (
    select count(*)::integer common_events,
      count(*) filter (where is_rivalry_event)::integer rivalry_events,
      coalesce(sum(direct_takeovers), 0)::integer total_direct_takeovers,
      min(event_date) filter (where is_rivalry_event) first_rivalry_date,
      max(event_date) filter (where is_rivalry_event) last_rivalry_date,
      coalesce(sum(case when p_player_a_id = player_low_id
        then low_lead_seconds else high_lead_seconds end), 0)::bigint player_a_lead_seconds,
      coalesce(sum(case when p_player_b_id = player_high_id
        then high_lead_seconds else low_lead_seconds end), 0)::bigint player_b_lead_seconds,
      coalesce(sum(case when p_player_a_id = player_low_id
        then low_takeovers else high_takeovers end), 0)::integer player_a_takeovers,
      coalesce(sum(case when p_player_b_id = player_high_id
        then high_takeovers else low_takeovers end), 0)::integer player_b_takeovers
    from requested
  )
  select requested.event_id, requested.direct_takeovers,
    requested.is_rivalry_event, summary.common_events,
    summary.rivalry_events, summary.total_direct_takeovers,
    summary.first_rivalry_date, summary.last_rivalry_date,
    summary.player_a_lead_seconds, summary.player_b_lead_seconds,
    summary.player_a_takeovers, summary.player_b_takeovers,
    requested.pair_started_at, requested.pair_ended_at
  from requested cross join summary
  union all
  select null, 0, false, summary.common_events, summary.rivalry_events,
    summary.total_direct_takeovers, summary.first_rivalry_date,
    summary.last_rivalry_date, summary.player_a_lead_seconds,
    summary.player_b_lead_seconds, summary.player_a_takeovers,
    summary.player_b_takeovers, null, null
  from summary where not exists (select 1 from requested);
$$;

create or replace function public.get_player_rivalries(p_player_id uuid)
returns table (
  rival_player_id uuid, display_name text, avatar_url text, avatar_path text,
  rivalry_events integer, direct_takeovers integer,
  first_rivalry_date date, last_rivalry_date date
)
language sql stable security invoker set search_path = public as $$
  with oriented as (
    select case when player_low_id = p_player_id
      then player_high_id else player_low_id end rival_player_id,
      event_date, direct_takeovers
    from public.rivalry_pair_events
    where is_rivalry_event
      and p_player_id in (player_low_id, player_high_id)
  )
  select oriented.rival_player_id, players.display_name,
    players.avatar_url, players.avatar_path,
    count(*)::integer rivalry_events,
    sum(oriented.direct_takeovers)::integer direct_takeovers,
    min(oriented.event_date), max(oriented.event_date)
  from oriented
  join public.players players on players.id = oriented.rival_player_id
  group by oriented.rival_player_id, players.display_name,
    players.avatar_url, players.avatar_path
  order by rivalry_events desc, direct_takeovers desc,
    max(oriented.event_date) desc, oriented.rival_player_id;
$$;

create or replace function public.get_rivalry_pair_rankings(
  p_season_year integer default null,
  p_event_id uuid default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
with scoped as materialized (
  select summaries.*
  from public.event_pair_summaries summaries
  where (p_event_id is null and summaries.event_status = 'closed'
      or p_event_id is not null and summaries.event_id = p_event_id)
    and (p_season_year is null
      or extract(year from summaries.event_date)::integer = p_season_year)
), pair_rollup as (
  select player_low_id, player_high_id,
    count(*)::numeric common_events,
    count(*) filter (where is_rivalry_event)::numeric rivalry_events,
    coalesce(sum(direct_takeovers), 0)::numeric all_direct_takeovers,
    coalesce(sum(direct_takeovers) filter (
      where is_rivalry_event
    ), 0)::numeric rivalry_direct_takeovers,
    min(event_date) filter (where is_rivalry_event) first_rivalry_date,
    max(event_date) filter (where is_rivalry_event) last_rivalry_date,
    greatest(0, max(event_date) filter (where is_rivalry_event)
      - min(event_date) filter (where is_rivalry_event))::numeric span_days
  from scoped
  group by player_low_id, player_high_id
), ranked_pairs as (
  select pair_rollup.*,
    row_number() over (order by span_days desc nulls last, rivalry_events desc,
      player_low_id, player_high_id) longest_position,
    row_number() over (order by rivalry_direct_takeovers desc,
      rivalry_events desc, player_low_id, player_high_id) strongest_position,
    row_number() over (order by all_direct_takeovers desc,
      player_low_id, player_high_id) direct_position
  from pair_rollup
)
select coalesce(jsonb_agg(jsonb_build_object(
  'playerLowId', pairs.player_low_id,
  'playerHighId', pairs.player_high_id,
  'playerLowName', low.display_name,
  'playerHighName', high.display_name,
  'rivalryEvents', pairs.rivalry_events,
  'directTakeovers', pairs.all_direct_takeovers,
  'allDirectTakeovers', pairs.all_direct_takeovers,
  'rivalryDirectTakeovers', pairs.rivalry_direct_takeovers,
  'commonEvents', pairs.common_events,
  'firstRivalryDate', pairs.first_rivalry_date,
  'lastRivalryDate', pairs.last_rivalry_date,
  'spanDays', case when pairs.rivalry_events > 0 then pairs.span_days end,
  'levelReached', pairs.rivalry_events > 0
) order by pairs.all_direct_takeovers desc, pairs.rivalry_events desc,
  pairs.player_low_id, pairs.player_high_id), '[]'::jsonb)
from ranked_pairs pairs
join public.players low on low.id = pairs.player_low_id
join public.players high on high.id = pairs.player_high_id
where (pairs.rivalry_events > 0
    and (pairs.longest_position <= 10 or pairs.strongest_position <= 10))
  or (pairs.all_direct_takeovers > 0 and pairs.direct_position <= 10);
$$;

create or replace function public.get_advanced_rivalry_pair_rankings(
  p_season_year integer default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
  select public.get_rivalry_pair_rankings(p_season_year, null);
$$;

create or replace function public.get_unified_statistics_dashboard(
  p_season_year integer default null,
  p_event_id uuid default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
with baseline as materialized (
  select public.get_unified_statistics_dashboard_v56(p_season_year, p_event_id) payload
), advanced as materialized (
  select public.get_advanced_statistics_dashboard(p_season_year, p_event_id) payload
), normalized_baseline_metrics as (
  select jsonb_set(metric, '{rankings}', coalesce((select jsonb_agg(entry order by
      case when metric->>'key' in ('fastest', 'average', 'dnf')
        then (entry->>'value')::numeric end asc,
      case when metric->>'key' not in ('fastest', 'average', 'dnf')
        then (entry->>'value')::numeric end desc,
      (entry->>'total')::numeric desc nulls last,
      entry->>'name', entry->>'playerId')
    from jsonb_array_elements(metric->'rankings') entry
    where metric->>'key' not in ('sub5', 'sub4', 'sub3', 'sub25', 'sub2')
      or coalesce((entry->>'count')::numeric, 0) > 0), '[]'::jsonb)) metric
  from baseline,
    jsonb_array_elements(coalesce(payload->'metrics', '[]'::jsonb)) metric
  where metric->>'key' not in ('event-breaks', 'takeovers', 'lead-time')
    and (p_event_id is null or (
      metric->>'key' not like 'badge-%'
      and metric->>'key' not like 'wr-%'
      and metric->>'key' not like 'rivalry-%'
      and metric->>'key' not in (
        'pb-jump', 'rare-hunter', 'nemesis', 'favorite-opponent'
      )
    ))
), canonical_lead_values as materialized (
  select segments.player_id,
    sum(segments.duration_seconds)::numeric value
  from public.event_lead_segments_all segments
  join public.events events on events.id = segments.event_id
  where (p_event_id is null and events.status = 'closed'
      or p_event_id is not null and events.id = p_event_id
        and events.awards_trophies)
    and (p_event_id is not null or p_season_year is null
      or segments.season_year = p_season_year)
  group by segments.player_id
  having sum(segments.duration_seconds) > 0
), canonical_lead_ranked as (
  select values.player_id, values.value,
    players.display_name, players.avatar_url, players.avatar_path,
    rank() over (order by values.value desc) placement,
    row_number() over (order by values.value desc,
      players.display_name, values.player_id) display_position
  from canonical_lead_values values
  join public.players players on players.id = values.player_id
), canonical_lead_metric as (
  select case when exists(select 1 from canonical_lead_values)
    then jsonb_build_array(jsonb_build_object(
      'key', 'lead-time',
      'overallValue', (select sum(value) from canonical_lead_values),
      'overallCount', null,
      'overallTotal', null,
      'overallDetail', null,
      'rankings', coalesce((select jsonb_agg(jsonb_build_object(
        'rank', placement, 'playerId', player_id, 'name', display_name,
        'avatarUrl', avatar_url, 'avatarPath', avatar_path,
        'value', value, 'count', null, 'total', null, 'detail', null
      ) order by display_position)
      from canonical_lead_ranked where display_position <= 10), '[]'::jsonb)
    )) else '[]'::jsonb end payload
)
select case when baseline.payload is null then null else jsonb_build_object(
  'metrics', coalesce((select jsonb_agg(metric)
    from normalized_baseline_metrics), '[]'::jsonb)
    || coalesce(advanced.payload->'metrics', '[]'::jsonb)
    || canonical_lead_metric.payload,
  'rivalryPairs', public.get_rivalry_pair_rankings(p_season_year, p_event_id)
) end
from baseline cross join advanced cross join canonical_lead_metric;
$$;

create or replace function public.refresh_badge_ledger_after_statistical_pause()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requested_event_ids uuid[];
  requested_player_ids uuid[];
begin
  requested_event_ids := array_remove(array[
    case when tg_op <> 'INSERT' then old.event_id end,
    case when tg_op <> 'DELETE' then new.event_id end
  ], null);

  select array_agg(distinct affected.player_id)
  into requested_player_ids
  from (
    select attempts.player_id
    from public.attempts attempts
    where attempts.event_id = any(requested_event_ids)
      and attempts.player_id is not null
    union
    select ledger.player_id
    from public.player_badge_award_ledger ledger
    where ledger.source_event_id = any(requested_event_ids)
      and (ledger.badge_key like 'event-lead-time-%'
        or ledger.badge_key like 'rivalry-%')
  ) affected;

  if coalesce(cardinality(requested_player_ids), 0) > 0 then
    perform public.sync_player_badge_award_ledgers(requested_player_ids);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger event_statistical_pauses_refresh_badges
after insert or update or delete on public.event_statistical_pauses
for each row execute function public.refresh_badge_ledger_after_statistical_pause();

do $$
declare affected_player_ids uuid[];
begin
  select array_agg(distinct affected.player_id)
  into affected_player_ids
  from (
    select ledger.player_id
    from public.player_badge_award_ledger ledger
    where ledger.badge_key like 'rivalry-%'
      or ledger.badge_key like 'event-lead-time-%'
    union
    select player_low_id from public.rivalry_pair_events where is_rivalry_event
    union
    select player_high_id from public.rivalry_pair_events where is_rivalry_event
    union
    select player_id from public.event_lead_segments
  ) affected;

  if coalesce(cardinality(affected_player_ids), 0) > 0 then
    perform public.sync_player_badge_award_ledgers(affected_player_ids);
  end if;
end;
$$;

grant select on public.event_statistical_pauses,
  public.official_event_attempts,
  public.event_statistical_windows,
  public.event_lead_windows,
  public.event_lead_segments_all,
  public.event_pair_attempt_states,
  public.event_pair_lead_segments,
  public.event_pair_summaries,
  public.event_direct_lead_takeovers,
  public.rivalry_pair_events to anon, authenticated;

revoke all on function public.event_active_elapsed_seconds(uuid, timestamptz, timestamptz),
  public.event_timestamp_after_active_seconds(uuid, timestamptz, timestamptz, bigint),
  public.get_pair_rivalry(uuid, uuid, integer),
  public.get_player_rivalries(uuid),
  public.get_rivalry_pair_rankings(integer, uuid),
  public.get_advanced_rivalry_pair_rankings(integer),
  public.refresh_badge_ledger_after_statistical_pause() from public;

grant execute on function public.event_active_elapsed_seconds(uuid, timestamptz, timestamptz),
  public.event_timestamp_after_active_seconds(uuid, timestamptz, timestamptz, bigint),
  public.get_pair_rivalry(uuid, uuid, integer),
  public.get_player_rivalries(uuid),
  public.get_rivalry_pair_rankings(integer, uuid),
  public.get_advanced_rivalry_pair_rankings(integer) to anon, authenticated;

revoke all on function public.refresh_badge_ledger_after_statistical_pause()
  from anon, authenticated;

-- The production Denmark event id and calendar date are intentionally not
-- present in the repository. After both values have been verified, insert one
-- pause from 02:30 Europe/Berlin to 19:30 Europe/Berlin on that real date.
