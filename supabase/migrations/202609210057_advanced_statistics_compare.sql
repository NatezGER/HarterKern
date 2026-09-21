-- PR #60: advanced read-only statistics and pair-scoped compare bundle.
-- Migration 056 is already deployed and remains untouched. Preserve its
-- implementation under a versioned private-facing name, then expose the
-- compatible public signature as a composed wrapper.
alter function public.get_unified_statistics_dashboard(integer, uuid)
  rename to get_unified_statistics_dashboard_v56;

create function public.get_advanced_statistic_player_metrics(
  p_player_ids uuid[] default null,
  p_season_year integer default null,
  p_event_id uuid default null
) returns table (
  metric_key text, player_id uuid, value numeric,
  hit_count numeric, sample_count numeric, detail text
)
language sql stable security invoker set search_path = public as $$
with requested as materialized (
  select distinct unnest(p_player_ids) player_id
  where p_player_ids is not null
), trophy_event as materialized (
  select id from public.events
  where id = p_event_id and deleted_at is null and awards_trophies
), official as materialized (
  select q.source_id, q.player_id, q.time_hundredths, q.event_id, q.occurred_at
  from public.qualified_official_times q
  where p_event_id is null and p_season_year is null
    and q.player_id is not null and not q.is_guest
    and (p_player_ids is null or q.player_id = any(p_player_ids))
  union all
  select q.source_id, q.player_id, q.time_hundredths, q.event_id, q.occurred_at
  from public.season_qualified_official_times q
  where p_event_id is null and p_season_year is not null
    and q.season_year = p_season_year and q.player_id is not null and not q.is_guest
    and (p_player_ids is null or q.player_id = any(p_player_ids))
  union all
  select a.id, a.player_id, a.time_hundredths, a.event_id, a.submitted_at
  from trophy_event e
  join public.attempts a on a.event_id = e.id
  join public.players p on p.id = a.player_id and not p.is_ak and not p.is_archived
  where a.status = 'approved' and a.deleted_at is null and not a.is_dnf
    and not a.is_ak and a.time_hundredths is not null
    and (p_player_ids is null or a.player_id = any(p_player_ids))
), event_attempts as materialized (
  select a.id, a.player_id, a.event_id, a.submitted_at, a.time_hundredths,
    a.is_dnf, e.name event_name, e.start_date event_date
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id and not p.is_ak and not p.is_archived
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
    and (p_player_ids is null or a.player_id = any(p_player_ids))
    and (p_event_id is null or a.event_id = p_event_id)
    and (p_event_id is null or exists (select 1 from trophy_event))
    and (p_event_id is not null or p_season_year is null
      or extract(year from e.start_date)::integer = p_season_year)
), ordered_attempts as (
  select a.*,
    row_number() over (partition by player_id, event_id order by submitted_at, id)::integer attempt_number,
    count(*) over (partition by player_id, event_id)::integer event_attempt_count,
    min(time_hundredths) filter (where not is_dnf and time_hundredths is not null)
      over (partition by player_id, event_id)::numeric final_event_pb,
    min(time_hundredths) filter (where not is_dnf and time_hundredths is not null)
      over (partition by player_id, event_id order by submitted_at, id
        rows between unbounded preceding and 1 preceding)::numeric prior_player_pb,
    lag(time_hundredths) over (partition by player_id, event_id order by submitted_at, id) previous_time,
    lag(is_dnf or time_hundredths is null) over (partition by player_id, event_id order by submitted_at, id) previous_invalid
  from event_attempts a
), official_ranked as (
  select o.*, row_number() over (
    partition by player_id order by time_hundredths, occurred_at, source_id
  ) fastest_number
  from official o
), official_player as (
  select player_id, min(time_hundredths)::numeric best_time,
    count(*)::numeric valid_count, round(avg(time_hundredths))::numeric average_time,
    percentile_cont(0.5) within group (order by time_hundredths)::numeric median_time,
    stddev_pop(time_hundredths)::numeric deviation,
    count(*) filter (where time_hundredths < 500)::numeric sub5,
    count(*) filter (where time_hundredths < 400)::numeric sub4,
    count(*) filter (where time_hundredths < 300)::numeric sub3,
    count(*) filter (where time_hundredths < 250)::numeric sub25,
    count(*) filter (where time_hundredths < 200)::numeric sub2
  from official group by player_id
), fastest_five as (
  select player_id, round(avg(time_hundredths))::numeric fastest_five
  from official_ranked where fastest_number <= 5 group by player_id having count(*) = 5
), attempt_player as (
  select player_id, count(*)::numeric attempt_count,
    count(*) filter (where is_dnf)::numeric dnf_count,
    count(*) filter (where not is_dnf and time_hundredths is not null)::numeric valid_count,
    count(distinct event_id)::numeric event_participations
  from event_attempts group by player_id
), event_max as (
  select distinct on (player_id) player_id, count(*)::numeric event_attempt_count,
    event_name, event_date
  from event_attempts group by player_id, event_id, event_name, event_date
  order by player_id, count(*) desc, event_date, event_name
), five_windows as (
  select player_id, event_id, attempt_number,
    count(*) over window5 window_size,
    count(time_hundredths) filter (where not is_dnf) over window5 valid_size,
    avg(time_hundredths) filter (where not is_dnf) over window5 window_average
  from ordered_attempts
  window window5 as (partition by player_id, event_id order by attempt_number rows between 4 preceding and current row)
), best_windows as (
  select player_id, round(min(window_average))::numeric best_window
  from five_windows where window_size = 5 and valid_size = 5 group by player_id
), event_features as (
  select player_id, event_id, max(event_attempt_count)::numeric attempt_count,
    max(time_hundredths) filter (where attempt_number = 1 and not is_dnf and time_hundredths is not null)::numeric first_time,
    max(final_event_pb)::numeric final_pb,
    min(attempt_number) filter (where not is_dnf and time_hundredths = final_event_pb)::numeric first_final_pb_number,
    bool_or(attempt_number > event_attempt_count - 2 and not is_dnf
      and time_hundredths = final_event_pb and prior_player_pb is not null
      and time_hundredths < prior_player_pb) clutch
  from ordered_attempts group by player_id, event_id
), event_player_features as (
  select player_id,
    percentile_cont(0.5) within group (order by first_time - final_pb)
      filter (where attempt_count >= 3 and first_time is not null)::numeric fast_starter,
    count(*) filter (where attempt_count >= 3 and first_time is not null)::numeric fast_starter_events,
    count(*) filter (where attempt_count >= 4 and first_final_pb_number > attempt_count / 2.0)::numeric late_events,
    count(*) filter (where attempt_count >= 4)::numeric late_total,
    count(*) filter (where attempt_count >= 3 and clutch)::numeric clutch_events,
    count(*) filter (where attempt_count >= 3)::numeric clutch_total,
    count(*) filter (where attempt_count >= 3 and first_time is not null and first_time = final_pb)::numeric one_shot_events,
    count(*) filter (where attempt_count >= 3 and first_time is not null)::numeric one_shot_total,
    min(first_time) filter (where first_time is not null)::numeric fastest_first
  from event_features group by player_id
), near_repeat as (
  select player_id,
    count(*) filter (where not is_dnf and time_hundredths is not null
      and previous_time is not null and not coalesce(previous_invalid, true)
      and abs(time_hundredths - previous_time) <= 5)::numeric hits,
    count(*) filter (where not is_dnf and time_hundredths is not null
      and previous_time is not null and not coalesce(previous_invalid, true))::numeric pairs
  from ordered_attempts group by player_id
), streak_marked as (
  select a.*, sum(case when is_dnf or time_hundredths is null or time_hundredths >= 300
    then 1 else 0 end) over (partition by player_id, event_id order by submitted_at, id) streak_group
  from event_attempts a
), streaks as (
  select player_id, max(run_length)::numeric longest from (
    select player_id, event_id, streak_group, count(*) run_length
    from streak_marked where not is_dnf and time_hundredths < 300
    group by player_id, event_id, streak_group
  ) runs group by player_id
), bingo_scope as materialized (
  select q.player_id, mod(q.time_hundredths, 100)::integer ending
  from public.qualified_official_times q
  where p_event_id is null and p_season_year is null and q.player_id is not null and not q.is_guest
  union all
  select q.player_id, mod(q.time_hundredths, 100)::integer
  from public.season_qualified_official_times q
  where p_event_id is null and p_season_year is not null and q.season_year = p_season_year
    and q.player_id is not null and not q.is_guest
  union all
  select a.player_id, mod(a.time_hundredths, 100)::integer
  from trophy_event e join public.attempts a on a.event_id = e.id
  join public.players p on p.id = a.player_id and not p.is_ak and not p.is_archived
  where a.status = 'approved' and a.deleted_at is null and not a.is_dnf
    and not a.is_ak and a.time_hundredths is not null
), ending_popularity as (
  select ending, count(distinct player_id)::numeric players from bingo_scope group by ending
), bingo_player as (
  select b.player_id, count(distinct b.ending)::numeric fields,
    count(distinct b.ending) filter (where popularity.players <= 3)::numeric rare_fields
  from bingo_scope b join ending_popularity popularity using (ending)
  where p_player_ids is null or b.player_id = any(p_player_ids)
  group by b.player_id
), pb_ordered as (
  select o.*, min(time_hundredths) over (partition by player_id order by occurred_at, source_id
    rows between unbounded preceding and 1 preceding) previous_best
  from official o
), pb_records as (
  select *, lag(time_hundredths) over (partition by player_id order by occurred_at, source_id) previous_record
  from pb_ordered where previous_best is null or time_hundredths < previous_best
), pb_jumps as (
  select player_id, max(previous_record - time_hundredths)::numeric jump,
    count(*)::numeric record_count from pb_records group by player_id
), family_maximums as (
  select ledger.player_id, definitions.family_key,
    max(case definitions.tier when 'bronze' then 1 when 'silver' then 2
      when 'gold' then 3 when 'diamond' then 4 else 0 end)::numeric tier_rank
  from public.player_badge_award_ledger ledger
  join public.badge_definitions definitions on definitions.badge_key = ledger.badge_key
  where p_event_id is null and (p_season_year is null or p_player_ids is not null) and definitions.is_active
    and definitions.design_variant = 'standard' and definitions.family_key is not null
    and (p_player_ids is null or ledger.player_id = any(p_player_ids))
  group by ledger.player_id, definitions.family_key
), badge_ladder as (
  select player_id, count(*)::numeric family_total,
    count(*) filter (where tier_rank >= 1)::numeric bronze,
    count(*) filter (where tier_rank >= 2)::numeric silver,
    count(*) filter (where tier_rank >= 3)::numeric gold,
    count(*) filter (where tier_rank >= 4)::numeric diamond
  from family_maximums group by player_id
), badge_specials as (
  select ledger.player_id,
    count(distinct ledger.badge_key) filter (where definitions.design_variant = 'positive_special')::numeric positive,
    count(distinct ledger.badge_key) filter (where definitions.design_variant = 'consolation')::numeric consolation
  from public.player_badge_award_ledger ledger
  join public.badge_definitions definitions on definitions.badge_key = ledger.badge_key
  where p_event_id is null and (p_season_year is null or p_player_ids is not null) and definitions.is_active
    and definitions.design_variant in ('positive_special', 'consolation')
    and (p_player_ids is null or ledger.player_id = any(p_player_ids))
  group by ledger.player_id
), badge_population as (
  select player_id from badge_ladder union select player_id from badge_specials
  union select player_id from requested where p_player_ids is not null
), badge_counts as (
  select population.player_id, coalesce(ladder.family_total, 0)::numeric family_total,
    coalesce(ladder.bronze, 0)::numeric bronze, coalesce(ladder.silver, 0)::numeric silver,
    coalesce(ladder.gold, 0)::numeric gold, coalesce(ladder.diamond, 0)::numeric diamond,
    coalesce(specials.positive, 0)::numeric positive,
    coalesce(specials.consolation, 0)::numeric consolation
  from badge_population population
  left join badge_ladder ladder using (player_id)
  left join badge_specials specials using (player_id)
), wr_source as (
  select h.player_id, h.duration_days::numeric duration_days,
    h.improvement_hundredths::numeric improvement
  from public.world_record_history h
  where p_event_id is null and p_season_year is null
    and (p_player_ids is null or h.player_id = any(p_player_ids))
  union all
  select h.player_id,
    greatest(0, least(coalesce(h.period_end_date, make_date(p_season_year + 1, 1, 1)),
      make_date(p_season_year + 1, 1, 1)) - h.achieved_date)::numeric,
    h.improvement_hundredths::numeric
  from public.season_world_record_history h
  where p_event_id is null and p_season_year is not null and h.season_year = p_season_year
    and (p_player_ids is null or h.player_id = any(p_player_ids))
), wr_player as (
  select player_id, max(duration_days)::numeric reign,
    count(*) filter (where improvement > 0)::numeric improvements,
    max(improvement) filter (where improvement > 0)::numeric jump
  from wr_source group by player_id
), chaos as (
  select participant player_id, count(*)::numeric changes from (
    select previous_player_id participant, event_id from public.event_direct_lead_takeovers
    union all select takeover_player_id, event_id from public.event_direct_lead_takeovers
  ) involved join public.events e on e.id = involved.event_id
  where p_event_id is null and (p_season_year is null or extract(year from e.start_date)::integer = p_season_year)
    and (p_player_ids is null or participant = any(p_player_ids))
  group by participant
), direct_duels as (
  select own.player_id, opponent.player_id opponent_id,
    count(*) filter (where own.rank <> opponent.rank)::numeric decided,
    count(*) filter (where own.rank < opponent.rank)::numeric wins,
    count(*) filter (where own.rank > opponent.rank)::numeric losses
  from public.event_final_standings own
  join public.event_final_standings opponent on opponent.event_id = own.event_id
    and opponent.player_id is not null and opponent.player_id <> own.player_id
    and opponent.best_time_hundredths is not null and not opponent.is_ak
  join public.events e on e.id = own.event_id and e.status = 'closed' and e.deleted_at is null
  where p_event_id is null and own.player_id is not null
    and own.best_time_hundredths is not null and not own.is_ak
    and (p_player_ids is null or own.player_id = any(p_player_ids))
    and (p_season_year is null or extract(year from e.start_date)::integer = p_season_year)
  group by own.player_id, opponent.player_id
), nemesis as (
  select distinct on (duels.player_id) duels.player_id, duels.losses, duels.decided,
    opponent.display_name
  from direct_duels duels join public.players opponent on opponent.id = duels.opponent_id
  where duels.decided >= 3
  order by duels.player_id, duels.losses desc, duels.decided desc, opponent.display_name, duels.opponent_id
), favorite as (
  select distinct on (duels.player_id) duels.player_id, duels.wins, duels.decided,
    opponent.display_name
  from direct_duels duels join public.players opponent on opponent.id = duels.opponent_id
  where duels.decided >= 3
  order by duels.player_id, duels.wins desc, duels.decided desc, opponent.display_name, duels.opponent_id
)
select 'fastest'::text, player_id::uuid, best_time::numeric,
  null::numeric, valid_count::numeric, null::text
