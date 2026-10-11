-- Event eligibility includes guests; personal career and pairwise sources stay permanent-only.
-- No stored attempts/awards are rewritten. Statistical pauses and final-attempt endpoints remain canonical.
create view public.event_eligible_attempts
with (security_invoker = true) as
select a.id attempt_id, a.event_id, a.player_id, a.guest_id,
  coalesce(a.player_id, a.guest_id) participant_id,
  a.submitted_at, a.time_hundredths, a.is_dnf,
  (not a.is_dnf and a.time_hundredths is not null) is_valid_time
from public.attempts a
join public.events e on e.id = a.event_id and e.deleted_at is null
left join public.players p on p.id = a.player_id
left join public.event_guests g on g.id = a.guest_id and g.event_id = a.event_id
where a.status = 'approved' and a.deleted_at is null and not a.is_ak
  and (g.id is not null or (p.id is not null and not p.is_ak and not p.is_archived));

create or replace view public.qualified_events
with (security_invoker = true) as
select a.event_id
from public.event_eligible_attempts a
join public.events e on e.id = a.event_id
where a.is_valid_time and not e.awards_trophies
group by a.event_id
having count(distinct a.participant_id) >= 3;

-- Archive/detail medal gate must use the same participant population as the view.
create or replace function public.get_medal_qualified_events(p_event_ids uuid[] default null)
returns table (event_id uuid)
language sql stable security invoker set search_path = public as $$
  select q.event_id from public.qualified_events q
  where p_event_ids is null or q.event_id = any(p_event_ids);
$$;

create or replace view public.event_statistical_windows
with (security_invoker = true) as
select a.event_id, min(a.submitted_at) statistical_started_at,
  max(a.submitted_at) statistical_ended_at,
  public.event_active_elapsed_seconds(a.event_id, min(a.submitted_at), max(a.submitted_at)) duration_seconds,
  count(*)::integer official_attempt_count
from public.event_eligible_attempts a
group by a.event_id;

-- Leadership is independent of podium completeness. DNF can end, but cannot start, a lead.
-- Community consumption is a separate aggregate, never the personal DNF/PB denominator.
create or replace view public.global_statistics
with (security_invoker = true)
as
with event_attempts as (
  select a.*
  from public.attempts a
  join public.players p on p.id = a.player_id
  join public.events e on e.id = a.event_id and e.deleted_at is null
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and not p.is_ak and not p.is_archived
), official_times as (
  select time_hundredths from event_attempts where not is_dnf
  union all
  select h.time_hundredths
  from public.historical_attempts h join public.players p on p.id = h.player_id
  where h.deleted_at is null and not h.is_guest and not h.out_of_competition
    and not p.is_ak and not p.is_archived
)
select
  (select count(*) from public.players where not is_ak and not is_archived)
    regular_players,
  (select count(*) from public.events where deleted_at is null) event_count,
  (select count(*) from event_attempts) approved_attempts,
  (select count(*) from event_attempts where not is_dnf) valid_attempts,
  (select count(*) from event_attempts where is_dnf) dnf_count,
  (select min(time_hundredths) from official_times) world_record_hundredths,
  (select round(avg(time_hundredths))::integer
    from event_attempts where not is_dnf) average_hundredths,
  (select count(*) from public.event_eligible_attempts where is_valid_time) community_valid_attempts;

create or replace view public.season_global_statistics
with (security_invoker = true)
as
with event_counts as (
  select extract(year from start_date)::integer season_year,
    count(*)::integer event_count
  from public.events
  where deleted_at is null and extract(year from start_date)::integer >= 2026
  group by extract(year from start_date)::integer
), attempt_stats as (
  select extract(year from e.start_date)::integer season_year,
    count(distinct a.player_id)::integer regular_players,
    count(a.id)::integer approved_attempts,
    count(a.id) filter (where not a.is_dnf)::integer valid_attempts,
    count(a.id) filter (where a.is_dnf)::integer dnf_count,
    min(a.time_hundredths) filter (where not a.is_dnf) world_record_hundredths,
    round(avg(a.time_hundredths) filter (where not a.is_dnf))::integer average_hundredths
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and not p.is_ak and not p.is_archived
  group by extract(year from e.start_date)::integer
)
select ec.season_year,
  coalesce(ats.regular_players, 0) regular_players,
  ec.event_count,
  coalesce(ats.approved_attempts, 0) approved_attempts,
  coalesce(ats.valid_attempts, 0) valid_attempts,
  coalesce(ats.dnf_count, 0) dnf_count,
  ats.world_record_hundredths,
  ats.average_hundredths,
  (select count(*) from public.event_eligible_attempts a
    join public.events e on e.id = a.event_id
    where a.is_valid_time and extract(year from e.start_date)::integer = ec.season_year) community_valid_attempts
