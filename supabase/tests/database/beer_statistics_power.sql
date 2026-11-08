-- LOCAL disposable test DB only, migrations through 074 + pgTAP. Never production.
begin;
create extension if not exists pgtap;
select no_plan();
create function pg_temp.b74(n integer) returns uuid language sql immutable as $$
  select ('74000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid
$$;
insert into public.players(id,display_name,is_ak,is_archived)
select pg_temp.b74(n),'Beer74 Player '||n,n=7,n=8 from generate_series(1,9) n;
insert into public.events(id,name,start_date,started_at,ends_at,status,closed_at,beer_brand) values
(pg_temp.b74(101),'Beer74 2026','2026-06-01','2026-06-01 00:00Z','2026-06-02 00:00Z','closed','2026-06-02 00:00Z','Must not infer'),
(pg_temp.b74(102),'Beer74 2027','2027-06-01','2027-06-01 00:00Z','2027-06-02 00:00Z','closed','2027-06-02 00:00Z',null);
insert into public.event_participants(event_id,player_id)
select pg_temp.b74(e),pg_temp.b74(p) from generate_series(101,102) e cross join generate_series(1,9) p;
insert into public.event_guests(id,event_id,display_name) values(pg_temp.b74(201),pg_temp.b74(101),'Beer74 Guest');
create function pg_temp.add74(n integer,p integer,t integer,b text,e integer default 101)
returns void language sql as $$
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at,beer_brand)
values(pg_temp.b74(1000+n),pg_temp.b74(p),pg_temp.b74(e),'approved',t,t is null,
 '2026-06-01 01:00Z'::timestamptz+n*interval '1 minute','2026-06-01 01:00Z',b)
$$;
create function pg_temp.brand74(b text,y integer default 2026) returns jsonb language sql as $$
select v from jsonb_array_elements(public.get_beer_statistics_dashboard(y)->'brands') v where v->>'brand'=b
$$;
create function pg_temp.rank74(c text,b text,y integer default 2026) returns jsonb language sql as $$
select v from jsonb_array_elements(public.get_beer_statistics_dashboard(y)->'rankings'->c) v where v->>'brand'=b
$$;
select pg_temp.add74(n,1,190+n*10,'__beer74__Power') from generate_series(1,5) n;
select is((pg_temp.brand74('__beer74__Power')->>'powerValue')::numeric,200::numeric,'five attempts from one player contribute only fastest time');
select is((pg_temp.brand74('__beer74__Power')->>'powerPlayerCount')::integer,1,'one distinct contributor');
select is(pg_temp.rank74('power','__beer74__Power'),null::jsonb,'one player never qualifies');
select pg_temp.add74(6,2,220,'__beer74__Power');
select is((pg_temp.brand74('__beer74__Power')->>'powerValue')::numeric,210::numeric,'two players: mean of their PBs');
select ok(pg_temp.rank74('power','__beer74__Power') is not null,'two single attempts from distinct players suffice');
select pg_temp.add74(7,3,240,'__beer74__Power');
select is((pg_temp.brand74('__beer74__Power')->>'powerValue')::numeric,220::numeric,'three players: no padding');
select pg_temp.add74(8,4,260,'__beer74__Power');
select is((pg_temp.brand74('__beer74__Power')->>'powerValue')::numeric,230::numeric,'four players: no padding');
select pg_temp.add74(9,5,280,'__beer74__Power');
select pg_temp.add74(10,6,300,'__beer74__Power');
select is((pg_temp.brand74('__beer74__Power')->>'powerValue')::numeric,240::numeric,'six players: only fastest five');
select is((pg_temp.brand74('__beer74__Power')->>'powerPlayerCount')::integer,5,'count capped at five');
select is((select count(distinct v->>'playerId')::integer from jsonb_array_elements(pg_temp.brand74('__beer74__Power')->'powerPlayers') v),5,'five distinct proof players');
select is(jsonb_array_length(pg_temp.brand74('__beer74__Power')->'fastestPlayers'),6,'full distinct player overview retained');
-- Eligibility exclusions, all faster than the eligible PBs.
select pg_temp.add74(11,7,1,'__beer74__Power');
select pg_temp.add74(12,8,1,'__beer74__Power');
select pg_temp.add74(13,1,null,'__beer74__Power');
select pg_temp.add74(14,1,1,'__beer74__Power');
update public.attempts set is_ak=true where id=pg_temp.b74(1014);
select pg_temp.add74(15,1,1,'__beer74__Power');
update public.attempts set deleted_at=now() where id=pg_temp.b74(1015);
select pg_temp.add74(16,1,1,'__beer74__Power');
update public.attempts set status='pending',approved_at=null where id=pg_temp.b74(1016);
insert into public.attempts(id,guest_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at,beer_brand)
values(pg_temp.b74(1017),pg_temp.b74(201),pg_temp.b74(101),'approved',1,false,'2026-06-01 02:00Z','2026-06-01 02:00Z','__beer74__Power');
select is((pg_temp.brand74('__beer74__Power')->>'powerValue')::numeric,240::numeric,'guests/AK/attempt-AK/archived/DNF/pending/deleted excluded from power');
select is((pg_temp.brand74('__beer74__Power')->>'attempts')::integer,14,'guest and AK remain in consumption, not DNF/pending/deleted');
select is(pg_temp.rank74('record','__beer74__Power')->>'playerId',pg_temp.b74(1)::text,'record holder is regular player');
select is((pg_temp.rank74('record','__beer74__Power')->>'value')::numeric,200::numeric,'single-record brand metric uses fastest eligible time');
select is((select count(*)::integer from jsonb_array_elements(public.get_beer_statistics_dashboard(2026)->'rankings'->'record') v where v->>'brand'='__beer74__Power'),1,'brand occurs only once in individual-record ranking');
select pg_temp.add74(18,1,100,'__beer74__Power',102);
select pg_temp.add74(19,2,120,'__beer74__Power',102);
select is((pg_temp.brand74('__beer74__Power',2027)->>'powerValue')::numeric,110::numeric,'season is event year, not attempt timestamp');
select is((pg_temp.brand74('__beer74__Power',2026)->>'powerValue')::numeric,240::numeric,'other season unchanged');
select is((pg_temp.brand74('__beer74__Power',null)->>'powerValue')::numeric,200::numeric,'All-Time recomputes personal bests before top five');

