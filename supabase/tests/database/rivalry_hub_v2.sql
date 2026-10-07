-- Local pgTAP fixture test only; NOT a production smoke test.
begin;
create extension if not exists pgtap;
select no_plan();

with fixtures(label,e,t,l,score,intensity) as (
  values ('A',1,1,0,58,33),('B',1,2,0,82,67),('C',1,3,1,100,100),
    ('D',4,3,0,114,25),('E',6,8,1,236,44),('F',10,3,1,91,10),
    ('G',5,10,2,287,67),('H',8,18,4,506,75)
)
select assertion from fixtures f
cross join lateral public.calculate_rivalry_metrics_v1(t,e,l) m
cross join lateral (values
  (is(m.rivalry_score, f.score::numeric, 'score fixture '||label)),
  (is(m.intensity_percent,f.intensity::numeric,'intensity fixture '||label))
) tap(assertion);
select is((select intensity_percent from public.calculate_rivalry_metrics_v1(6,1,1)),200::numeric,'intensity is uncapped');
select is((select intensity_percent from public.calculate_rivalry_metrics_v1(0,0,0)),null::numeric,'E=0 has NULL intensity');
select is((select rivalry_score from public.calculate_rivalry_metrics_v1(0,4,1)),0::numeric,'T=0 score is zero');
select is((select rivalry_score from public.calculate_rivalry_metrics_v1(3,0,1)),0::numeric,'E=0 score is zero');
select ok((select rivalry_score from public.calculate_rivalry_metrics_v1(10,5,2))
  > (select rivalry_score from public.calculate_rivalry_metrics_v1(10,5,1)), 'length adds score');
select ok((select rivalry_score from public.calculate_rivalry_metrics_v1(3,10,1)) < 100,'sparse history does not explode');

create temporary table fixture_events(n integer, pair_name text, year integer, takeovers integer, state text);
insert into fixture_events select * from (values
 (1,'R',2086,3,'closed'),(2,'R',2086,1,'closed'),(3,'R',2086,3,'closed'),
 (4,'R',2087,0,'closed'),(5,'R',2086,3,'active'),(6,'R',2087,-1,'closed'),
 (7,'D1',2086,1,'closed'),(8,'D2',2086,2,'closed'),
 (9,'Spread',2086,1,'closed'),(10,'Spread',2086,1,'closed'),(11,'Spread',2086,1,'closed'),
 (12,'Zero',2086,0,'closed'),(13,'Tie',2086,0,'closed'),(14,'R',2089,3,'closed')
) v(n,pair_name,year,takeovers,state)
where n<>5 or not exists(select 1 from public.events where status='active');
-- The schema permits only one active event; never alter a seeded event.

insert into public.players(id,display_name)
select md5('r66-'||pair_name||actor)::uuid,'Fixture '||pair_name||actor
from (select distinct pair_name from fixture_events) p cross join (values ('A'),('B')) a(actor);
insert into public.players(id,display_name) values(md5('r66-third')::uuid,'Fixture third');

insert into public.events(id,name,start_date,started_at,ends_at,status,closed_at)
select md5('r66-event-'||n)::uuid,'Fixture '||n,make_date(year,1,n),
  make_date(year,1,n)::timestamptz,make_date(year,1,n)::timestamptz+interval '23 hours',
  state::public.event_status,case when state='closed' then make_date(year,1,n)::timestamptz+interval '22 hours' end
from fixture_events;
insert into public.event_participants(event_id,player_id)
select md5('r66-event-'||n)::uuid,md5('r66-'||pair_name||actor)::uuid
from fixture_events cross join (values ('A'),('B')) a(actor)
where n<>14; -- Missing membership: canonical rivalry stays, but not comparable E/T.

insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select md5('r66-attempt-'||n||'-'||i)::uuid,
  md5('r66-'||pair_name||case when i%2=1 then 'A' else 'B' end)::uuid,
  md5('r66-event-'||n)::uuid,'approved',
  case when takeovers<0 then null else 510-i*10 end,takeovers<0,
  make_date(year,1,n)::timestamptz+i*interval '1 minute',
  make_date(year,1,n)::timestamptz+i*interval '1 minute'
from fixture_events cross join lateral generate_series(1,greatest(takeovers,0)+2) g(i)
where n<>13;
-- A leads after pair activation, B ties, then B establishes lead: no direct takeover.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select md5('r66-tie-'||i)::uuid,md5('r66-Tie'||actor)::uuid,md5('r66-event-13')::uuid,
  'approved',hundredths,false,'2086-01-13 00:00Z'::timestamptz+i*interval '1 minute',
  '2086-01-13 00:00Z'::timestamptz+i*interval '1 minute'
from (values(1,'A',500),(2,'B',510),(3,'B',500),(4,'B',490)) v(i,actor,hundredths);
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
values(md5('r66-third-attempt')::uuid,md5('r66-third')::uuid,md5('r66-event-1')::uuid,
 'approved',100,false,'2086-01-01 00:02:30Z','2086-01-01 00:02:30Z');

