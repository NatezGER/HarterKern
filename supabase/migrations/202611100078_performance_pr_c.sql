-- Performance-only development rankings; no shared source, award or stored data changes.
create function public.get_performance_development_metrics(p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path = public as $$
with career as materialized (
  select q.*, sy.season_year,
    jsonb_build_object('id',q.source_id,'date',q.occurred_date,'time',q.time_hundredths,
      'source',q.source_type,'exact',q.has_exact_time,'eventId',q.event_id) proof
  from public.qualified_official_times q
  left join public.season_qualified_official_times sy
    on sy.source_id=q.source_id and sy.source_type=q.source_type
  where q.player_id is not null and not q.is_guest
    and (p_season_year is null or q.occurred_date < make_date(p_season_year+1,1,1))
), ambiguous_days as (
  -- Source order orders imported historical rows, but does not prove their position
  -- relative to exact-time attempts on the same day. Duplicate import orders are ambiguous too.
  select player_id,occurred_date from career group by player_id,occurred_date
  having (bool_or(not has_exact_time) and bool_or(has_exact_time))
    or count(*) filter(where not has_exact_time) > count(distinct source_order) filter(where not has_exact_time)
), chronology as materialized (
  select c.*,row_number() over w seq,
    min(time_hundredths) over (w rows between unbounded preceding and 1 preceding) prior_pb
  from career c
  window w as (partition by player_id order by occurred_at,source_priority,source_order,source_id)
), reliable as materialized (
  select c.* from chronology c where not exists(select 1 from ambiguous_days d where d.player_id=c.player_id)
), pb as (
  select r.*,lag(seq) over w prior_pb_seq,lag(proof) over w prior_pb_proof
  from reliable r where prior_pb is null or time_hundredths < prior_pb
  window w as (partition by player_id order by seq)
), hunts as (
  select *,seq-prior_pb_seq length,
    row_number() over(partition by player_id order by seq-prior_pb_seq desc,seq) choice
  from pb where prior_pb_seq is not null and (p_season_year is null or season_year=p_season_year)
), last_pb as (
  select distinct on(player_id) player_id,seq,proof from pb order by player_id,seq desc
), plateaus as (
  select r.player_id,count(*)::numeric length,p.proof pb_proof,
    (array_agg(r.proof order by r.seq))[1] first_proof,
    (array_agg(r.proof order by r.seq desc))[1] last_proof
  from reliable r join last_pb p using(player_id)
  where r.seq>p.seq and (p_season_year is null or r.season_year=p_season_year)
  group by r.player_id,p.proof
), near_hits as materialized (
  select * from reliable where time_hundredths-prior_pb between 1 and 10
    and (p_season_year is null or season_year=p_season_year)
), scoped as materialized (
  select c.*,row_number() over(partition by player_id order by seq desc) recent
  from chronology c where p_season_year is null or season_year=p_season_year
), trends as (
  select player_id,
    percentile_cont(0.5) within group(order by time_hundredths) filter(where recent between 6 and 10)::numeric older,
    percentile_cont(0.5) within group(order by time_hundredths) filter(where recent<=5)::numeric newer
  from scoped where recent<=10 group by player_id having count(*)=10
), consistency as (
  -- Preserve canonical CV: population deviation / rounded mean, rounded to 3 decimals.
  -- The speed ranking itself uses the exact numeric mean, never its rounded label.
  select player_id,count(*)::numeric samples,avg(time_hundredths)::numeric mean,
    round(stddev_pop(time_hundredths)/nullif(round(avg(time_hundredths)),0)*100,3) cv
  from scoped group by player_id having count(*)>=10
), cv_order as (
  select *,row_number() over(order by cv,player_id) position,count(*) over() population from consistency
), cv_cutoff as (
  select cv cutoff,population,ceil(population::numeric/3) target from cv_order
  where position=ceil(population::numeric/3)
), event_order as materialized (
  select a.*,e.name event_name,e.start_date event_date,
    row_number() over w number,lag(time_hundredths) over w previous_time,
    lag(is_valid_time) over w previous_valid
  from public.official_event_attempts a join public.events e on e.id=a.event_id
  where p_season_year is null or extract(year from e.start_date)::integer=p_season_year
  window w as (partition by a.player_id,a.event_id order by a.submitted_at,a.attempt_id)
), transitions as (
  select e.*,d.direction,
    case when is_valid_time and previous_valid and
      ((d.direction='upward' and time_hundredths<previous_time)
        or (d.direction='downward' and time_hundredths>previous_time)) then 1 else 0 end improves
  from event_order e cross join(values('upward'),('downward')) d(direction)
), streak_groups as (
  select *,sum(1-improves) over(partition by player_id,event_id,direction order by number) segment
  from transitions
), streaks as (
  select player_id,event_id,event_name,event_date,direction,segment,
    count(*)::numeric length,min(number)-1 start_number,max(number) end_number
  from streak_groups where improves=1 group by player_id,event_id,event_name,event_date,direction,segment
), best_streak as (
  select *,row_number() over(partition by player_id,direction order by length desc,event_date,event_id,start_number) choice
  from streaks
), values_all as materialized (
  select 'performance-'||direction||'-spiral' key,player_id,length value from best_streak where choice=1
  union all select 'performance-form-rise',player_id,older-newer from trends where older>newer
  union all select 'performance-form-decay',player_id,newer-older from trends where newer>older
  union all select 'performance-record-hunter',player_id,length from hunts where choice=1
  union all select 'performance-plateau',player_id,length from plateaus where length>0
  union all select 'performance-near-legend',player_id,count(*)::numeric from near_hits group by player_id
  union all select 'performance-fastest-consistent',c.player_id,c.mean from consistency c cross join cv_cutoff b where c.cv<=b.cutoff
), ranked as (
  select v.*,p.display_name,p.avatar_url,p.avatar_path,
    rank() over(partition by key order by case when key='performance-fastest-consistent' then -value else value end desc) placement,
    row_number() over(partition by key order by case when key='performance-fastest-consistent' then -value else value end desc,p.display_name,v.player_id) display_order
  from values_all v join public.players p on p.id=v.player_id
), visible as materialized (
  select * from ranked where display_order<=10
), detailed as (
  select v.*,case
    when key in ('performance-upward-spiral','performance-downward-spiral') then (
      select jsonb_build_object('kind','spiral','eventId',b.event_id,'eventName',b.event_name,'eventDate',b.event_date,
        'start',b.start_number,'end',b.end_number,'length',b.length,
        'attempts',(select jsonb_agg(jsonb_build_object('id',a.attempt_id,'number',a.number,'time',a.time_hundredths) order by a.number)
          from event_order a where a.player_id=v.player_id and a.event_id=b.event_id and a.number between b.start_number and b.end_number))
      from best_streak b where b.player_id=v.player_id and b.choice=1 and key='performance-'||b.direction||'-spiral')
    when key in ('performance-form-rise','performance-form-decay') then (
      select jsonb_build_object('kind','trend','olderMedian',t.older,'newerMedian',t.newer,'samples',10,
        'older',(select jsonb_agg(s.proof order by seq) from scoped s where s.player_id=v.player_id and recent between 6 and 10),
        'newer',(select jsonb_agg(s.proof order by seq) from scoped s where s.player_id=v.player_id and recent<=5))
      from trends t where t.player_id=v.player_id)
    when key='performance-record-hunter' then (
      select jsonb_build_object('kind','hunt','before',h.prior_pb_proof,'after',h.proof,'length',h.length,'intermediate',h.length-1)
      from hunts h where h.player_id=v.player_id and choice=1)
    when key='performance-plateau' then (
      select jsonb_build_object('kind','plateau','pb',p.pb_proof,'first',p.first_proof,'last',p.last_proof,'length',p.length,'season',p_season_year)
      from plateaus p where p.player_id=v.player_id)
    when key='performance-near-legend' then jsonb_build_object('kind','near','total',v.value,'limit',20,
      'hits',(select jsonb_agg(n.proof||jsonb_build_object('priorPb',n.prior_pb,'gap',n.time_hundredths-n.prior_pb) order by n.seq)
        from(select * from near_hits where player_id=v.player_id order by seq desc limit 20) n))
    when key='performance-fastest-consistent' then (
      select jsonb_build_object('kind','consistent','samples',c.samples,'cv',c.cv,'mean',c.mean,'population',b.population,
        'target',b.target,'cutoff',b.cutoff,'qualified',(select count(*) from consistency where cv<=b.cutoff))
      from consistency c cross join cv_cutoff b where c.player_id=v.player_id)
    end evidence
  from visible v
), metrics as (
  select key,jsonb_build_object('key',key,'overallValue',null,'overallDetail','Werte je Spieler; Details erklären die Stichprobe.',
    'rankings',jsonb_agg(jsonb_build_object('rank',placement,'playerId',player_id,'name',display_name,
      'avatarUrl',avatar_url,'avatarPath',avatar_path,'value',value,'developmentEvidence',evidence) order by display_order)) payload
  from detailed group by key
)
select coalesce(jsonb_agg(payload order by key),'[]'::jsonb) from metrics;
$$;
revoke all on function public.get_performance_development_metrics(integer) from public;
grant execute on function public.get_performance_development_metrics(integer) to anon,authenticated;

create or replace function public.get_statistics_performance_dashboard(p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path = public as $$
with baseline as materialized (
with official as (
  select q.source_id, q.player_id, q.display_name, q.avatar_url, q.avatar_path,
    q.is_guest, q.time_hundredths, q.event_id, q.occurred_at, q.source_type, q.source_order
  from public.qualified_official_times q
  where p_season_year is null
  union all
  select q.source_id, q.player_id, q.display_name, q.avatar_url, q.avatar_path,
    q.is_guest, q.time_hundredths, q.event_id, q.occurred_at, q.source_type, q.source_order
  from public.season_qualified_official_times q
  where p_season_year is not null
    and q.season_year = p_season_year
), event_attempts as (
  select a.attempt_id id, a.player_id, a.event_id, a.submitted_at, a.time_hundredths,
    a.is_dnf, e.name event_name, e.start_date event_date
  from public.official_event_attempts a
  join public.events e on e.id = a.event_id
  where p_season_year is null
    or extract(year from e.start_date)::integer = p_season_year
), valid_event_attempts as (
  select * from event_attempts where not is_dnf and time_hundredths is not null
), threshold_player as (
  select player_id, count(*)::numeric threshold_count,
    count(*) filter (where time_hundredths < 500)::numeric sub5,
    count(*) filter (where time_hundredths < 400)::numeric sub4,
    count(*) filter (where time_hundredths < 300)::numeric sub3,
    count(*) filter (where time_hundredths < 250)::numeric sub25,
    count(*) filter (where time_hundredths < 200)::numeric sub2
  from valid_event_attempts group by player_id
), player_times as (
  select player_id, min(time_hundredths)::numeric best_time,
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
  from valid_event_attempts
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
  select player_id, time_hundredths, count(*)::numeric hits
  from valid_event_attempts group by player_id, time_hundredths
), common_players as (
  select distinct on (player_id) player_id, time_hundredths, hits
  from exact_time_counts order by player_id, hits desc, time_hundredths
), player_keys as (
  select player_id from player_times union select player_id from event_player
), players as (
  select p.id player_id, p.display_name, p.avatar_url, p.avatar_path,
    t.best_time, q.threshold_count, q.sub5, q.sub4, q.sub3, q.sub25, q.sub2,
    t.smooth_count, e.attempt_count, e.dnf_count, e.valid_count, e.average_time,
    m.event_attempt_count, m.event_name, m.event_date, s.longest,
    c.hits common_hits, c.time_hundredths common_time
  from player_keys k join public.players p on p.id = k.player_id
  left join player_times t on t.player_id = k.player_id
  left join threshold_player q on q.player_id = k.player_id
  left join event_player e on e.player_id = k.player_id
  left join event_max m on m.player_id = k.player_id
  left join streaks s on s.player_id = k.player_id
  left join common_players c on c.player_id = k.player_id
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
    from players where attempt_count >= 10
  union all select 'sub5', player_id, sub5 / threshold_count * 100, sub5, threshold_count, null
    from players where sub5 > 0
  union all select 'sub4', player_id, sub4 / threshold_count * 100, sub4, threshold_count, null
    from players where sub4 > 0
  union all select 'sub3', player_id, sub3 / threshold_count * 100, sub3, threshold_count, null
    from players where sub3 > 0
  union all select 'sub25', player_id, sub25 / threshold_count * 100, sub25, threshold_count, null
    from players where sub25 > 0
  union all select 'sub2', player_id, sub2 / threshold_count * 100, sub2, threshold_count, null
    from players where sub2 > 0
  union all select 'streak', player_id, longest, null, null, null
    from players where longest > 0
  union all select 'smooth', player_id, smooth_count, null, null, null
    from players where smooth_count > 0
  union all select 'common', player_id, common_hits, null, null,
    concat(replace(to_char(common_time / 100.0, 'FM999990.00'), '.', ','), ' s')::text
    from players where common_hits > 0
  union all select 'event-max', player_id, event_attempt_count, null, null,
    concat(event_name, ' · ', event_date)::text from players where event_attempt_count > 0
), ranked as (
  select m.*, p.display_name, p.avatar_url, p.avatar_path,
    rank() over (partition by m.key order by
      case when m.key in ('fastest', 'average', 'dnf') then -m.value
        else m.value end desc) placement,
    row_number() over (partition by m.key order by
      case when m.key in ('fastest', 'average', 'dnf') then -m.value
        else m.value end desc, m.sample_count desc nulls last,
      p.display_name, m.player_id) display_position
  from metric_values m join players p using (player_id)
), totals as (
  select min(time_hundredths) filter (
      where (player_id is not null and not is_guest)
    )::numeric fastest,
    count(*) filter (where mod(time_hundredths, 100) = 0)::numeric smooth
  from official
), threshold_totals as (
  select count(*)::numeric threshold_count,
    count(*) filter (where time_hundredths < 500)::numeric sub5,
    count(*) filter (where time_hundredths < 400)::numeric sub4,
    count(*) filter (where time_hundredths < 300)::numeric sub3,
    count(*) filter (where time_hundredths < 250)::numeric sub25,
    count(*) filter (where time_hundredths < 200)::numeric sub2
  from valid_event_attempts
), event_totals as (
  select count(*)::numeric attempts,
    count(*) filter (where is_dnf)::numeric dnf,
    count(*) filter (where not is_dnf and time_hundredths is not null)::numeric valid,
    round(avg(time_hundredths) filter (
      where not is_dnf and time_hundredths is not null
    ))::numeric average_time
  from event_attempts
), baseline as (
  select g.valid_attempts::numeric valid, g.dnf_count::numeric dnf,
    (g.valid_attempts + g.dnf_count)::numeric attempts,
    g.average_hundredths::numeric average_time,
    g.regular_players::numeric regular_players, g.event_count::numeric event_count
  from public.global_statistics g where p_season_year is null
  union all
  select s.valid_attempts::numeric, s.dnf_count::numeric,
    (s.valid_attempts + s.dnf_count)::numeric, s.average_hundredths::numeric,
    s.regular_players::numeric, s.event_count::numeric
  from public.season_global_statistics s where s.season_year = p_season_year
  union all
  select e.valid, e.dnf, e.attempts, e.average_time, 0::numeric, 0::numeric
  from event_totals e where p_season_year is not null
    and not exists (select 1 from public.season_global_statistics s where s.season_year = p_season_year)
), summary as (
  select key, value, hit_count, sample_count, detail from (
    select 'fastest'::text key, t.fastest value, null::numeric hit_count,
      null::numeric sample_count, null::text detail from totals t
    union all select 'valid', e.valid, null, null, null from event_totals e
    union all select 'average', e.average_time, null, null, null from event_totals e
    union all select 'dnf', round(e.dnf / nullif(e.attempts, 0) * 100, 1),
      e.dnf, e.attempts, null from baseline e
    union all select 'sub5', round(t.sub5 / nullif(t.threshold_count, 0) * 100, 1), t.sub5, t.threshold_count, null from threshold_totals t
    union all select 'sub4', round(t.sub4 / nullif(t.threshold_count, 0) * 100, 1), t.sub4, t.threshold_count, null from threshold_totals t
    union all select 'sub3', round(t.sub3 / nullif(t.threshold_count, 0) * 100, 1), t.sub3, t.threshold_count, null from threshold_totals t
    union all select 'sub25', round(t.sub25 / nullif(t.threshold_count, 0) * 100, 1), t.sub25, t.threshold_count, null from threshold_totals t
    union all select 'sub2', round(t.sub2 / nullif(t.threshold_count, 0) * 100, 1), t.sub2, t.threshold_count, null from threshold_totals t
    union all select 'streak', max(longest), null, null, null from players
    union all select 'smooth', t.smooth, null, null, null from totals t
    union all select 'common', max(c.hits), null, null,
      'Höchste persönliche Wiederholungszahl'::text from common_players c
    union all select 'event-max', max(event_attempt_count), null, null, null from players
  ) metric_summary
), regular_official as (
  select * from official where player_id is not null and not is_guest
), ordered_attempts as (
  select a.*,
    row_number() over (partition by player_id, event_id order by submitted_at, id)::integer attempt_number,
    count(*) over (partition by player_id, event_id)::integer event_attempt_count,
    lag(time_hundredths) over (partition by player_id, event_id order by submitted_at, id) previous_time,
    lag(is_dnf or time_hundredths is null) over (partition by player_id, event_id order by submitted_at, id) previous_invalid
  from event_attempts a
), official_ranked as (
  select o.*, row_number() over (
    partition by player_id order by time_hundredths, occurred_at, source_id
  ) fastest_number
  from regular_official o
), official_player as (
  select player_id,
    count(*)::numeric valid_count, round(avg(time_hundredths))::numeric average_time,
    percentile_cont(0.5) within group (order by time_hundredths)::numeric median_time,
    stddev_pop(time_hundredths)::numeric deviation
  from regular_official group by player_id
), fastest_five as (
  select player_id, round(avg(time_hundredths))::numeric fastest_five
  from official_ranked where fastest_number <= 5 group by player_id having count(*) = 5
), five_windows as (
  select player_id, event_id, event_name, event_date, attempt_number,
    array_agg(time_hundredths) over window5 window_times,
    array_agg(id) over window5 window_attempt_ids,
    count(*) over window5 window_size,
    count(time_hundredths) filter (where not is_dnf) over window5 valid_size,
    avg(time_hundredths) filter (where not is_dnf) over window5 window_average
  from ordered_attempts
  window window5 as (partition by player_id, event_id order by attempt_number rows between 4 preceding and current row)
), best_windows as (
  select player_id, round(min(window_average))::numeric best_window
  from five_windows where window_size = 5 and valid_size = 5 group by player_id
), best_window_evidence as (
  -- Same unrounded minimum as the ranking; deterministic evidence for tied windows.
  select distinct on (player_id) player_id,
    jsonb_build_object('eventId', event_id, 'eventName', event_name,
      'eventDate', event_date, 'startAttempt', attempt_number - 4,
      'endAttempt', attempt_number, 'times', window_times,
      'attemptIds', window_attempt_ids, 'averageHundredths', round(window_average)) evidence
  from five_windows where window_size = 5 and valid_size = 5
  order by player_id, window_average, event_date, event_id, attempt_number
), hunter_endings as (
  -- Reuse canonical first-hit views; guests keep their first hits, never reassigned.
  select first_player_id player_id, ending
  from public.most_wanted_endings
  where p_season_year is null and achieved and not first_is_guest
  union all
  select first_player_id, ending from public.season_most_wanted_endings
  where p_season_year is not null and season_year = p_season_year
    and achieved and not first_is_guest
), hunters as (
  select player_id, count(*)::numeric hits,
    string_agg(lpad(ending::text, 2, '0'), ', ' order by ending) endings
  from hunter_endings where player_id is not null group by player_id
), event_features as (
  select player_id, event_id, max(event_attempt_count)::numeric attempt_count,
    max(time_hundredths) filter (where attempt_number = 1 and not is_dnf and time_hundredths is not null)::numeric first_time
  from ordered_attempts group by player_id, event_id
), event_player_features as (
  select player_id,
    count(*) filter (where attempt_count >= 3 and first_time is not null)::numeric fast_starter_events,
    min(first_time) filter (where first_time is not null)::numeric fastest_first
  from event_features group by player_id
), near_repeat as (
  select player_id,
    count(*) filter (where not is_dnf and time_hundredths is not null
      and previous_time is not null and not coalesce(previous_invalid, true)
      and abs(time_hundredths - previous_time) <= 10)::numeric hits,
    count(*) filter (where not is_dnf and time_hundredths is not null
      and previous_time is not null and not coalesce(previous_invalid, true))::numeric pairs
  from ordered_attempts group by player_id
), pb_ordered as (
  select o.*, min(time_hundredths) over (partition by player_id order by occurred_at, source_id
    rows between unbounded preceding and 1 preceding) previous_best
  from regular_official o
), pb_records as (
  select *, lag(time_hundredths) over (partition by player_id order by occurred_at, source_id) previous_record
  from pb_ordered where previous_best is null or time_hundredths < previous_best
), pb_jumps as (
  select player_id, max(previous_record - time_hundredths)::numeric jump,
    count(*)::numeric record_count from pb_records group by player_id
), wr_source as (
  select h.player_id, h.duration_days::numeric duration_days,
    h.improvement_hundredths::numeric improvement
  from public.world_record_history h
  where p_season_year is null
  union all
  select h.player_id,
    greatest(0, least(coalesce(h.period_end_date, make_date(p_season_year + 1, 1, 1)),
      make_date(p_season_year + 1, 1, 1)) - h.achieved_date)::numeric,
    h.improvement_hundredths::numeric
  from public.season_world_record_history h
  where p_season_year is not null and h.season_year = p_season_year
), wr_player as (
  select player_id, max(duration_days)::numeric reign,
    count(*) filter (where improvement > 0)::numeric improvements,
    max(improvement) filter (where improvement > 0)::numeric jump
  from wr_source group by player_id
), performance_b as materialized (
  select * from public.get_performance_event_metrics(p_season_year)
), advanced_values(metric_key, player_id, value, hit_count, sample_count, detail) as materialized (
select 'median'::text, player_id::uuid, median_time::numeric,
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
union all select 'fastest-first'::text, player_id::uuid, fastest_first::numeric,
  null::numeric, fast_starter_events::numeric, null::text
from event_player_features where fastest_first is not null
union all select 'near-repeat'::text, player_id::uuid,
  (hits / nullif(pairs, 0) * 100)::numeric,
  hits::numeric, pairs::numeric, null::text
from near_repeat where pairs >= 5
union all select 'pb-jump'::text, player_id::uuid, jump::numeric,
  null::numeric, record_count::numeric, null::text
from pb_jumps
where record_count >= 2 and jump is not null
union all select 'wr-reign'::text, player_id::uuid, reign::numeric,
  null::numeric, null::numeric, null::text
from wr_player where reign > 0
union all select 'wr-improvements'::text, player_id::uuid, improvements::numeric,
  null::numeric, null::numeric, null::text
from wr_player where improvements > 0
union all select 'wr-jump'::text, player_id::uuid, jump::numeric,
  null::numeric, null::numeric, null::text
from wr_player where jump > 0
union all select 'most-wanted-firsts'::text, player_id, hits, null::numeric, null::numeric, endings from hunters
union all select metric_key,player_id,value,hit_count,sample_count,detail from performance_b
union all select * from public.get_statistics_sequence_metrics(null, p_season_year, null)
  where metric_key <> 'fast-starter' or sample_count >= 2
union all select * from public.get_qualified_leadership_metrics(null, p_season_year, null)
), advanced_ranked as (
  select m.*, p.display_name, p.avatar_url, p.avatar_path,
    rank() over (partition by metric_key order by
      case when metric_key in (
        'median', 'fastest-five', 'best-five-window', 'consistency',
        'fastest-first', 'fast-starter', 'two-in-sixty-best'
      ) then -value else value end desc) placement,
    row_number() over (partition by metric_key order by
      case when metric_key in (
        'median', 'fastest-five', 'best-five-window', 'consistency',
        'fastest-first', 'fast-starter', 'two-in-sixty-best'
      ) then -value else value end desc,
      case when metric_key='performance-endspurt' then
        (select b.sort_rate from performance_b b where b.metric_key=m.metric_key and b.player_id=m.player_id)
      end desc nulls last,
      sample_count desc nulls last, p.display_name, player_id) display_position
  from advanced_values m
  join public.players p on p.id = m.player_id
), advanced_summary as (
  select metric_key,
    (case when metric_key in ('two-in-sixty-total', 'most-wanted-firsts', 'performance-rivalry-events', 'performance-chaos-takeovers') then sum(value)
      else round(avg(value), 2) end)::numeric value,
    sum(hit_count)::numeric hit_count, sum(sample_count)::numeric sample_count
  from advanced_values
  group by metric_key
), canonical_lead_values as materialized (
  select segments.player_id,
    sum(segments.duration_seconds)::numeric value
  from public.event_lead_segments_all segments
  join public.events events on events.id = segments.event_id
  where events.status = 'closed'
    and (p_season_year is null
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
select jsonb_build_object(
  'metrics', coalesce((select jsonb_agg(jsonb_build_object(
      'key', s.key, 'overallValue', s.value,
      'overallCount', s.hit_count, 'overallTotal', s.sample_count,
      'overallDetail', s.detail,
      'rankings', coalesce((select jsonb_agg(jsonb_build_object(
        'rank', r.placement, 'playerId', r.player_id,
        'name', r.display_name, 'avatarUrl', r.avatar_url,
        'avatarPath', r.avatar_path, 'value', r.value,
        'count', r.hit_count, 'total', r.sample_count, 'detail', r.detail
      ) order by
        case when r.key in ('fastest','average','dnf') then -r.value else r.value end desc,
        r.sample_count desc nulls last, r.display_name, r.player_id)
      from ranked r where r.key = s.key and r.display_position <= 10
        and (r.key not in ('sub5','sub4','sub3','sub25','sub2') or r.hit_count > 0)), '[]'::jsonb)
    ) order by s.key) from summary s), '[]'::jsonb)
    || coalesce((select jsonb_agg(jsonb_build_object(
    'key', s.metric_key, 'overallValue', s.value,
    'overallCount', s.hit_count, 'overallTotal', s.sample_count,
    'overallDetail', null,
    'rankings', coalesce((select jsonb_agg(jsonb_build_object(
      'rank', r.placement, 'playerId', r.player_id, 'name', r.display_name,
      'avatarUrl', r.avatar_url, 'avatarPath', r.avatar_path,
      'value', r.value, 'count', r.hit_count, 'total', r.sample_count,
      'endspurtEvidence', case when r.metric_key='performance-endspurt' then
        (select b.evidence from performance_b b where b.metric_key=r.metric_key and b.player_id=r.player_id) end,
      'rivalryEvidence', case when r.metric_key='performance-rivalry-events' then
        (select b.evidence from performance_b b where b.metric_key=r.metric_key and b.player_id=r.player_id) end,
      'chaosEvidence', case when r.metric_key='performance-chaos-takeovers' then
        (select b.evidence from performance_b b where b.metric_key=r.metric_key and b.player_id=r.player_id) end,
      'windowEvidence', case when r.metric_key = 'best-five-window' then
        (select b.evidence from best_window_evidence b where b.player_id = r.player_id) else null end,
      'detail', case when r.metric_key = 'consistency'
        then concat('Streuung ', to_char(r.hit_count / 100, 'FM999990D00'),
          ' s') else r.detail end
    ) order by r.display_position)
    from advanced_ranked r
    where r.metric_key = s.metric_key and r.display_position <= 10), '[]'::jsonb)
  ) order by s.metric_key) from advanced_summary s), '[]'::jsonb)
    || (select payload from canonical_lead_metric),
  'rivalryPairs', '[]'::jsonb,
  'regularPlayers', (select regular_players from baseline),
  'eventCount', (select event_count from baseline),
  'players', coalesce((select jsonb_agg(jsonb_build_object(
    'id', player_id, 'name', display_name, 'avatarUrl', avatar_url, 'avatarPath', avatar_path
  ) order by display_name, player_id) from players), '[]'::jsonb),
  -- Same qualified hits/attempt numbering (including guests) as the old chart;
  -- no endings grid, progress or first-hit calculation is needed here.
  'attemptNumbers', coalesce((select jsonb_agg(jsonb_build_object(
    'attemptNumber', attempt_number, 'samples', samples, 'validCount', samples,
    'dnfCount', 0, 'averageHundredths', average_time
  ) order by attempt_number) from (
    select source_order attempt_number, count(*) samples,
      round(avg(time_hundredths)) average_time
    from official where source_type = 'attempt' and source_order > 0
    group by source_order
  ) points), '[]'::jsonb)
)
)
select payload || jsonb_build_object('metrics',coalesce(payload->'metrics','[]'::jsonb)
  || public.get_performance_development_metrics(p_season_year))
from (select baseline.* from baseline) b(payload);
$$;
revoke all on function public.get_statistics_performance_dashboard(integer) from public;
grant execute on function public.get_statistics_performance_dashboard(integer) to anon, authenticated;

