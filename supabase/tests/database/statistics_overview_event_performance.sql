-- Disposable LOCAL test database only, migrated through 069, with pgTAP.
-- Synthetic regression fixtures, never execute against production.
begin;
create extension if not exists pgtap;
select no_plan();

create function pg_temp.pid(n integer) returns uuid language sql immutable as $$
  select ('69000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
$$;
create function pg_temp.metric(payload jsonb, metric_key text) returns jsonb language sql immutable as $$
  select m from jsonb_array_elements(payload->'metrics') m where m->>'key'=metric_key
$$;
create function pg_temp.ranking(payload jsonb, metric_key text, n integer) returns jsonb language sql stable as $$
  select r from jsonb_array_elements(pg_temp.metric(payload,metric_key)->'rankings') r
  where r->>'playerId'=pg_temp.pid(n)::text
$$;

insert into public.players(id,display_name,is_ak,is_archived)
select pg_temp.pid(n), case when n=1 then 'ZZ sample 84' else 'AA stats fixture '||n end,
 n=18,n=19
from generate_series(1,19) n;
insert into public.players(id,display_name) values
 (pg_temp.pid(50),'Bingo five'),(pg_temp.pid(51),'Bingo three'),(pg_temp.pid(52),'Bingo one');
insert into public.events(id,name,start_date,started_at,ends_at,status,closed_at)
select pg_temp.pid(100+n),'Stats fixture '||n,make_date(2092+n,1,1),
 make_date(2092+n,1,1)::timestamptz,make_date(2092+n,1,2)::timestamptz,
 'closed',make_date(2092+n,1,2)::timestamptz from generate_series(0,2) n;
insert into public.event_participants(event_id,player_id)
select e.id,p.id from public.events e cross join public.players p
where e.id in (pg_temp.pid(100),pg_temp.pid(101),pg_temp.pid(102))
 and p.id::text like '69000000-0000-0000-0000-%';

-- A: 84 valid + 2 DNF. B: 20 valid. C: 20 starts of which 3 DNF.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(1000+p*100+n),pg_temp.pid(p),pg_temp.pid(101),'approved',
 case when (p=1 and n>84) or (p=3 and n>17) then null
   when p=1 then 199+n when p=2 then 300+n else 500+n end,
 (p=1 and n>84) or (p=3 and n>17),
 '2093-01-01 00:00Z'::timestamptz+n*interval '1 minute',
 '2093-01-01 00:00Z'::timestamptz+n*interval '1 minute'
from generate_series(1,3) p cross join lateral generate_series(1,case when p=1 then 86 else 20 end) n;
-- Two historical times explain the old 86 denominator, not the two DNFs.
insert into public.historical_attempts(player_id,display_name,attempt_date,time_hundredths)
values (pg_temp.pid(1),'ZZ sample 84','2093-01-01',290),(pg_temp.pid(1),'ZZ sample 84','2093-01-01',291);
-- Exact repeats 3 versus 2; tied modal times choose the faster example.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(2000+n),pg_temp.pid(p),pg_temp.pid(101),'approved',t,false,
 '2093-01-01 03:00Z'::timestamptz+n*interval '1 minute',
 '2093-01-01 03:00Z'::timestamptz+n*interval '1 minute'
from (values (1,4,284),(2,4,284),(3,4,284),(4,4,291),
 (5,5,270),(6,5,270),(7,5,285),(8,5,285)) v(n,p,t);
-- >10 equal rates: sample priority must apply BEFORE the top-ten cutoff.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(3000+n),pg_temp.pid(n),pg_temp.pid(101),'approved',399,false,
 '2093-01-01 04:00Z','2093-01-01 04:00Z'
from generate_series(6,19) n;
-- Excluded AK attempt, rejected attempt and deleted attempt.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,is_ak,deleted_at,submitted_at,approved_at,rejected_at)
values (pg_temp.pid(3100),pg_temp.pid(1),pg_temp.pid(101),'approved',100,false,true,null,'2093-01-01 05:00Z','2093-01-01 05:00Z',null),
 (pg_temp.pid(3101),pg_temp.pid(1),pg_temp.pid(101),'rejected',100,false,false,null,'2093-01-01 05:01Z',null,'2093-01-01 05:01Z'),
 (pg_temp.pid(3102),pg_temp.pid(1),pg_temp.pid(101),'approved',100,false,false,'2093-01-01 06:00Z','2093-01-01 05:02Z','2093-01-01 05:02Z',null);

