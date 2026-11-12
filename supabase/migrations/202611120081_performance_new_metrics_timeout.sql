-- PR G: replace only the two read-only metric helpers introduced by B/C.
-- CREATE OR REPLACE preserves the existing signature, ownership and grants.

create or replace function public.get_performance_event_metrics_v2(p_season_year integer, p_details_player uuid)
returns table(metric_key text, player_id uuid, value numeric, hit_count numeric,
  sample_count numeric, detail text, sort_rate numeric, evidence jsonb)
language sql stable security invoker set search_path = public as $$
with scoped_events as materialized (
  select id, name, start_date, status from public.events
  where deleted_at is null and (p_season_year is null
    or extract(year from start_date)::integer = p_season_year)
), ordered as materialized (
  select a.attempt_id,
    row_number() over (partition by a.event_id,a.player_id order by a.submitted_at,a.attempt_id)::integer attempt_number
  from public.official_event_attempts a join scoped_events e on e.id=a.event_id
  where p_details_player is not null and a.player_id=p_details_player and e.status='closed'
), pair_context as materialized (
  -- Lag BEFORE filtering candidates: ties and initial placements must remain visible.
  select s.*,e.name event_name,e.start_date event_date,
    lag(low_best_hundredths) over w previous_low_pb,
    lag(high_best_hundredths) over w previous_high_pb
  from public.event_pair_attempt_states s join scoped_events e on e.id=s.event_id
  where e.status='closed'
    and (p_details_player is null or p_details_player in (s.player_low_id,s.player_high_id))
  window w as (partition by s.event_id,s.player_low_id,s.player_high_id order by s.submitted_at,s.attempt_id)
), rivalry_pairs as (
  -- Same direct transitions and three-takeover threshold as rivalry_pair_events.
  -- Reuse the pair chronology for Chaos; no lead-duration projection is needed.
  select event_id, player_low_id, player_high_id, event_name, event_date,
    count(*)::integer direct_takeovers
  from pair_context
  where previous_leader_player_id is not null and leader_player_id is not null
    and previous_leader_player_id <> leader_player_id
    and player_id = leader_player_id and is_valid_time
  group by event_id, player_low_id, player_high_id, event_name, event_date
  having count(*) >= 3
), rivalry_sides as (
  select event_id,event_name,event_date,player_low_id player_id,
    player_high_id opponent_id,direct_takeovers from rivalry_pairs
  union all
  select event_id,event_name,event_date,player_high_id,player_low_id,direct_takeovers from rivalry_pairs
), rivalry_events as (
  select s.player_id,event_id,event_name,event_date,
    count(*)::numeric pair_count,
    case when p_details_player=s.player_id then jsonb_agg(jsonb_build_object('playerId',opponent_id,'name',p.display_name,
      'takeovers',direct_takeovers) order by p.display_name,opponent_id) filter(where p_details_player=s.player_id) end opponents
  from rivalry_sides s join public.players p on p.id=s.opponent_id
  where p_details_player is null or s.player_id=p_details_player
  group by s.player_id,event_id,event_name,event_date
), rivalry_players as (
  select player_id,sum(pair_count)::numeric events,
    case when p_details_player=player_id then jsonb_agg(jsonb_build_object('eventId',event_id,'eventName',event_name,
      'eventDate',event_date,'opponents',opponents) order by event_date desc,event_id) filter(where p_details_player=player_id and evidence_position<=5) end evidence
  from (select r.*,row_number() over(partition by player_id order by event_date desc,event_id) evidence_position from rivalry_events r) bounded group by player_id
), acting_states as (
  select s.*,
    case when player_id=player_low_id then previous_low_pb else previous_high_pb end before_pb,
    case when player_id=player_low_id then previous_high_pb else previous_low_pb end opponent_pb,
    case when player_id=player_low_id then player_high_id else player_low_id end opponent_id
  from pair_context s
), active_takeovers as (
  select s.* from acting_states s join public.event_lead_windows w using(event_id)
  where (p_details_player is null or s.player_id=p_details_player) and s.is_valid_time and s.before_pb is not null and s.opponent_pb is not null
    and s.time_hundredths < s.before_pb
    and s.before_pb > s.opponent_pb and s.time_hundredths < s.opponent_pb
    and s.previous_leader_player_id=s.opponent_id and s.leader_player_id=s.player_id
    and (s.submitted_at,s.attempt_id) >= (w.qualification_started_at,w.qualification_attempt_id)
    and s.submitted_at <= w.statistical_ended_at
), takeover_attempts as (
  select s.player_id,s.event_id,s.event_name,s.event_date,s.attempt_id,s.submitted_at,s.before_pb,s.time_hundredths,o.attempt_number,
    count(*)::numeric takeovers,
    case when p_details_player=s.player_id then jsonb_agg(jsonb_build_object('playerId',opponent_id,'name',p.display_name,
      'bestHundredths',opponent_pb) order by opponent_pb,p.display_name,opponent_id) filter(where p_details_player=s.player_id and opponent_position<=5) end opponents
  from (select a.*,row_number() over(partition by player_id,attempt_id order by opponent_pb,opponent_id) opponent_position from active_takeovers a) s join public.players p on p.id=s.opponent_id
  left join ordered o on p_details_player is not null and o.attempt_id=s.attempt_id
  group by s.player_id,s.event_id,s.event_name,s.event_date,s.attempt_id,s.submitted_at,s.before_pb,s.time_hundredths,o.attempt_number
), chaos_players as (
  select player_id,sum(takeovers)::numeric takeovers,
    case when p_details_player=player_id then jsonb_agg(jsonb_build_object('eventId',event_id,'eventName',event_name,'eventDate',event_date,
      'attemptId',attempt_id,'attemptNumber',attempt_number,'submittedAt',submitted_at,'beforePb',before_pb,
      'newPb',time_hundredths,'takeovers',takeovers,'opponents',opponents)
      order by submitted_at desc,attempt_id desc) filter(where p_details_player=player_id and evidence_position<=5) end evidence
  from (select t.*,row_number() over(partition by player_id order by submitted_at desc,attempt_id desc) evidence_position from takeover_attempts t) bounded group by player_id
)
select 'performance-rivalry-events',player_id,events,null::numeric,null::numeric,
  null::text,null::numeric,evidence from rivalry_players