from official_player
union all select 'average'::text, player_id::uuid, average_time::numeric,
  null::numeric, valid_count::numeric, null::text
from official_player where valid_count >= 3
union all select 'median'::text, player_id::uuid, median_time::numeric,
  null::numeric, valid_count::numeric, null::text
from official_player where valid_count >= 3
union all select 'fastest-five'::text, player_id::uuid, fastest_five::numeric,
  null::numeric, 5::numeric, null::text
from fastest_five
union all select 'best-five-window'::text, player_id::uuid, best_window::numeric,
  null::numeric, 5::numeric, null::text
from best_windows
union all select 'consistency'::text, player_id::uuid,
  round(deviation / nullif(average_time, 0) * 100, 3)::numeric,
  deviation::numeric, valid_count::numeric,
  concat('σ ', round(deviation, 1), ' · Ø ', average_time)::text
from official_player where valid_count >= 5
union all select 'valid'::text, player_id::uuid, valid_count::numeric,
  null::numeric, valid_count::numeric, null::text
from attempt_player where valid_count > 0
union all select 'sub5'::text, player_id::uuid,
  (sub5 / valid_count * 100)::numeric, sub5::numeric, valid_count::numeric, null::text
from official_player where sub5 > 0
union all select 'sub4'::text, player_id::uuid,
  (sub4 / valid_count * 100)::numeric, sub4::numeric, valid_count::numeric, null::text