create temporary table before_guests as select public.get_statistics_performance_dashboard(2093) payload,
 (select community_valid_attempts from public.season_global_statistics where season_year=2093) community;
insert into public.event_guests(id,event_id,display_name) values
 (pg_temp.pid(4001),pg_temp.pid(101),'Scope Guest'),
 (pg_temp.pid(4002),pg_temp.pid(102),'  scope   guest  ');
insert into public.attempts(id,guest_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(4100+n),pg_temp.pid(4001),pg_temp.pid(101),'approved',
 case when n=3 then null else 111 end,n=3,
 '2093-01-01 06:00Z'::timestamptz+n*interval '1 minute',
 '2093-01-01 06:00Z'::timestamptz+n*interval '1 minute'
from generate_series(1,3) n;

create temporary table performance_result as select public.get_statistics_performance_dashboard(2093) payload;
select is((pg_temp.ranking(payload,'valid',1)->>'value')::numeric,84::numeric,'A: valid excludes DNF/AK/rejected/deleted/history') from performance_result;
select is((pg_temp.ranking(payload,'average',1)->>'count')::numeric,84::numeric,'A: average uses same 84') from performance_result;
select is((select count(*) from public.season_qualified_official_times where season_year=2093 and player_id=pg_temp.pid(1)),86::bigint,'old threshold source includes two historical times, not DNF');
select is(pg_temp.ranking(payload,'sub4',1)->>'total','84','A: sub4 denominator 84') from performance_result;
select is(pg_temp.ranking(payload,'sub4',1)->>'count','84','B: sub4 numerator 84') from performance_result;
select is((pg_temp.ranking(payload,'sub4',1)->>'value')::numeric,100::numeric,'B: sub4 100 percent') from performance_result;
select is(pg_temp.ranking(payload,'sub5',1)->>'total','84','B: sub5 denominator 84') from performance_result;
select is((pg_temp.ranking(payload,'sub5',1)->>'value')::numeric,100::numeric,'B: sub5 100 percent') from performance_result;
select is(pg_temp.ranking(public.get_statistics_performance_dashboard(null),'sub5',1)->>'total','84','All-Time thresholds also exclude historical times');
select is(pg_temp.metric(payload,'sub5')->'rankings'->0->>'playerId',pg_temp.pid(1)::text,'C: 84 samples survives top-ten cutoff despite late name') from performance_result;
select is(pg_temp.metric(payload,'sub5')->'rankings'->1->>'playerId',pg_temp.pid(2)::text,'C: 20 samples before smaller samples') from performance_result;
select is(pg_temp.ranking(payload,'sub5',1)->>'rank',pg_temp.ranking(payload,'sub5',2)->>'rank','C: sample size never splits equal sporting rank') from performance_result;
select is((pg_temp.ranking(payload,'event-max',3)->>'value')::numeric,17::numeric,'D: 20 starts minus 3 DNF gives 17') from performance_result;
select is((pg_temp.ranking(payload,'common',4)->>'value')::numeric,3::numeric,'E: personal repeats 3') from performance_result;
select is(pg_temp.ranking(payload,'common',4)->>'detail','2,84 s','E: own modal time detail') from performance_result;
select is((pg_temp.ranking(payload,'common',5)->>'value')::numeric,2::numeric,'E: personal repeats 2') from performance_result;
select is(pg_temp.ranking(payload,'common',5)->>'detail','2,70 s','E: fastest tied mode') from performance_result;
select ok((pg_temp.ranking(payload,'common',4)->>'rank')::integer < (pg_temp.ranking(payload,'common',5)->>'rank')::integer,'E: three ranks ahead of two') from performance_result;
select is(pg_temp.metric(r.payload,k),pg_temp.metric(b.payload,k),'G: guests do not alter corrected personal metric '||k)
from performance_result r cross join before_guests b
cross join unnest(array['valid','average','sub5','sub4','sub3','sub25','sub2','common','event-max']) k;
select is((select community_valid_attempts from public.season_global_statistics where season_year=2093),community+2,'H: only two valid guest attempts increase community volume') from before_guests;
select is((select guest_count from public.season_global_statistics where season_year=2093),1::bigint,'guest counted once in season');
select is((select count(distinct g.normalized_name) from public.event_guests g where g.id in (pg_temp.pid(4001),pg_temp.pid(4002))),1::bigint,'same canonical guest identity across events');
select is((select closed_event_count from public.season_global_statistics where season_year=2093),1::bigint,'closed event scope');
select ok(not exists(select 1 from performance_result p cross join lateral jsonb_array_elements(p.payload->'metrics') m
 cross join lateral jsonb_array_elements(m->'rankings') r where r->>'playerId' in (pg_temp.pid(18)::text,pg_temp.pid(19)::text,pg_temp.pid(4001)::text)),'AK, archived and guests never appear');
select ok(not exists(select 1 from performance_result p cross join lateral jsonb_array_elements(p.payload->'metrics') m
 cross join lateral jsonb_array_elements(m->'rankings') r where m->>'key' in ('sub5','sub4','sub3','sub25','sub2') and (r->>'count')::numeric=0),'no zero-hit threshold rows');

-- F: actual lines, not badge tiers. Fewer than ten rows prevent extra columns/diagonals.
-- A: two Bronze + one Silver + one Diamond = 9.
-- B: one Gold + two Silver = 7. C: four Bronze = 4.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(50000+p*1000+row_no*100+col*10+hit),pg_temp.pid(p),pg_temp.pid(102),
 'approved',200+row_no*10+col,false,
 '2094-01-01 01:00Z'::timestamptz+(row_no*100+col*10+hit)*interval '1 minute',
 '2094-01-01 01:00Z'::timestamptz+(row_no*100+col*10+hit)*interval '1 minute'
from (values (50,0,1),(50,1,1),(50,2,2),(50,3,5),
 (51,0,3),(51,1,2),(51,2,2),
 (52,0,1),(52,1,1),(52,2,1),(52,3,1)) v(p,row_no,hits)
cross join generate_series(0,9) col
cross join lateral generate_series(1,hits) hit;
-- One row completed at all four color thresholds in another season.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(12000+n*10+hit),pg_temp.pid(50),pg_temp.pid(100),'approved',200+n,false,
 '2092-01-01 01:00Z'::timestamptz+(n*10+hit)*interval '1 minute',
 '2092-01-01 01:00Z'::timestamptz+(n*10+hit)*interval '1 minute'
from generate_series(0,9) n cross join generate_series(1,5) hit;
create temporary table bingo_result as select public.get_statistics_badge_dashboard(2094) payload;
select is(pg_temp.metric(payload,'bingo-lines')->'rankings'->0->>'playerId',pg_temp.pid(50)::text,'F: A ranks first') from bingo_result;
select is(pg_temp.metric(payload,'bingo-lines')->'rankings'->0->>'value','9','F: A two Bronze + Silver + Diamond = 9') from bingo_result;
select is(pg_temp.metric(payload,'bingo-lines')->'rankings'->1->>'playerId',pg_temp.pid(51)::text,'F: B ranks second') from bingo_result;
select is(pg_temp.metric(payload,'bingo-lines')->'rankings'->1->>'value','7','F: B Gold + two Silver = 7') from bingo_result;
select is(pg_temp.metric(payload,'bingo-lines')->'rankings'->2->>'playerId',pg_temp.pid(52)::text,'F: C ranks third') from bingo_result;
select is(pg_temp.metric(payload,'bingo-lines')->'rankings'->2->>'value','4','F: C four Bronze = 4') from bingo_result;
select is(pg_temp.ranking(public.get_statistics_badge_dashboard(2092),'bingo-lines',50)->>'value','5','one Diamond is 5, not 4 or cumulative 11; no season leakage');
select is((pg_temp.ranking(public.get_statistics_badge_dashboard(null),'bingo-lines',50)->>'value')::numeric,
 (select sum(case line_tier when 'diamond' then 5 when 'gold' then 3
   when 'silver' then 2 when 'bronze' then 1 else 0 end)::numeric
  from public.player_bingo_lines where player_id=pg_temp.pid(50)),
 'All-Time points equal all actual canonical lines weighted by highest color, not awards');
select is(pg_temp.ranking(public.get_statistics_badge_dashboard(null),'bingo-lines',50)->>'value','13',
 'All-Time combines hits across seasons: A first row upgrades to Diamond, 5+1+2+5');

select * from finish();
rollback;