from event_counts ec
left join attempt_stats ats using (season_year);


create or replace view public.event_lead_windows
with (security_invoker = true) as
select distinct on (a.event_id) a.event_id,
  a.submitted_at qualification_started_at, a.attempt_id qualification_attempt_id,
  w.statistical_ended_at,
  public.event_active_elapsed_seconds(a.event_id, a.submitted_at, w.statistical_ended_at) duration_seconds
from public.event_eligible_attempts a
join public.event_statistical_windows w using (event_id)
where a.is_valid_time
order by a.event_id, a.submitted_at, a.attempt_id;

-- The sole complete event-lead source. Guest identity never masquerades as player_id.
create view public.event_participant_lead_segments_all
with (security_invoker = true) as
with valid as (
  select a.*, min(a.time_hundredths) over (
    partition by a.event_id order by a.submitted_at, a.attempt_id
    rows between unbounded preceding and 1 preceding
  ) prior_event_best
  from public.event_eligible_attempts a where a.is_valid_time
), points as (
  select * from valid where prior_event_best is null or time_hundredths < prior_event_best
), segments as (
  select points.*,
    lead(submitted_at) over (partition by event_id order by submitted_at, attempt_id) next_lead_at,
    row_number() over (partition by event_id order by submitted_at, attempt_id)::integer sequence
  from points
)
select s.event_id, s.player_id, s.submitted_at lead_started_at,
  coalesce(s.next_lead_at, w.statistical_ended_at) lead_ended_at,
  public.event_active_elapsed_seconds(s.event_id, s.submitted_at,
    coalesce(s.next_lead_at, w.statistical_ended_at)) duration_seconds,
  s.time_hundredths leading_time_hundredths, s.sequence,
  w.qualification_started_at, w.statistical_ended_at,
  extract(year from e.start_date)::integer season_year,
  s.guest_id, s.attempt_id source_attempt_id, s.prior_event_best
from segments s
join public.event_lead_windows w using (event_id)
join public.events e on e.id = s.event_id;

create view public.event_participant_lead_segments
with (security_invoker = true) as
select s.* from public.event_participant_lead_segments_all s
join public.events e on e.id = s.event_id
where e.status = 'closed' and e.deleted_at is null;

-- Compatibility projection for personal metrics/badges: true durations, no guest rows.
create or replace view public.event_lead_segments_all
with (security_invoker = true) as
select event_id, player_id, lead_started_at, lead_ended_at, duration_seconds,
  leading_time_hundredths, sequence, qualification_started_at, statistical_ended_at, season_year
from public.event_participant_lead_segments_all
where player_id is not null;

create or replace view public.event_best_breaks
with (security_invoker = true) as
select source_attempt_id, event_id, player_id,
  leading_time_hundredths time_hundredths, prior_event_best,
  lead_started_at broke_at, season_year
from public.event_participant_lead_segments
where sequence > 1 and player_id is not null;

create or replace view public.event_lead_participant_statistics
with (security_invoker = true) as
select event_id, player_id, sum(duration_seconds)::bigint lead_seconds,
  count(*) filter (where sequence > 1)::integer event_best_breaks, guest_id
from public.event_participant_lead_segments
group by event_id, player_id, guest_id;

grant select on public.event_eligible_attempts,
  public.event_participant_lead_segments_all, public.event_participant_lead_segments
to anon, authenticated;