from official_player where sub4 > 0
union all select 'sub3'::text, player_id::uuid,
  (sub3 / valid_count * 100)::numeric, sub3::numeric, valid_count::numeric, null::text
from official_player where sub3 > 0
union all select 'sub25'::text, player_id::uuid,
  (sub25 / valid_count * 100)::numeric, sub25::numeric, valid_count::numeric, null::text
from official_player where sub25 > 0
union all select 'sub2'::text, player_id::uuid,
  (sub2 / valid_count * 100)::numeric, sub2::numeric, valid_count::numeric, null::text
from official_player where sub2 > 0
union all select 'dnf'::text, player_id::uuid,
  (dnf_count / nullif(attempt_count, 0) * 100)::numeric,
  dnf_count::numeric, attempt_count::numeric, null::text
from attempt_player where attempt_count >= 5
union all select 'event-participations'::text, player_id::uuid,
  event_participations::numeric, null::numeric, event_participations::numeric, null::text
from attempt_player
union all select 'event-max'::text, player_id::uuid, event_attempt_count::numeric,
  null::numeric, event_attempt_count::numeric,
  concat(event_name, ' · ', event_date)::text
from event_max
union all select 'streak'::text, player_id::uuid, longest::numeric,
  null::numeric, longest::numeric, null::text
