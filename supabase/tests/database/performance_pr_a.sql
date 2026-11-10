-- Isolated disposable LOCAL database only, migrations through 076 + pgTAP.
-- Synthetic fixtures are rolled back. Never run against production.
begin;
create extension if not exists pgtap;
select no_plan();
create function pg_temp.pid(n integer) returns uuid language sql immutable as $$
 select ('76000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
$$;
create function pg_temp.metric(payload jsonb, k text) returns jsonb language sql immutable as $$
 select m from jsonb_array_elements(payload->'metrics') m where m->>'key'=k
$$;
create function pg_temp.entry(payload jsonb, k text, n integer) returns jsonb language sql stable as $$
 select r from jsonb_array_elements(pg_temp.metric(payload,k)->'rankings') r
 where r->>'playerId'=pg_temp.pid(n)::text
$$;
insert into public.players(id,display_name)
select pg_temp.pid(n),'PR A fixture '||n from generate_series(1,6) n;
insert into public.events(id,name,start_date,started_at,ends_at,status,closed_at)
select pg_temp.pid(100+n),'PR A event '||n,make_date(2093,1,n),
 make_date(2093,1,n)::timestamptz,make_date(2093,1,n+1)::timestamptz,
 'closed',make_date(2093,1,n+1)::timestamptz from generate_series(1,3) n;
insert into public.event_participants(event_id,player_id)
select pg_temp.pid(100+e),pg_temp.pid(p) from generate_series(1,3) e cross join generate_series(1,6) p;
-- Differences 5, 6, 10, 11, 0; then a DNF barrier followed by an equal time.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(1000+n),pg_temp.pid(1),pg_temp.pid(101),'approved',t,t is null,
 '2093-01-01 00:00Z'::timestamptz+n*interval '1 minute',
 '2093-01-01 00:00Z'::timestamptz+n*interval '1 minute'
from (values (1,200),(2,205),(3,211),(4,221),(5,232),(6,232),(7,null),(8,232)) v(n,t);
-- Equal time in another event must not become an adjacent pair.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
values (pg_temp.pid(1100),pg_temp.pid(1),pg_temp.pid(102),'approved',232,false,'2093-01-02 00:00Z','2093-01-02 00:00Z'),
 (pg_temp.pid(1101),pg_temp.pid(1),pg_temp.pid(103),'approved',232,false,'2093-01-03 00:00Z','2093-01-03 00:00Z');
-- Five rows with a DNF, followed by four rows in another event: no five-window.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(2000+e*10+n),pg_temp.pid(2),pg_temp.pid(100+e),'approved',
 case when e=1 and n=3 then null else 100 end,e=1 and n=3,
 make_date(2093,1,e)::timestamptz+n*interval '1 minute',make_date(2093,1,e)::timestamptz+n*interval '1 minute'
from generate_series(1,2) e cross join lateral generate_series(1,case when e=1 then 5 else 4 end) n;
-- DNF qualification: nine versus ten; the ten-attempt player has no DNF.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(3000+p*100+n),pg_temp.pid(p),pg_temp.pid(101),'approved',400+n,false,
 '2093-01-01 00:00Z'::timestamptz+n*interval '1 minute','2093-01-01 00:00Z'::timestamptz+n*interval '1 minute'
from generate_series(3,4) p cross join lateral generate_series(1,case when p=3 then 9 else 10 end) n;
-- Equal averages in multiple windows/events: earliest event and window win.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(5000+e*100+n),pg_temp.pid(5),pg_temp.pid(100+e),'approved',220+mod(n-1,5)*10,false,
 make_date(2093,1,e)::timestamptz+n*interval '1 minute',make_date(2093,1,e)::timestamptz+n*interval '1 minute'
from generate_series(1,2) e cross join generate_series(1,10) n;
-- Strict threshold boundaries and an event in another season.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.pid(6000+n),pg_temp.pid(6),pg_temp.pid(103),'approved',t,false,
 '2093-01-03 00:00Z'::timestamptz+n*interval '1 minute','2093-01-03 00:00Z'::timestamptz+n*interval '1 minute'
from (values (1,199),(2,200),(3,250),(4,300),(5,400),(6,500)) v(n,t);
create temporary table result as select public.get_statistics_performance_dashboard(2093) payload;
select is(pg_temp.entry(payload,'near-repeat',1)->>'count','4','0.05/0.06/0.10/equal count, 0.11 does not') from result;
select is(pg_temp.entry(payload,'near-repeat',1)->>'total','5','DNF and event change do not create extra pairs') from result;
select is((pg_temp.entry(payload,'near-repeat',1)->>'value')::numeric,80::numeric,'near repeat ratio') from result;
select is(pg_temp.entry(payload,'matrix-glitch',1)->>'value','1','only direct identical personal pair counts') from result;
select is((select value from public.get_statistics_sequence_metrics(array[pg_temp.pid(1)],2093,null) where metric_key='matrix-glitch'),1::numeric,'shared glitch definition unchanged');
select ok(pg_temp.entry(payload,'dnf',3) is null,'nine attempts do not qualify') from result;
select is(pg_temp.entry(payload,'dnf',4)->>'total','10','ten attempts qualify') from result;
select is((pg_temp.entry(payload,'dnf',4)->>'value')::numeric,0::numeric,'zero DNF remains zero') from result;
select is((pg_temp.entry(payload,'dnf',1)->>'value')::numeric,10::numeric,'one DNF in ten official attempts') from result;
select ok(pg_temp.entry(payload,'best-five-window',2) is null,'DNF and event boundary interrupt five-window') from result;
select is(pg_temp.entry(payload,'best-five-window',5)->'windowEvidence'->>'eventId',pg_temp.pid(101)::text,'tied evidence chooses earliest event') from result;
select is(pg_temp.entry(payload,'best-five-window',5)->'windowEvidence'->>'startAttempt','1','tied evidence chooses earliest window') from result;
select is(pg_temp.entry(payload,'best-five-window',5)->'windowEvidence'->>'endAttempt','5','window has exactly five numbered attempts') from result;
select is(pg_temp.entry(payload,'best-five-window',5)->'windowEvidence'->'times','[220,230,240,250,260]'::jsonb,'all concrete times in order') from result;
select is(pg_temp.entry(payload,'best-five-window',5)->'windowEvidence'->>'averageHundredths',pg_temp.entry(payload,'best-five-window',5)->>'value','evidence average matches ranking') from result;
select is(pg_temp.entry(payload,'best-five-window',5)->>'value','240','unchanged best-five ranking') from result;
select is(pg_temp.entry(payload,k,6)->>'count',expected::text,'strict threshold '||k)
from result cross join (values ('sub5',5),('sub4',4),('sub3',3),('sub25',2),('sub2',1)) v(k,expected);
select is(pg_temp.entry(payload,'sub5',6)->>'total','6','threshold denominator includes every valid event attempt') from result;
select ok(pg_temp.entry(public.get_statistics_performance_dashboard(2092),'near-repeat',1) is null,'other season has no sequence');
select is(pg_temp.entry(public.get_statistics_performance_dashboard(null),'near-repeat',1)->>'count','4','All-Time same event boundaries');

-- Compare emitted first-hit rankings with the canonical sources in both scopes.
-- This remains valid even when migrations seed existing league data.
create temporary table hunter_expected as
select null::integer season,first_player_id player_id,count(*)::numeric hits
from public.most_wanted_endings where achieved and not first_is_guest and first_player_id is not null group by first_player_id
union all
select 2026,first_player_id,count(*)::numeric from public.season_most_wanted_endings
where season_year=2026 and achieved and not first_is_guest and first_player_id is not null group by first_player_id;
select ok(not exists (
 select 1 from (values (null::integer),(2026)) scope(y)
 cross join lateral jsonb_array_elements(pg_temp.metric(public.get_statistics_performance_dashboard(y),'most-wanted-firsts')->'rankings') r
 left join hunter_expected h on h.season is not distinct from y and h.player_id=(r->>'playerId')::uuid
 where h.hits is null or h.hits<>(r->>'value')::numeric
),'Most Wanted rows are canonical first-hit counts, not repeated or BINGO hits');
select ok(not exists (
 select 1 from (values (null::integer),(2026)) scope(y)
 cross join lateral jsonb_array_elements(pg_temp.metric(public.get_statistics_performance_dashboard(y),'most-wanted-firsts')->'rankings') r
 where (r->>'rank')::integer <> 1+(select count(*) from hunter_expected h
   where h.season is not distinct from y and h.hits>(r->>'value')::numeric)
),'Most Wanted equal values share competition rank');
select is(jsonb_array_length(coalesce(pg_temp.metric(public.get_statistics_performance_dashboard(y),'most-wanted-firsts')->'rankings','[]'::jsonb)),
 least(10,(select count(*)::integer from hunter_expected h where h.season is not distinct from y)),
 'Most Wanted includes every canonical hunter up to the payload cutoff')
from (values (null::integer),(2026)) scope(y);
select * from finish();
rollback;