create or replace view public.event_lead_player_statistics
with (security_invoker = true) as
with contextual_segments as (
  select segments.*,
    lag(coalesce(player_id, guest_id)) over (partition by event_id order by sequence) previous_player_id,
    lead(coalesce(player_id, guest_id)) over (partition by event_id order by sequence) next_player_id
  from public.event_participant_lead_segments segments
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
  from public.event_participant_lead_segments_all segments
  join public.events events on events.id = segments.event_id
  where (p_event_id is null and events.status = 'closed'
      or p_event_id is not null and events.id = p_event_id
        and events.awards_trophies)
    and (p_event_id is not null or p_season_year is null
      or segments.season_year = p_season_year)
), break_counts as (
  select player_id, count(*)::numeric breaks
  from scoped_segments
  where sequence > 1 and player_id is not null
    and (p_player_ids is null or player_id = any(p_player_ids))
  group by player_id
), takeover_counts as (
  select player_id, count(*)::numeric takeovers
  from scoped_segments
  where sequence > 1 and player_id is not null and previous_player_id is distinct from player_id
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

create or replace view public.event_participant_statistics
with (security_invoker = true)
as
with visible_participants as (
  select
    ep.event_id,
    ep.player_id,
    null::uuid guest_id,
    p.display_name,
    p.avatar_url,
    p.avatar_path,
    false is_guest,
    p.is_ak
  from public.event_participants ep
  join public.events e on e.id = ep.event_id and e.deleted_at is null
  join public.players p on p.id = ep.player_id
  union all
  select
    g.event_id,
    null::uuid,
    g.id,
    g.display_name,
    null::text,
    null::text,
    true,
    false
  from public.event_guests g
  join public.events e on e.id = g.event_id and e.deleted_at is null
)
select
  vp.event_id,
  vp.player_id,
  vp.guest_id,
  vp.display_name,
  vp.avatar_url,
  vp.avatar_path,
  vp.is_guest,
  vp.is_ak,
  count(d.attempt_id) attempt_count,
  count(d.attempt_id) filter (where not d.is_dnf and not d.is_ak and d.time_hundredths is not null) valid_attempts,
  count(d.attempt_id) filter (where d.is_dnf) dnf_count,
  min(d.time_hundredths) filter (where not d.is_dnf and not d.is_ak and d.time_hundredths is not null) best_time_hundredths,
  round(avg(d.time_hundredths) filter (where not d.is_dnf and not d.is_ak and d.time_hundredths is not null))::integer
    average_hundredths,
  max(d.participant_rank) participant_rank
from visible_participants vp
left join public.event_attempt_details d
  on d.event_id = vp.event_id
  and d.player_id is not distinct from vp.player_id
  and d.guest_id is not distinct from vp.guest_id
group by vp.event_id, vp.player_id, vp.guest_id, vp.display_name,
  vp.avatar_url, vp.avatar_path, vp.is_guest, vp.is_ak;

grant select on public.event_participant_statistics to anon, authenticated;

-- Scoped team read; existing qualification and volume semantics are unchanged.
create or replace function public.get_team_milestones_snapshot(
  p_season_year integer default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
with scoped_times as (
  select player_id, time_hundredths
  from public.qualified_official_times
  where p_season_year is null and not is_guest and player_id is not null
  union all
  select player_id, time_hundredths
  from public.season_qualified_official_times
  where p_season_year is not null and season_year = p_season_year
    and not is_guest and player_id is not null
), personal_bests as (
  select player_id, min(time_hundredths) best_hundredths
  from scoped_times
  group by player_id
), team as materialized (
  select player_id, best_hundredths
  from personal_bests
  order by best_hundredths, player_id
  limit 10
), volume as (
  select count(*)::bigint valid_attempts
  from public.event_eligible_attempts a
  join public.events e on e.id = a.event_id
  where a.is_valid_time and (p_season_year is null or
    (p_season_year >= 2026 and extract(year from e.start_date)::integer = p_season_year))
)
select jsonb_build_object(
  'seasonYear', p_season_year,
  'validAttempts', coalesce((select valid_attempts from volume), 0),
  'teamTimeHundredths', (select sum(best_hundredths) from team),
  'playerCount', (select count(*) from team),
  'targetPlayerCount', 10
);
$$;
revoke all on function public.get_team_milestones_snapshot(integer) from public;
grant execute on function public.get_team_milestones_snapshot(integer) to anon, authenticated;

create or replace function public.get_team_milestones_snapshot_v2(
  p_season_year integer default null,
  p_milestones jsonb default '[]'::jsonb
) returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  r record;
  m record;
  personal_bests jsonb := '{}'::jsonb;
  crossed jsonb := '{}'::jsonb;
  crossings jsonb := '[]'::jsonb;
  valid_count bigint := 0;
  team_total bigint := 5000;
  previous_total bigint := 5000;
  player_count integer := 0;
  old_pb integer;
  proof jsonb;
begin
  if jsonb_typeof(p_milestones) is distinct from 'array' then
    raise exception 'Milestones must be an array';
  end if;
  if jsonb_array_length(p_milestones) > 200 then raise exception 'Too many milestones'; end if;
  if exists (select 1 from jsonb_to_recordset(p_milestones) as x(id text, kind text, threshold numeric)
    where id is null or id !~ '^(beer|team)-[a-z0-9-]+$'
      or kind is null or kind not in ('beer-volume', 'team-time')
      or threshold is null or threshold <= 0 or threshold > 1000000000)
    or (select count(*) <> count(distinct x.id)
      from jsonb_to_recordset(p_milestones) as x(id text)) then
    raise exception 'Invalid milestones';
  end if;
  -- A future >=50s stage is already reached at baseline, without an invented trigger.
  for m in select * from jsonb_to_recordset(p_milestones) as x(id text, kind text, threshold numeric)
    where kind = 'team-time' and threshold >= 50 loop
    crossed := crossed || jsonb_build_object(m.id, true);
    crossings := crossings || jsonb_build_array(jsonb_build_object('milestoneId', m.id,
      'sourceType', 'baseline', 'occurredDate', null, 'occurredAt', null,
      'eventId', null, 'eventName', null, 'playerId', null, 'playerName', null,
      'sourceId', null, 'timeHundredths', null, 'improvementHundredths', null));
  end loop;
  for r in
    -- Thin projection of 017/026 qualification, avoiding event_attempt_details expansion.
    -- PBs retain event-less official attempts; only real event attempts add volume.
    select a.id source_id, a.player_id, p.display_name player_name, a.time_hundredths,
      a.submitted_at occurred_at, (a.submitted_at at time zone 'Europe/Berlin')::date occurred_date,
      a.event_id, e.name event_name, 'attempt'::text source_type,
      2 source_priority, 0 source_order
    from public.attempts a join public.players p on p.id = a.player_id
    left join public.events e on e.id = a.event_id
    where a.status = 'approved' and a.deleted_at is null and not a.is_dnf
      and a.time_hundredths is not null and not a.is_ak
      and not p.is_ak and not p.is_archived and a.guest_id is null
      and (a.event_id is null or e.deleted_at is null)
      and (p_season_year is null or (p_season_year >= 2026
        and extract(year from e.start_date)::integer = p_season_year))
    union all
    -- Guests contribute consumption only; the PB map below remains player-only.
    select a.attempt_id, null::uuid, g.display_name, a.time_hundredths,
      a.submitted_at, (a.submitted_at at time zone 'Europe/Berlin')::date,
      a.event_id, e.name, 'attempt'::text, 2, 0
    from public.event_eligible_attempts a
    join public.event_guests g on g.id = a.guest_id
    join public.events e on e.id = a.event_id
    where a.is_valid_time and (p_season_year is null or (p_season_year >= 2026
      and extract(year from e.start_date)::integer = p_season_year))
    union all
    select h.id, h.player_id, h.display_name, h.time_hundredths,
      h.attempt_date::timestamp at time zone 'Europe/Berlin', h.attempt_date,
      null::uuid, null::text, 'historical_attempt'::text, 1, h.sort_order
    from public.historical_attempts h join public.players p on p.id = h.player_id
    where h.deleted_at is null and not h.is_guest and not h.out_of_competition
      and not p.is_ak and not p.is_archived
      and (p_season_year is null or (p_season_year >= 2026
        and extract(year from h.attempt_date)::integer = p_season_year))
    order by occurred_at, source_priority, source_order, source_id
  loop
    if r.source_type = 'attempt' and r.event_id is not null then
      valid_count := valid_count + 1;
    end if;
    previous_total := team_total;
    old_pb := (personal_bests ->> r.player_id::text)::integer;
    if r.player_id is not null and (old_pb is null or r.time_hundredths < old_pb) then
      personal_bests := personal_bests || jsonb_build_object(r.player_id::text, r.time_hundredths);
      select count(*)::integer, coalesce(sum(t.best), 0) + (10-count(*))*500
        into player_count, team_total
      from (select value::integer best from jsonb_each_text(personal_bests)
        order by value::integer, key limit 10) t;
    end if;
    proof := jsonb_build_object('sourceId', r.source_id, 'sourceType', r.source_type,
      'occurredDate', r.occurred_date,
      'occurredAt', case when r.source_type = 'attempt' then r.occurred_at else null end,
      'eventId', r.event_id, 'eventName', r.event_name,
      'playerId', r.player_id, 'playerName', r.player_name, 'timeHundredths', r.time_hundredths);
    for m in select * from jsonb_to_recordset(p_milestones) as x(id text, kind text, threshold numeric)
      where not (crossed ? x.id) and (
        (kind = 'beer-volume' and r.source_type = 'attempt' and r.event_id is not null
          and valid_count::numeric * 0.2 >= threshold)
        or (kind = 'team-time' and team_total < previous_total and team_total <= threshold * 100))
    loop
      crossed := crossed || jsonb_build_object(m.id, true);
      crossings := crossings || jsonb_build_array(proof || jsonb_build_object(
        'milestoneId', m.id, 'improvementHundredths',
        case when m.kind = 'team-time' then previous_total-team_total else null end));
    end loop;
  end loop;
  return jsonb_build_object('seasonYear', p_season_year, 'validAttempts', valid_count,
    'teamTimeHundredths', team_total, 'playerCount', player_count,
    'placeholderCount', 10-player_count, 'targetPlayerCount', 10, 'crossings', crossings);
end;
$$;
revoke all on function public.get_team_milestones_snapshot_v2(integer,jsonb) from public;
grant execute on function public.get_team_milestones_snapshot_v2(integer,jsonb) to anon, authenticated;