from streaks where longest > 0
union all select 'fastest-first'::text, player_id::uuid, fastest_first::numeric,
  null::numeric, fast_starter_events::numeric, null::text
from event_player_features where fastest_first is not null
union all select 'fast-starter'::text, player_id::uuid, fast_starter::numeric,
  null::numeric, fast_starter_events::numeric, null::text
from event_player_features
where fast_starter_events >= case when p_event_id is null then 3 else 1 end
union all select 'late-bloomer'::text, player_id::uuid,
  (late_events / nullif(late_total, 0) * 100)::numeric,
  late_events::numeric, late_total::numeric, null::text
from event_player_features
where late_total >= case when p_event_id is null then 3 else 1 end
union all select 'clutch'::text, player_id::uuid,
  (clutch_events / nullif(clutch_total, 0) * 100)::numeric,
  clutch_events::numeric, clutch_total::numeric, null::text
from event_player_features
where clutch_total >= case when p_event_id is null then 3 else 1 end
union all select 'one-shot'::text, player_id::uuid,
  (one_shot_events / nullif(one_shot_total, 0) * 100)::numeric,
  one_shot_events::numeric, one_shot_total::numeric, null::text
from event_player_features
where one_shot_total >= case when p_event_id is null then 3 else 1 end
union all select 'near-repeat'::text, player_id::uuid,
  (hits / nullif(pairs, 0) * 100)::numeric,
  hits::numeric, pairs::numeric, null::text