create temporary table snapshots as
select y,public.get_rivalry_hub_v2(y) payload from (values(null::integer),(2086),(2087),(2088),(2089)) s(y);
create function pg_temp.fixture_pair(p_year integer,p_name text) returns jsonb language sql stable as $$
  select p from snapshots s cross join lateral jsonb_array_elements(s.payload->'pairs') p
  where s.y is not distinct from p_year
    and (p->>'playerAId')::uuid in (md5('r66-'||p_name||'A')::uuid,md5('r66-'||p_name||'B')::uuid)
    and (p->>'playerBId')::uuid in (md5('r66-'||p_name||'A')::uuid,md5('r66-'||p_name||'B')::uuid)
$$;
select is(pg_temp.fixture_pair(2086,'Zero'),null::jsonb,'initial lead is not a takeover or duel');
select is(pg_temp.fixture_pair(2086,'Tie'),null::jsonb,'tie interrupts direct succession');
select is((pg_temp.fixture_pair(2086,'D1')->>'totalDirectTakeovers')::integer,1,'one takeover retained');
select is((pg_temp.fixture_pair(2086,'D1')->>'duelOnly')::boolean,true,'one takeover is duel');
select is((pg_temp.fixture_pair(2086,'D2')->>'totalDirectTakeovers')::integer,2,'two takeovers retained');
select is((pg_temp.fixture_pair(2086,'D2')->>'duelOnly')::boolean,true,'two takeovers are duel');
select is((pg_temp.fixture_pair(2086,'Spread')->>'totalDirectTakeovers')::integer,3,'distributed takeovers count');
select is((pg_temp.fixture_pair(2086,'Spread')->>'rivalryLength')::integer,0,'distributed three do not form rivalry');
select is((pg_temp.fixture_pair(2086,'R')->>'rivalryLength')::integer,2,'non-consecutive rivalry events count, active excluded');
select ok(not exists(select 1 from public.rivalry_pair_events where event_id=md5('r66-event-5')::uuid),
    'active event excluded from canonical history')
where exists(select 1 from fixture_events where n=5);
select skip('active-event fixture: an active seeded event already exists',1)
where not exists(select 1 from fixture_events where n=5);
select is((pg_temp.fixture_pair(2086,'R')->>'totalDirectTakeovers')::integer,7,'third player does not change A/B takeovers');
select is((pg_temp.fixture_pair(2086,'R')->>'comparableH2hEvents')::integer,3,'closed valid common events only');
select is((pg_temp.fixture_pair(2086,'R')->>'intensityPercent')::integer,78,'season intensity uses season numerator and denominator');
select is((pg_temp.fixture_pair(2087,'R')->>'rivalryLength')::integer,0,'later ordinary encounters do not add length');
select is((pg_temp.fixture_pair(2087,'R')->>'historicalRivalry')::boolean,true,'history survives a zero-takeover season');
select is((pg_temp.fixture_pair(2087,'R')->>'formalRivalryInScope')::boolean,false,'history is not a seasonal rivalry');
select is((pg_temp.fixture_pair(2087,'R')->>'comparableH2hEvents')::integer,1,'DNF-only encounter excluded from E');
select is((pg_temp.fixture_pair(2087,'R')->>'rivalryScore')::integer,0,'season does not borrow historical score');
select is(pg_temp.fixture_pair(2088,'R'),null::jsonb,'no encounter means no seasonal pair');
select is((pg_temp.fixture_pair(2089,'R')->>'comparableH2hEvents')::integer,0,'missing membership not comparable');
select is((pg_temp.fixture_pair(2089,'R')->>'totalDirectTakeovers')::integer,0,'noncomparable takeovers excluded from T too');
select is((pg_temp.fixture_pair(2089,'R')->>'canonicalDirectTakeovers')::integer,3,'canonical facts preserved independently');
select is((pg_temp.fixture_pair(2089,'R')->>'rivalryLength')::integer,1,'canonical formal qualification unchanged');
select is((pg_temp.fixture_pair(null,'R')->>'rivalryLength')::integer,3,'All-Time length includes every qualifying event');
select is((pg_temp.fixture_pair(null,'R')->>'firstRivalryEventDateAllTime')::date,'2086-01-01'::date,'first all-time date');
select is((select current_progress::integer from public.get_rivalry_badge_progress()
  where player_id=md5('r66-RA')::uuid),3,'unchanged badge counts repeated opponent rivalry events');
select ok(not exists (
 select 1 from snapshots s cross join lateral jsonb_array_elements(s.payload->'pairs') p
 where (p->>'h2hWinsA')::integer+(p->>'h2hWinsB')::integer+(p->>'ties')::integer
   <> (p->>'comparableH2hEvents')::integer
),'H2H partitions comparable events');
select is(public.get_rivalry_hub_v2(2086),public.get_rivalry_hub_v2(2086),'snapshot order is deterministic');
select is(payload->'pairs', (
  select coalesce(jsonb_agg(p order by (p->>'rivalryScore')::numeric desc,
    (p->>'rivalryLength')::integer desc,(p->>'totalDirectTakeovers')::numeric desc,
    (p->>'comparableH2hEvents')::integer desc,(p->>'playerAId')::uuid,(p->>'playerBId')::uuid),'[]'::jsonb)
  from jsonb_array_elements(payload->'pairs') p
),'score order and all deterministic tie-breakers') from snapshots;
select * from finish();
rollback;
