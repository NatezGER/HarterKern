-- Disposable LOCAL database only, migrations through 072 + pgTAP.
-- Synthetic fixtures; never execute in production. No permanent changes.
begin;
create extension if not exists pgtap;
select no_plan();
create function pg_temp.bid(n integer) returns uuid language sql immutable as $$
  select ('72000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
$$;
insert into public.players(id,display_name,is_ak,is_archived) values
 (pg_temp.bid(1),'Beer72 Paul',false,false),(pg_temp.bid(2),'Beer72 Fipsi',false,false),
 (pg_temp.bid(3),'Beer72 AK',true,false),(pg_temp.bid(4),'Beer72 Archived',false,true);
insert into public.events(id,name,start_date,started_at,ends_at,status,closed_at,beer_brand) values
 (pg_temp.bid(101),'Beer72 season','2026-06-01','2026-06-01 00:00Z','2026-06-02 00:00Z','closed','2026-06-02 00:00Z','Unused event default'),
 (pg_temp.bid(102),'Beer72 next','2027-06-01','2027-06-01 00:00Z','2027-06-02 00:00Z','closed','2027-06-02 00:00Z','Unused event default'),
 (pg_temp.bid(103),'Beer72 deleted','2026-06-01','2026-06-01 00:00Z','2026-06-02 00:00Z','closed','2026-06-02 00:00Z',null);
update public.events set deleted_at=now() where id=pg_temp.bid(103);
insert into public.event_participants(event_id,player_id)
 select pg_temp.bid(e),pg_temp.bid(p) from generate_series(101,103) e cross join generate_series(1,4) p;
insert into public.event_guests(id,event_id,display_name) values
 (pg_temp.bid(201),pg_temp.bid(101),'Beer72 Guest'),
 (pg_temp.bid(202),pg_temp.bid(102),'Beer72 Guest');

create function pg_temp.ba(n integer,p integer,g integer,e integer,t integer,b text,ak boolean default false)
returns void language sql as $$
 insert into public.attempts(id,player_id,guest_id,event_id,status,time_hundredths,is_dnf,is_ak,submitted_at,approved_at,beer_brand)
 values(pg_temp.bid(1000+n),pg_temp.bid(p),pg_temp.bid(g),pg_temp.bid(e),'approved',t,t is null,ak,
   '2026-06-01 01:00Z'::timestamptz+n*interval '1 minute','2026-06-01 01:00Z',b)
$$;
-- Two snapshots within the same event; NULL beer still contributes to overall Ø.
select pg_temp.ba(1,1,null,101,200,'__beer72__Flensburger');
select pg_temp.ba(2,1,null,101,300,'__beer72__Flensburger');
select pg_temp.ba(3,1,null,101,100,'__beer72__Flensburger Pilsener');
select pg_temp.ba(4,1,null,101,500,null);
select pg_temp.ba(5,2,null,101,300,'__beer72__Flensburger');
select pg_temp.ba(6,2,null,101,400,'__beer72__Flensburger');
select pg_temp.ba(7,2,null,101,100,null);
select pg_temp.ba(8,3,null,101,40,'__beer72__Flensburger');
select pg_temp.ba(9,null,201,101,50,'__beer72__Flensburger');
select pg_temp.ba(10,1,null,101,30,'__beer72__Flensburger',true);
select pg_temp.ba(11,1,null,101,null,'__beer72__Flensburger');
select pg_temp.ba(12,1,null,101,1,'__beer72__Flensburger');
update public.attempts set deleted_at=now() where id=pg_temp.bid(1012);
select pg_temp.ba(13,1,null,101,1,'__beer72__Flensburger');
update public.attempts set status='pending',approved_at=null where id=pg_temp.bid(1013);
select pg_temp.ba(14,1,null,103,1,'__beer72__Flensburger');
select pg_temp.ba(15,4,null,101,20,'__beer72__Flensburger');
-- Event-date scope, NOT attempt timestamp: these belong exclusively to 2027.
select pg_temp.ba(16,1,null,102,1000,'__beer72__Flensburger');
select pg_temp.ba(17,1,null,102,1000,'__beer72__Flensburger');
select pg_temp.ba(18,null,201,101,1,' ');
select pg_temp.ba(19,1,null,null,1,'__beer72__Standalone');
select pg_temp.ba(20,null,202,102,50,'__beer72__Flensburger');

create temporary table beer72_snap as
 select 2026 yr,public.get_beer_statistics_dashboard(2026) data union all
 select 2027,public.get_beer_statistics_dashboard(2027) union all
 select null::integer,public.get_beer_statistics_dashboard(null);
create function pg_temp.bb(y integer,b text) returns jsonb language sql as $$
 select v from beer72_snap s,lateral jsonb_array_elements(s.data->'brands') v
 where s.yr is not distinct from y and v->>'brand'=b
$$;
create function pg_temp.bf(y integer,p integer) returns jsonb language sql as $$
 select v from beer72_snap s,lateral jsonb_array_elements(s.data->'favorites') v
 where s.yr is not distinct from y and v->>'playerId'=pg_temp.bid(p)::text
$$;
select is((pg_temp.bb(2026,'__beer72__Flensburger')->>'attempts')::integer,8,'consumption: regular + guest + AK including attempt-AK and archived; no DNF/deleted/pending');
select is((pg_temp.bb(2026,'__beer72__Flensburger')->>'attempts')::numeric*0.2,1.6::numeric,'each valid documented attempt is 0.2L');
select is((pg_temp.bb(2026,'__beer72__Flensburger')->>'performanceAttempts')::integer,4,'only canonical regular performance attempts');
select is((pg_temp.bb(2026,'__beer72__Flensburger')->>'averageHundredths')::numeric,300::numeric,'guest/AK/DNF/deleted/archived excluded from mean');
select is((pg_temp.bb(2026,'__beer72__Flensburger')->>'bestHundredths')::integer,200,'guest/AK/DNF excluded from best');
select is(pg_temp.bb(2026,'__beer72__Flensburger Pilsener')->>'qualified','false','one sample raw only');
select is((pg_temp.bb(2026,'__beer72__Flensburger Pilsener')->>'averageHundredths')::numeric,100::numeric,'one sample raw mean remains visible');
select is(pg_temp.bb(2026,'__beer72__Flensburger Pilsener')->'bestPlayer','null'::jsonb,'no best player for single sample');
select is(pg_temp.bb(2026,'__beer72__Flensburger Pilsener')->'performancePosition','null'::jsonb,'no ranked award for single sample');
select is(pg_temp.bb(2026,'__beer72__Flensburger')->>'qualified','true','two or more performance samples qualify');
select is(pg_temp.bb(2026,'__beer72__Flensburger')->'bestPlayer'->>'playerId',pg_temp.bid(1)::text,'best player lowest qualified mean');
select is(pg_temp.bb(2026,'__beer72__Flensburger')->'mostDrinker'->>'playerId',pg_temp.bid(1)::text,'consumption includes attempt-AK when selecting most drinker');
select is(pg_temp.bf(2026,1)->>'brand','__beer72__Flensburger','single faster sample cannot become favorite');
select is((pg_temp.bf(2026,1)->>'overallAverageHundredths')::numeric,275::numeric,'overall mean includes 500 without beer');
select is((pg_temp.bf(2026,1)->>'averageHundredths')::numeric,250::numeric,'beer mean contains only selected brand');
select is((pg_temp.bf(2026,1)->>'effectHundredths')::numeric,-25::numeric,'negative effect means faster');
select ok((pg_temp.bf(2026,2)->>'effectHundredths')::numeric>0,'slower favorite yields positive delta');
select ok(not exists(select 1 from beer72_snap s,lateral jsonb_array_elements(s.data->'effects') v
 where s.yr=2026 and v->>'playerId'=pg_temp.bid(2)::text),'positive improvement ranking excludes slower favorites');
select is((pg_temp.bb(2027,'__beer72__Flensburger')->>'averageHundredths')::numeric,1000::numeric,'season uses event start year, not attempt timestamp');
select is((pg_temp.bb(null,'__beer72__Flensburger')->>'attempts')::integer,11,'All-Time includes both seasons');
select is((pg_temp.bb(null,'__beer72__Flensburger')->>'people')::integer,5,'guest normalized identity deduplicates across events');
select is((pg_temp.bb(null,'__beer72__Flensburger')->>'events')::integer,2,'distinct nondeleted events');
select is(pg_temp.bb(2026,'Unused event default'),null::jsonb,'event default never supplies a missing snapshot');
select is(pg_temp.bb(2026,'__beer72__Standalone'),null::jsonb,'standalone attempts excluded');
select is(pg_temp.bb(2026,' '),null::jsonb,'blank brand excluded');
select ok(pg_temp.bb(2026,'__beer72__Flensburger') is not null and pg_temp.bb(2026,'__beer72__Flensburger Pilsener') is not null,'free-text spellings remain separate');
select ok(not exists(select 1 from beer72_snap s,lateral jsonb_array_elements(s.data->'variety') v
 where s.yr=2026 and v->>'playerId' in(pg_temp.bid(3)::text,pg_temp.bid(4)::text)),'AK/archived excluded from personal variety');
select is((select (v->>'brands')::integer from beer72_snap s,lateral jsonb_array_elements(s.data->'variety') v
 where s.yr=2026 and v->>'playerId'=pg_temp.bid(1)::text),2,'variety includes a brand with one sample');
select is((public.get_beer_statistics_dashboard(1800)->'brands'),'[]'::jsonb,'unsupported/empty season has empty arrays');

-- Favorite tie-breaks: count first, then best, then exact brand text.
select pg_temp.ba(21,1,null,101,250,'__beer72__C');
select pg_temp.ba(22,1,null,101,250,'__beer72__C');
select pg_temp.ba(23,1,null,101,250,'__beer72__C');
update beer72_snap set data=public.get_beer_statistics_dashboard(yr);
select is(pg_temp.bf(2026,1)->>'brand','__beer72__C','same mean: more samples wins');
select pg_temp.ba(24,1,null,101,200,'__beer72__D');
select pg_temp.ba(25,1,null,101,250,'__beer72__D');
select pg_temp.ba(26,1,null,101,300,'__beer72__D');
update beer72_snap set data=public.get_beer_statistics_dashboard(yr);
select is(pg_temp.bf(2026,1)->>'brand','__beer72__D','same mean and count: faster best wins');
select pg_temp.ba(27,1,null,101,200,'__beer72__A');
select pg_temp.ba(28,1,null,101,250,'__beer72__A');
select pg_temp.ba(29,1,null,101,300,'__beer72__A');
update beer72_snap set data=public.get_beer_statistics_dashboard(yr);
select is(pg_temp.bf(2026,1)->>'brand','__beer72__A','remaining tie: deterministic brand name');
-- Qualify previously single-sample brand with a genuinely lower mean.
select pg_temp.ba(30,1,null,101,200,'__beer72__Flensburger Pilsener');
update beer72_snap set data=public.get_beer_statistics_dashboard(yr);
select is(pg_temp.bf(2026,1)->>'brand','__beer72__Flensburger Pilsener','lower mean wins once second sample qualifies');
select is(pg_temp.bb(2026,'__beer72__Flensburger Pilsener')->>'qualified','true','second sample qualifies brand');
select is(pg_temp.bb(2026,'__beer72__Flensburger Pilsener')->>'performancePosition','1','qualified lowest average ranks first');

-- A stored override is authoritative; changing event defaults has no effect.
update public.events set beer_brand='Never use this default' where id=pg_temp.bid(101);
update public.attempts set beer_brand='__beer72__Override' where id=pg_temp.bid(1001);
update beer72_snap set data=public.get_beer_statistics_dashboard(yr);
select is((pg_temp.bb(2026,'__beer72__Override')->>'attempts')::integer,1,'individual snapshot override appears under its own brand');
select is((pg_temp.bb(2026,'__beer72__Flensburger')->>'attempts')::integer,7,'override removes only its original snapshot contribution');
select is(pg_temp.bb(2026,'Never use this default'),null::jsonb,'changed event default not used retroactively');
select * from finish();
rollback;