from near_repeat where pairs >= 5
union all select 'bingo-fields'::text, player_id::uuid, fields::numeric,
  fields::numeric, 100::numeric, null::text
from bingo_player where fields > 0
union all select 'rare-hunter'::text, player_id::uuid, rare_fields::numeric,
  rare_fields::numeric, fields::numeric, null::text
from bingo_player where p_event_id is null and rare_fields > 0
union all select 'pb-jump'::text, player_id::uuid, jump::numeric,
  null::numeric, record_count::numeric, null::text
from pb_jumps
where p_event_id is null and record_count >= 2 and jump is not null
union all select 'badge-total'::text, player_id::uuid,
  (family_total + positive + consolation)::numeric,
  null::numeric, null::numeric, null::text
from badge_counts
where family_total + positive + consolation > 0 or p_player_ids is not null
union all select 'badge-bronze'::text, player_id::uuid, bronze::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where bronze > 0 or p_player_ids is not null
union all select 'badge-silver'::text, player_id::uuid, silver::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where silver > 0 or p_player_ids is not null
union all select 'badge-gold'::text, player_id::uuid, gold::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where gold > 0 or p_player_ids is not null
union all select 'badge-diamond'::text, player_id::uuid, diamond::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where diamond > 0 or p_player_ids is not null
union all select 'badge-positive'::text, player_id::uuid, positive::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where positive > 0 or p_player_ids is not null
union all select 'badge-consolation'::text, player_id::uuid, consolation::numeric,
  null::numeric, null::numeric, null::text
from badge_counts where consolation > 0 or p_player_ids is not null
union all select 'wr-reign'::text, player_id::uuid, reign::numeric,
  null::numeric, null::numeric, null::text
from wr_player where reign > 0
union all select 'wr-improvements'::text, player_id::uuid, improvements::numeric,
  null::numeric, null::numeric, null::text
from wr_player where improvements > 0
union all select 'wr-jump'::text, player_id::uuid, jump::numeric,
  null::numeric, null::numeric, null::text
from wr_player where jump > 0
union all select 'chaos-magnet'::text, player_id::uuid, changes::numeric,
  null::numeric, null::numeric, null::text
from chaos where changes > 0
union all select 'nemesis'::text, player_id::uuid, losses::numeric,
  losses::numeric, decided::numeric, display_name::text
from nemesis where losses > 0
union all select 'favorite-opponent'::text, player_id::uuid, wins::numeric,
  wins::numeric, decided::numeric, display_name::text
from favorite where wins > 0;
$$;

revoke all on function public.get_advanced_statistic_player_metrics(uuid[], integer, uuid) from public;
grant execute on function public.get_advanced_statistic_player_metrics(uuid[], integer, uuid) to anon, authenticated;

