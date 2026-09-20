-- PR #59: read-only statistics. The existing closed-event rivalry and badge
-- sources are intentionally untouched. Event inputs are constrained first.
create function public.get_unified_statistics_dashboard(
  p_season_year integer default null, p_event_id uuid default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
with trophy_event as (
  select id, name, start_date, status, coalesce(closed_at, ends_at) ended_at
  from public.events
  where id = p_event_id and deleted_at is null and awards_trophies
), official as (
  select q.source_id, q.player_id, q.display_name, q.avatar_url, q.avatar_path,
    q.is_guest, q.time_hundredths, q.event_id, q.occurred_at
  from public.qualified_official_times q
  where p_event_id is null and p_season_year is null
  union all
  select q.source_id, q.player_id, q.display_name, q.avatar_url, q.avatar_path,
    q.is_guest, q.time_hundredths, q.event_id, q.occurred_at
  from public.season_qualified_official_times q
  where p_event_id is null and p_season_year is not null
    and q.season_year = p_season_year
  union all
  -- Mirror the already event-scoped Trophy Most Wanted eligibility and filter
  -- by event_id before any grouping/window work. Do not expand the global
  -- qualified_official_times view for each live refresh.
  select a.id, a.player_id, coalesce(p.display_name, g.display_name),
    p.avatar_url, p.avatar_path, a.guest_id is not null,
    a.time_hundredths, a.event_id, a.submitted_at
  from trophy_event e
  join public.attempts a on a.event_id = e.id
  left join public.players p on p.id = a.player_id
  left join public.event_guests g on g.id = a.guest_id and g.event_id = e.id
  where a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
    and ((a.player_id is not null and not p.is_ak and not p.is_archived)
      or (a.guest_id is not null and g.id is not null))
), event_attempts as (
  select a.id, a.player_id, a.event_id, a.submitted_at, a.time_hundredths,
    a.is_dnf, e.name event_name, e.start_date event_date
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id and not p.is_ak and not p.is_archived
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and (p_event_id is null or exists (
      select 1 from trophy_event t where t.id = a.event_id
    ))
    and (p_event_id is not null or p_season_year is null
      or extract(year from e.start_date)::integer = p_season_year)
    and (p_event_id is null or a.event_id = p_event_id)
), player_times as (
  select player_id, min(time_hundredths)::numeric best_time,
    count(*)::numeric official_count,
    count(*) filter (where time_hundredths < 500)::numeric sub5,
    count(*) filter (where time_hundredths < 400)::numeric sub4,
    count(*) filter (where time_hundredths < 300)::numeric sub3,
    count(*) filter (where time_hundredths < 250)::numeric sub25,
    count(*) filter (where time_hundredths < 200)::numeric sub2,
    count(*) filter (where mod(time_hundredths, 100) = 0)::numeric smooth_count
  from official where player_id is not null and not is_guest
  group by player_id
), event_player as (
  select player_id, count(*)::numeric attempt_count,
    count(*) filter (where is_dnf)::numeric dnf_count,
    count(*) filter (where not is_dnf and time_hundredths is not null)::numeric valid_count,
    round(avg(time_hundredths) filter (
      where not is_dnf and time_hundredths is not null
    ))::numeric average_time
  from event_attempts group by player_id
), event_max as (
  select distinct on (player_id) player_id, event_name, event_date,
    count(*)::numeric event_attempt_count
  from event_attempts
  group by player_id, event_id, event_name, event_date
  order by player_id, count(*) desc, event_date, event_name
), streak_grouped as (
  select a.*,
    sum(case when is_dnf or time_hundredths is null or time_hundredths >= 300
      then 1 else 0 end) over (
      partition by player_id, event_id order by submitted_at, id
      rows between unbounded preceding and current row
    ) streak_group
  from event_attempts a
), streak_runs as (
  select player_id, event_id, streak_group, count(*)::numeric length
  from streak_grouped
  where not is_dnf and time_hundredths is not null and time_hundredths < 300
  group by player_id, event_id, streak_group
), streaks as (
  select player_id, max(length) longest from streak_runs group by player_id
), exact_time_counts as (
  select time_hundredths, count(*)::numeric hits,
    count(distinct case when is_guest then concat('guest:', display_name)
      else concat('player:', player_id) end)::numeric participants,
    min(occurred_at) first_at
  from official group by time_hundredths
), common_time as (
  select * from exact_time_counts
  order by hits desc, first_at, time_hundredths limit 1
), common_players as (
  select o.player_id, count(*)::numeric hits
  from official o join common_time c using (time_hundredths)
  where o.player_id is not null and not o.is_guest group by o.player_id
), lead_closed as (
  select s.player_id, sum(s.total_lead_seconds)::numeric lead_seconds,
    sum(s.event_best_breaks)::numeric best_breaks,
    sum(s.lead_takeovers)::numeric lead_takeovers
  from public.event_lead_player_statistics_v2 s
  where p_event_id is null
    and (p_season_year is null or s.season_year = p_season_year)
  group by s.player_id
), eligible_ordered as (
  select a.*,
    min(time_hundredths) over (
      partition by event_id order by submitted_at, id
      rows between unbounded preceding and 1 preceding
    ) prior_best
  from event_attempts a
  where not is_dnf and time_hundredths is not null
), event_breaks as (
  select player_id, count(*)::numeric break_count
  from eligible_ordered
  where prior_best is not null and time_hundredths < prior_best
  group by player_id
), lead_changes as (
  select a.*,
    (select case when count(distinct prior.player_id) = 1
      then (array_agg(prior.player_id))[1] end
      from eligible_ordered prior
      where prior.event_id = a.event_id
        and (prior.submitted_at, prior.id) < (a.submitted_at, a.id)
        and prior.time_hundredths = a.prior_best) previous_player_id
  from eligible_ordered a
  where p_event_id is not null and a.prior_best is not null
    and a.time_hundredths < a.prior_best
), direct_takeovers as (
  select least(previous_player_id, player_id) player_low_id,
    greatest(previous_player_id, player_id) player_high_id,
    player_id takeover_player_id
  from lead_changes
  where previous_player_id is not null and previous_player_id <> player_id
), takeover_counts as (
  select takeover_player_id player_id, count(*)::numeric takeover_count
  from direct_takeovers group by takeover_player_id
), first_valid as (
  select player_id, min(submitted_at) first_at
  from eligible_ordered where p_event_id is not null group by player_id
), qualification as (
  select first_at qualification_at
  from first_valid order by first_at, player_id offset 2 limit 1
), initial_leader as (
  select distinct on (a.event_id) a.event_id, a.player_id,
    q.qualification_at lead_at, a.id
  from eligible_ordered a cross join qualification q
  where a.submitted_at <= q.qualification_at
  order by a.event_id, a.time_hundredths, a.submitted_at, a.id
), later_leaders as (
  select a.event_id, a.player_id, a.submitted_at lead_at, a.id
  from eligible_ordered a cross join qualification q
  where a.submitted_at > q.qualification_at and a.prior_best is not null
    and a.time_hundredths < a.prior_best
), lead_points as (
  select * from initial_leader union all select * from later_leaders
), lead_windows as (
  select point.player_id, point.lead_at,
    coalesce(lead(point.lead_at) over (
      partition by point.event_id order by point.lead_at, point.id
    ), (select max(submitted_at) from eligible_ordered)) lead_end
  from lead_points point
), lead_event as (
  select player_id,
    sum(greatest(0, extract(epoch from lead_end - lead_at)))::numeric lead_seconds,
    null::numeric best_breaks, null::numeric lead_takeovers
  from lead_windows group by player_id
), scoped_leads as (
  select * from lead_closed union all select * from lead_event
), watch_pairs as (
  select player_low_id, player_high_id, count(*)::integer direct_takeovers
  from direct_takeovers group by player_low_id, player_high_id
), historical_pairs as (
  select player_low_id, player_high_id,
    count(*) filter (where is_rivalry_event)::integer rivalry_events,
    sum(direct_takeovers) filter (where is_rivalry_event)::integer direct_takeovers
  from public.rivalry_pair_events
  where p_event_id is null
    and (p_season_year is null or extract(year from event_date)::integer = p_season_year)
  group by player_low_id, player_high_id
  having count(*) filter (where is_rivalry_event) > 0
), rivalry_pairs as (
  select player_low_id, player_high_id, rivalry_events, direct_takeovers,
    false live_watch from historical_pairs
  union all
  select player_low_id, player_high_id, 0, direct_takeovers, true
  from watch_pairs
), rivalry_players as (
  select player_id, sum(rivalry_events)::numeric rivalry_events,
    sum(direct_takeovers)::numeric direct_takeovers
  from (
    select player_low_id player_id, rivalry_events, direct_takeovers from historical_pairs
    union all
    select player_high_id, rivalry_events, direct_takeovers from historical_pairs
  ) oriented group by player_id
), player_keys as (
  select player_id from player_times union select player_id from event_player
  union select player_id from scoped_leads union select player_id from rivalry_players
), players as (
  select p.id player_id, p.display_name, p.avatar_url, p.avatar_path,
    t.best_time, t.official_count, t.sub5, t.sub4, t.sub3, t.sub25, t.sub2,
    t.smooth_count, e.attempt_count, e.dnf_count, e.valid_count, e.average_time,
    m.event_attempt_count, m.event_name, m.event_date, s.longest,
    c.hits common_hits,
    coalesce(l.lead_seconds, 0)::numeric lead_seconds,
    coalesce(b.break_count, l.best_breaks, 0)::numeric best_breaks,
    coalesce(tc.takeover_count, l.lead_takeovers, 0)::numeric lead_takeovers,
    coalesce(r.rivalry_events, 0)::numeric rivalry_events,
    coalesce(r.direct_takeovers, 0)::numeric rivalry_takeovers
  from player_keys k join public.players p on p.id = k.player_id
  left join player_times t on t.player_id = k.player_id
  left join event_player e on e.player_id = k.player_id
  left join event_max m on m.player_id = k.player_id
  left join streaks s on s.player_id = k.player_id
  left join common_players c on c.player_id = k.player_id
  left join scoped_leads l on l.player_id = k.player_id
  left join event_breaks b on b.player_id = k.player_id and p_event_id is not null
  left join takeover_counts tc on tc.player_id = k.player_id
  left join rivalry_players r on r.player_id = k.player_id
  where not p.is_ak and not p.is_archived
), metric_values as (
  select 'fastest'::text key, player_id, best_time value, null::numeric hit_count,
    null::numeric sample_count, null::text detail from players where best_time is not null
  union all select 'valid', player_id, valid_count, null, null, null
    from players where valid_count > 0
  union all select 'average', player_id, average_time, valid_count, null, null
    from players where valid_count >= 3 and average_time is not null
  union all select 'dnf', player_id,
    dnf_count / nullif(attempt_count, 0) * 100, dnf_count, attempt_count, null
    from players where attempt_count >= 5
  union all select 'sub5', player_id, sub5 / official_count * 100, sub5, official_count, null
    from players where official_count > 0
  union all select 'sub4', player_id, sub4 / official_count * 100, sub4, official_count, null
    from players where official_count > 0
  union all select 'sub3', player_id, sub3 / official_count * 100, sub3, official_count, null
    from players where official_count > 0
  union all select 'sub25', player_id, sub25 / official_count * 100, sub25, official_count, null
    from players where official_count > 0
  union all select 'sub2', player_id, sub2 / official_count * 100, sub2, official_count, null
    from players where official_count > 0
  union all select 'streak', player_id, longest, null, null, null
    from players where longest > 0
  union all select 'smooth', player_id, smooth_count, null, null, null
    from players where smooth_count > 0
  union all select 'common', player_id, common_hits, null, null, null
    from players where common_hits > 0
  union all select 'event-max', player_id, event_attempt_count, null, null,
    concat(event_name, ' · ', event_date)::text from players where event_attempt_count > 0
  union all select 'lead-time', player_id, lead_seconds, null, null, null
    from players where lead_seconds > 0
  union all select 'event-breaks', player_id, best_breaks, null, null, null
    from players where best_breaks > 0
  union all select 'takeovers', player_id, lead_takeovers, null, null, null
    from players where lead_takeovers > 0
  union all select 'rivalry-events', player_id, rivalry_events, null, null, null
    from players where rivalry_events > 0 and p_event_id is null
  union all select 'rivalry-takeovers', player_id, rivalry_takeovers, null, null, null
    from players where rivalry_takeovers > 0 and p_event_id is null
), ranked as (
  select m.*, p.display_name, p.avatar_url, p.avatar_path,
    rank() over (partition by m.key order by
      case when m.key in ('fastest', 'average', 'dnf') then -m.value
        else m.value end desc) placement,
    row_number() over (partition by m.key order by
      case when m.key in ('fastest', 'average', 'dnf') then -m.value
        else m.value end desc, p.display_name, m.player_id) display_position
  from metric_values m join players p using (player_id)
), totals as (
  select count(*)::numeric official_count,
    min(time_hundredths) filter (
      where p_event_id is not null or (player_id is not null and not is_guest)
    )::numeric fastest,
    count(*) filter (where time_hundredths < 500)::numeric sub5,
    count(*) filter (where time_hundredths < 400)::numeric sub4,
    count(*) filter (where time_hundredths < 300)::numeric sub3,
    count(*) filter (where time_hundredths < 250)::numeric sub25,
    count(*) filter (where time_hundredths < 200)::numeric sub2,
    count(*) filter (where mod(time_hundredths, 100) = 0)::numeric smooth
  from official
), event_totals as (
  select count(*)::numeric attempts,
    count(*) filter (where is_dnf)::numeric dnf,
    count(*) filter (where not is_dnf and time_hundredths is not null)::numeric valid,
    round(avg(time_hundredths) filter (
      where not is_dnf and time_hundredths is not null
    ))::numeric average_time
  from event_attempts
), baseline as (
  -- Existing canonical basic-stat totals stay the source of truth for the
  -- league and season; event totals use the same scoped attempt population.
  select g.valid_attempts::numeric valid, g.dnf_count::numeric dnf,
    (g.valid_attempts + g.dnf_count)::numeric attempts,
    g.average_hundredths::numeric average_time
  from public.global_statistics g
  where p_event_id is null and p_season_year is null
  union all
  select s.valid_attempts::numeric, s.dnf_count::numeric,
    (s.valid_attempts + s.dnf_count)::numeric,
    s.average_hundredths::numeric
  from public.season_global_statistics s
  where p_event_id is null and s.season_year = p_season_year
  union all
  select e.valid, e.dnf, e.attempts, e.average_time
  from event_totals e where p_event_id is not null
  union all
  select e.valid, e.dnf, e.attempts, e.average_time
  from event_totals e
  where p_event_id is null and p_season_year is not null
    and not exists (select 1 from public.season_global_statistics s
      where s.season_year = p_season_year)
), summary as (
  select key, value, hit_count, sample_count, detail from (
    select 'fastest'::text key, t.fastest value, null::numeric hit_count,
      null::numeric sample_count, null::text detail from totals t
    union all select 'valid', e.valid, null, null, null from baseline e
    union all select 'average', e.average_time, null, null, null from baseline e
    union all select 'dnf', round(e.dnf / nullif(e.attempts, 0) * 100, 1),
      e.dnf, e.attempts, null from baseline e
    union all select 'sub5', round(t.sub5 / nullif(t.official_count, 0) * 100, 1), t.sub5, t.official_count, null from totals t
    union all select 'sub4', round(t.sub4 / nullif(t.official_count, 0) * 100, 1), t.sub4, t.official_count, null from totals t
    union all select 'sub3', round(t.sub3 / nullif(t.official_count, 0) * 100, 1), t.sub3, t.official_count, null from totals t
    union all select 'sub25', round(t.sub25 / nullif(t.official_count, 0) * 100, 1), t.sub25, t.official_count, null from totals t
    union all select 'sub2', round(t.sub2 / nullif(t.official_count, 0) * 100, 1), t.sub2, t.official_count, null from totals t
    union all select 'streak', max(longest), null, null, null from players
    union all select 'smooth', t.smooth, null, null, null from totals t
    union all select 'common', c.time_hundredths, c.hits, c.participants,
      'Treffer / Teilnehmer'::text from common_time c
    union all select 'event-max', max(event_attempt_count), null, null, null from players
    union all select 'lead-time', sum(lead_seconds), null, null, null from players
    union all select 'event-breaks', sum(best_breaks), null, null, null from players
    union all select 'takeovers', sum(lead_takeovers), null, null, null from players
    union all select 'rivalry-events', (select sum(rivalry_events) from historical_pairs), null, null, null
    union all select 'rivalry-takeovers', (select sum(direct_takeovers) from historical_pairs), null, null, null
  ) metric_summary
)
select case when p_event_id is not null and not exists (select 1 from trophy_event)
  then null else jsonb_build_object(
    'metrics', coalesce((select jsonb_agg(jsonb_build_object(
      'key', s.key, 'overallValue', s.value,
      'overallCount', s.hit_count, 'overallTotal', s.sample_count,
      'overallDetail', s.detail,
      'rankings', coalesce((select jsonb_agg(jsonb_build_object(
        'rank', r.placement, 'playerId', r.player_id,
        'name', r.display_name, 'avatarUrl', r.avatar_url,
        'avatarPath', r.avatar_path, 'value', r.value,
        'count', r.hit_count, 'total', r.sample_count, 'detail', r.detail
      ) order by r.display_position)
      from ranked r where r.key = s.key and r.display_position <= 10), '[]'::jsonb)
    ) order by s.key) from summary s), '[]'::jsonb),
    'rivalryPairs', coalesce((select jsonb_agg(jsonb_build_object(
      'playerLowId', pair.player_low_id,
      'playerHighId', pair.player_high_id,
      'playerLowName', low.display_name,
      'playerHighName', high.display_name,
      'rivalryEvents', pair.rivalry_events,
      'directTakeovers', pair.direct_takeovers,
      'levelReached', pair.live_watch and pair.direct_takeovers >= 3
    ) order by pair.direct_takeovers desc, pair.player_low_id, pair.player_high_id)
    from rivalry_pairs pair
    join public.players low on low.id = pair.player_low_id
    join public.players high on high.id = pair.player_high_id), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.get_unified_statistics_dashboard(integer, uuid) from public;
grant execute on function public.get_unified_statistics_dashboard(integer, uuid)
  to anon, authenticated;

-- Preserve the existing Trophy payload and expose the new event-scoped cards
-- in one client round-trip. Neither function writes data.
create function public.get_trophy_event_dashboard(p_event_id uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
  select case when special is null then null else jsonb_build_object(
    'special', special,
    'dashboard', public.get_unified_statistics_dashboard(null, p_event_id)
  ) end
  from (select public.get_trophy_event_special_stats(p_event_id) special) existing;
$$;

revoke all on function public.get_trophy_event_dashboard(uuid) from public;
grant execute on function public.get_trophy_event_dashboard(uuid) to anon, authenticated;