union all
select 'performance-chaos-takeovers',player_id,takeovers,null::numeric,null::numeric,
  null::text,null::numeric,evidence from chaos_players;
$$;

create or replace function public.get_performance_development_metrics_v2(p_season_year integer, p_details_player uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
with career as materialized (
  select q.source_id, q.player_id, q.time_hundredths, q.occurred_at, q.occurred_date,
    q.source_priority, q.source_order, q.has_exact_time,
    -- Season assignment follows 026: event start date for live attempts,
    -- occurrence date for historical attempts, seasons start in 2026.
    p_season_year >= 2026 and case q.source_type
      when 'attempt' then extract(year from e.start_date)::integer = p_season_year
      when 'historical_attempt' then extract(year from q.occurred_date)::integer = p_season_year
      else false
    end in_season,
    case when p_details_player=q.player_id then jsonb_build_object('id',q.source_id,'date',q.occurred_date,'time',q.time_hundredths,
      'source',q.source_type,'exact',q.has_exact_time,'eventId',q.event_id) end proof
  from public.qualified_official_times q
  left join public.events e on p_season_year >= 2026
    and q.source_type='attempt' and e.id=q.event_id and e.deleted_at is null
  where q.player_id is not null and not q.is_guest
    and (p_details_player is null or q.player_id=p_details_player)
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
  from pb where prior_pb_seq is not null and (p_season_year is null or in_season)
), last_pb as (
  select distinct on(player_id) player_id,seq,proof from pb order by player_id,seq desc
), plateaus as (
  select r.player_id,count(*)::numeric length,p.proof pb_proof,
    (array_agg(r.proof order by r.seq) filter (where p_details_player is not null))[1] first_proof,
    (array_agg(r.proof order by r.seq desc) filter (where p_details_player is not null))[1] last_proof
  from reliable r join last_pb p using(player_id)
  where r.seq>p.seq and (p_season_year is null or r.in_season)
  group by r.player_id,p.proof
), near_hits as materialized (
  select * from reliable where time_hundredths-prior_pb between 1 and 10
    and (p_season_year is null or in_season)
), event_order as materialized (
  select a.*,e.name event_name,e.start_date event_date,
    row_number() over w number,lag(time_hundredths) over w previous_time,
    lag(is_valid_time) over w previous_valid
  from public.official_event_attempts a join public.events e on e.id=a.event_id
  where (p_details_player is null or a.player_id=p_details_player)
    and (p_season_year is null or extract(year from e.start_date)::integer=p_season_year)
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
  union all select 'performance-record-hunter',player_id,length from hunts where choice=1
  union all select 'performance-plateau',player_id,length from plateaus where length>0
  union all select 'performance-near-legend',player_id,count(*)::numeric from near_hits group by player_id
), ranked as (
  select v.*,p.display_name,p.avatar_url,p.avatar_path,
    rank() over(partition by key order by value desc) placement,
    row_number() over(partition by key order by value desc,p.display_name,v.player_id) display_order
  from values_all v join public.players p on p.id=v.player_id
), visible as materialized (
  select * from ranked where display_order<=10
), detailed as (
  select v.*,case when p_details_player is null then null::jsonb
    when key in ('performance-upward-spiral','performance-downward-spiral') then (
      select jsonb_build_object('kind','spiral','eventId',b.event_id,'eventName',b.event_name,'eventDate',b.event_date,
        'start',b.start_number,'end',b.end_number,'length',b.length,
        'attempts',(select jsonb_agg(jsonb_build_object('id',a.attempt_id,'number',a.number,'time',a.time_hundredths) order by a.number)
          from event_order a where a.player_id=v.player_id and a.event_id=b.event_id and a.number between b.start_number and b.end_number))
      from best_streak b where b.player_id=v.player_id and b.choice=1 and key='performance-'||b.direction||'-spiral')
    when key='performance-record-hunter' then (
      select jsonb_build_object('kind','hunt','before',h.prior_pb_proof,'after',h.proof,'length',h.length,'intermediate',h.length-1)
      from hunts h where h.player_id=v.player_id and choice=1)
    when key='performance-plateau' then (
      select jsonb_build_object('kind','plateau','pb',p.pb_proof,'first',p.first_proof,'last',p.last_proof,'length',p.length,'season',p_season_year)
      from plateaus p where p.player_id=v.player_id)
    when key='performance-near-legend' then jsonb_build_object('kind','near','total',v.value,'limit',20,
      'hits',(select jsonb_agg(n.proof||jsonb_build_object('priorPb',n.prior_pb,'gap',n.time_hundredths-n.prior_pb) order by n.seq)
        from(select * from near_hits where player_id=v.player_id order by seq desc limit 20) n))
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