create function public.get_advanced_statistics_dashboard(
  p_season_year integer default null, p_event_id uuid default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
with metrics as materialized (
  select * from public.get_advanced_statistic_player_metrics(null, p_season_year, p_event_id)
  where metric_key in ('median', 'fastest-five', 'best-five-window', 'consistency',
    'event-participations', 'fastest-first', 'fast-starter', 'late-bloomer', 'clutch',
    'one-shot', 'near-repeat', 'bingo-fields', 'rare-hunter', 'pb-jump',
    'badge-total', 'badge-bronze', 'badge-silver', 'badge-gold', 'badge-diamond',
    'badge-positive', 'badge-consolation', 'wr-reign', 'wr-improvements', 'wr-jump', 'chaos-magnet')
), ranked as (
  select m.*, p.display_name, p.avatar_url, p.avatar_path,
    rank() over (partition by metric_key order by
      case when metric_key in ('median', 'fastest-five', 'best-five-window', 'consistency', 'fastest-first', 'fast-starter') then -value else value end desc) placement,
    row_number() over (partition by metric_key order by
      case when metric_key in ('median', 'fastest-five', 'best-five-window', 'consistency', 'fastest-first', 'fast-starter') then -value else value end desc,
      sample_count desc nulls last, p.display_name, player_id) display_position
  from metrics m join public.players p on p.id = m.player_id
), keys as (select distinct metric_key from metrics), summary as (
  select metric_key, round(avg(value), 2)::numeric value,
    sum(hit_count)::numeric hit_count, sum(sample_count)::numeric sample_count,
    'Ø der qualifizierten Spieler'::text detail
  from metrics group by metric_key
)
select jsonb_build_object('metrics', coalesce((select jsonb_agg(jsonb_build_object(
  'key', s.metric_key, 'overallValue', s.value, 'overallCount', s.hit_count,
  'overallTotal', s.sample_count, 'overallDetail', s.detail,
  'rankings', coalesce((select jsonb_agg(jsonb_build_object(
    'rank', r.placement, 'playerId', r.player_id, 'name', r.display_name,
    'avatarUrl', r.avatar_url, 'avatarPath', r.avatar_path, 'value', r.value,
    'count', r.hit_count, 'total', r.sample_count, 'detail', r.detail
  ) order by r.display_position) from ranked r
    where r.metric_key = s.metric_key and r.display_position <= 10), '[]'::jsonb)
) order by s.metric_key) from summary s), '[]'::jsonb));
$$;

revoke all on function public.get_advanced_statistics_dashboard(integer, uuid) from public;
grant execute on function public.get_advanced_statistics_dashboard(integer, uuid) to anon, authenticated;

create function public.get_advanced_rivalry_pair_rankings(p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path = public as $$
with scoped as materialized (
  select r.* from public.rivalry_pair_events r
  where p_season_year is null or extract(year from r.event_date)::integer = p_season_year
), pair_rollup as (
  select player_low_id, player_high_id, count(*)::numeric common_events,
    count(*) filter (where is_rivalry_event)::numeric rivalry_events,
    coalesce(sum(direct_takeovers), 0)::numeric direct_takeovers,
    greatest(0, max(event_date) filter (where is_rivalry_event)
      - min(event_date) filter (where is_rivalry_event))::numeric span_days
  from scoped group by player_low_id, player_high_id
), duels as (
  select s.player_low_id, s.player_high_id,
    count(*) filter (where low.rank <> high.rank)::numeric decided,
    count(*) filter (where low.rank < high.rank)::numeric low_wins,
    count(*) filter (where high.rank < low.rank)::numeric high_wins
  from scoped s
  join public.event_final_standings low on low.event_id = s.event_id and low.player_id = s.player_low_id
  join public.event_final_standings high on high.event_id = s.event_id and high.player_id = s.player_high_id
  where low.rank is not null and high.rank is not null
  group by s.player_low_id, s.player_high_id
)
select coalesce(jsonb_agg(jsonb_build_object(
  'playerLowId', pairs.player_low_id, 'playerHighId', pairs.player_high_id,
  'playerLowName', low.display_name, 'playerHighName', high.display_name,
  'rivalryEvents', pairs.rivalry_events, 'directTakeovers', pairs.direct_takeovers,
  'commonEvents', pairs.common_events,
  'intensityPercent', case when pairs.common_events >= 3 then round(pairs.direct_takeovers / pairs.common_events * 100, 1) end,
  'spanDays', case when pairs.rivalry_events >= 2 then pairs.span_days end,
  'balancePercent', case when duels.decided >= 3 then round(abs(duels.low_wins - duels.high_wins) / duels.decided * 100, 1) end,
  'levelReached', false
) order by pairs.direct_takeovers desc, pairs.common_events desc, pairs.player_low_id, pairs.player_high_id), '[]'::jsonb)
from pair_rollup pairs
join public.players low on low.id = pairs.player_low_id
join public.players high on high.id = pairs.player_high_id
left join duels using (player_low_id, player_high_id)
where pairs.common_events >= 2;
$$;

revoke all on function public.get_advanced_rivalry_pair_rankings(integer) from public;
grant execute on function public.get_advanced_rivalry_pair_rankings(integer) to anon, authenticated;

create function public.get_unified_statistics_dashboard(
  p_season_year integer default null, p_event_id uuid default null
) returns jsonb
language sql stable security invoker set search_path = public as $$
with baseline as (
  select public.get_unified_statistics_dashboard_v56(p_season_year, p_event_id) payload
), advanced as (
  select public.get_advanced_statistics_dashboard(p_season_year, p_event_id) payload
), normalized_baseline_metrics as (
  select jsonb_set(metric, '{rankings}', coalesce((select jsonb_agg(entry order by
      case when metric->>'key' in ('fastest', 'average', 'dnf') then (entry->>'value')::numeric end asc,
      case when metric->>'key' not in ('fastest', 'average', 'dnf') then (entry->>'value')::numeric end desc,
      (entry->>'total')::numeric desc nulls last, entry->>'name', entry->>'playerId')
    from jsonb_array_elements(metric->'rankings') entry
    where metric->>'key' not in ('sub5', 'sub4', 'sub3', 'sub25', 'sub2')
      or coalesce((entry->>'count')::numeric, 0) > 0), '[]'::jsonb)) metric
  from baseline, jsonb_array_elements(coalesce(payload->'metrics', '[]'::jsonb)) metric
)
select case when baseline.payload is null then null else jsonb_build_object(
  'metrics', coalesce((select jsonb_agg(metric) from normalized_baseline_metrics), '[]'::jsonb)
    || coalesce(advanced.payload->'metrics', '[]'::jsonb),
  'rivalryPairs', case when p_event_id is not null
    then coalesce(baseline.payload->'rivalryPairs', '[]'::jsonb)
    else public.get_advanced_rivalry_pair_rankings(p_season_year) end
) end from baseline cross join advanced;
$$;

revoke all on function public.get_unified_statistics_dashboard(integer, uuid) from public;
grant execute on function public.get_unified_statistics_dashboard(integer, uuid) to anon, authenticated;

create function public.get_player_compare_metric_bundle(
  p_player_ids uuid[], p_season_year integer default null
) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  normalized_player_ids uuid[];
begin
select array_agg(player_id order by request_order) into normalized_player_ids
from (
  select player_id, min(request_order)::bigint request_order
  from unnest(coalesce(p_player_ids, array[]::uuid[])) with ordinality
    requested_input(player_id, request_order)
  where player_id is not null
  group by player_id
  order by min(request_order)
  limit 2
  ) normalized;

if coalesce(cardinality(normalized_player_ids), 0) = 0 then
  return jsonb_build_object('players', '[]'::jsonb, 'pair', '{}'::jsonb);
end if;

return (
with requested as materialized (
  select player_id, request_order::bigint
  from unnest(normalized_player_ids) with ordinality requested_input(player_id, request_order)
), ordered_requested as (
  select player_id, row_number() over (order by request_order, player_id) side
  from requested
), metrics as materialized (
  select * from public.get_advanced_statistic_player_metrics(
    normalized_player_ids, p_season_year, null)
), pair_ids as (
  select least(player_a.player_id, player_b.player_id) player_low_id,
    greatest(player_a.player_id, player_b.player_id) player_high_id
  from ordered_requested player_a
  join ordered_requested player_b on player_a.side = 1 and player_b.side = 2
), pair_events as materialized (
  select r.* from public.rivalry_pair_events r cross join pair_ids ids
  where r.player_low_id = ids.player_low_id and r.player_high_id = ids.player_high_id
    and (p_season_year is null or extract(year from r.event_date)::integer = p_season_year)
), duel_standings as (
  select e.event_id, low.rank low_rank, high.rank high_rank
  from pair_events e
  join public.event_final_standings low on low.event_id = e.event_id and low.player_id = e.player_low_id
  join public.event_final_standings high on high.event_id = e.event_id and high.player_id = e.player_high_id
  where low.rank is not null and high.rank is not null
), pair_summary as (
  select count(*)::numeric common_events,
    count(*) filter (where low_rank <> high_rank)::numeric decided_events,
    count(*) filter (where low_rank < high_rank)::numeric low_wins,
    count(*) filter (where high_rank < low_rank)::numeric high_wins,
    count(*) filter (where low_rank = high_rank)::numeric ties
  from duel_standings
), rivalry_summary as (
  select count(*) filter (where is_rivalry_event)::numeric rivalry_events,
    coalesce(sum(direct_takeovers), 0)::numeric direct_takeovers,
    greatest(0, max(event_date) filter (where is_rivalry_event) - min(event_date) filter (where is_rivalry_event))::numeric span_days
  from pair_events
), takeover_summary as (
  select count(*) filter (where t.takeover_player_id = ids.player_low_id)::numeric low_takeovers,
    count(*) filter (where t.takeover_player_id = ids.player_high_id)::numeric high_takeovers
  from pair_ids ids left join public.event_direct_lead_takeovers t
    on t.player_low_id = ids.player_low_id and t.player_high_id = ids.player_high_id
  left join public.events e on e.id = t.event_id
  where p_season_year is null or extract(year from e.start_date)::integer = p_season_year
), pair_payload as (
  select jsonb_build_object(
    'commonEvents', p.common_events, 'decidedEvents', p.decided_events,
    'playerAWins', case when a.player_id = ids.player_low_id then p.low_wins else p.high_wins end,
    'playerBWins', case when b.player_id = ids.player_high_id then p.high_wins else p.low_wins end,
    'ties', p.ties, 'directTakeovers', r.direct_takeovers,
    'playerATakeovers', case when a.player_id = ids.player_low_id then t.low_takeovers else t.high_takeovers end,
    'playerBTakeovers', case when b.player_id = ids.player_high_id then t.high_takeovers else t.low_takeovers end,
    'rivalryEvents', r.rivalry_events, 'rivalrySpanDays', case when r.rivalry_events >= 2 then r.span_days end,
    'intensityPercent', case when p.common_events >= 3 then round(r.direct_takeovers / p.common_events * 100, 1) end,
    'balancePercent', case when p.decided_events >= 3 then round(abs(p.low_wins - p.high_wins) / p.decided_events * 100, 1) end,
    'playerANemesisLosses', case when a.player_id = ids.player_low_id then p.high_wins else p.low_wins end,
    'playerBNemesisLosses', case when b.player_id = ids.player_high_id then p.low_wins else p.high_wins end,
    'playerAFavoriteWins', case when a.player_id = ids.player_low_id then p.low_wins else p.high_wins end,
    'playerBFavoriteWins', case when b.player_id = ids.player_high_id then p.high_wins else p.low_wins end
  ) payload
  from pair_ids ids cross join pair_summary p cross join rivalry_summary r cross join takeover_summary t
  left join ordered_requested a on a.side = 1 left join ordered_requested b on b.side = 2
), pair_metrics as (
  select 'direct-wins'::text metric_key, a.player_id,
    case when a.player_id = ids.player_low_id then p.low_wins else p.high_wins end::numeric value,
    null::numeric hit_count, p.common_events sample_count, null::text detail
  from pair_ids ids cross join pair_summary p join ordered_requested a on true
  where p.common_events > 0
  union all
  select 'direct-takeovers', a.player_id,
    case when a.player_id = ids.player_low_id then t.low_takeovers else t.high_takeovers end,
    null, p.common_events, null
  from pair_ids ids cross join pair_summary p cross join takeover_summary t join ordered_requested a on true
  where p.common_events > 0
  union all
  select 'rivalry-intensity', a.player_id, round(r.direct_takeovers / nullif(p.common_events, 0) * 100, 1),
    r.direct_takeovers, p.common_events, 'gemeinsamer Pair-Wert'
  from pair_ids ids cross join pair_summary p cross join rivalry_summary r join ordered_requested a on true
  where p.common_events >= 3
  union all
  select 'rivalry-span', a.player_id, r.span_days, r.rivalry_events, r.rivalry_events, 'gemeinsamer Pair-Wert'
  from pair_ids ids cross join rivalry_summary r join ordered_requested a on true
  where r.rivalry_events >= 2
), combined_metrics as (
  select * from metrics union all select * from pair_metrics
)
select jsonb_build_object(
  'players', coalesce((select jsonb_agg(jsonb_build_object(
    'playerId', requested.player_id,
    'metrics', coalesce((select jsonb_agg(jsonb_build_object(
      'key', m.metric_key, 'value', m.value, 'count', m.hit_count,
      'total', m.sample_count, 'detail', m.detail, 'qualified', true
    ) order by m.metric_key) from combined_metrics m where m.player_id = requested.player_id), '[]'::jsonb)
  ) order by requested.request_order, requested.player_id) from requested), '[]'::jsonb),
  'pair', coalesce((select payload from pair_payload), '{}'::jsonb)
));
end;
$$;

revoke all on function public.get_player_compare_metric_bundle(uuid[], integer) from public;
grant execute on function public.get_player_compare_metric_bundle(uuid[], integer) to anon, authenticated;

-- Rebind the Trophy wrapper to the public v57 composition after the v56 rename.
create or replace function public.get_trophy_event_dashboard(p_event_id uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
  select case when special is null then null else jsonb_build_object(
    'special', special,
    'dashboard', public.get_unified_statistics_dashboard(null, p_event_id)
  ) end
  from (select public.get_trophy_event_special_stats(p_event_id) special) existing;
$$;

revoke all on function public.get_trophy_event_dashboard(uuid) from public;
grant execute on function public.get_trophy_event_dashboard(uuid) to anon, authenticated;