-- Equal 200 power: count, fastest contributing PB, exact brand name.
select pg_temp.add74(20,1,200,'__beer74__Tie2');
select pg_temp.add74(21,2,200,'__beer74__Tie2');
select pg_temp.add74(22,1,150,'__beer74__Tie3Slow');
select pg_temp.add74(23,2,200,'__beer74__Tie3Slow');
select pg_temp.add74(24,3,250,'__beer74__Tie3Slow');
select pg_temp.add74(25,1,100,'__beer74__Tie3A');
select pg_temp.add74(26,2,200,'__beer74__Tie3A');
select pg_temp.add74(27,3,300,'__beer74__Tie3A');
select pg_temp.add74(28,1,100,'__beer74__Tie3B');
select pg_temp.add74(29,2,200,'__beer74__Tie3B');
select pg_temp.add74(30,3,300,'__beer74__Tie3B');
select is((select array_agg(v->>'brand' order by ord) from jsonb_array_elements(public.get_beer_statistics_dashboard(2026)->'rankings'->'power') with ordinality a(v,ord) where v->>'brand' like '__beer74__Tie%'),
 array['__beer74__Tie3A','__beer74__Tie3B','__beer74__Tie3Slow','__beer74__Tie2']::text[],'deterministic power tie-break chain');
-- Complete baseline, non-favorite brand turbo and brake.
select pg_temp.add74(31,9,100,'__beer74__Favorite');
select pg_temp.add74(32,9,100,'__beer74__Favorite');
select pg_temp.add74(33,9,200,'__beer74__OtherTurbo');
select pg_temp.add74(34,9,200,'__beer74__OtherTurbo');
select pg_temp.add74(35,9,1000,null);
select pg_temp.add74(36,9,900,'__beer74__Brake');
select pg_temp.add74(37,9,900,'__beer74__Brake');
select ok(pg_temp.rank74('turbo','__beer74__OtherTurbo') is not null,'brand turbo includes non-favorite qualified pair');
select is((pg_temp.brand74('__beer74__OtherTurbo')->'turbo'->0->>'overallAttempts')::integer,7,'effect baseline includes NULL beer');
select is(jsonb_array_length(pg_temp.brand74('__beer74__Brake')->'brake'),1,'non-favorite slower pair enters brake');
select is(pg_temp.brand74('Must not infer'),null::jsonb,'never infer snapshots from event standard');
select is((select count(*)::integer from jsonb_array_elements(public.get_beer_statistics_dashboard(2026)->'rankings'->'power') v where v->>'brand'='__beer74__Favorite'),0,'two attempts but one distinct player do not qualify power');
select * from finish();
rollback;
