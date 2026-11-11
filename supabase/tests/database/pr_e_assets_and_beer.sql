-- LOCAL disposable database only, with migrations through 079 and pgTAP.
-- Never execute synthetic fixtures against production.
begin;
create extension if not exists pgtap;
select no_plan();

create temporary table beer_setup as
select public.sync_start_event_v5(
  'Beer snapshot fixture', '2026-11-09'::date,
  '[{"clientId":"p","name":"Beer snapshot regular","kind":"permanent"},
    {"clientId":"g","name":"Beer snapshot guest","kind":"guest"}]'::jsonb,
  now(), now() + interval '24 hours', null, true, 'denmark', 2026,
  '  Flensburger Pilsener  '
) payload;
create function pg_temp.beer_event() returns uuid language sql as $$
  select (payload->>'eventId')::uuid from beer_setup
$$;
create function pg_temp.beer_person(kind text) returns uuid language sql as $$
  select (v->>'participantId')::uuid from beer_setup,
    lateral jsonb_array_elements(payload->'participants') v
  where v->>'kind' = kind
$$;
create function pg_temp.beer_attempt(n integer) returns uuid language sql immutable as $$
  select ('71000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
$$;

-- These fixtures must only run in a disposable LOCAL database through 079.
select public.sync_create_event_attempt(pg_temp.beer_attempt(1),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',300,false,now());
select public.sync_create_event_attempt_v2(pg_temp.beer_attempt(2),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',200,false,now(),' B ',true);
select public.sync_create_event_attempt_v2(pg_temp.beer_attempt(3),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',210,false,now(),'B',true);
select public.sync_create_event_attempt_v2(pg_temp.beer_attempt(4),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',200,false,now(),'A',true);
select public.sync_create_event_attempt_v2(pg_temp.beer_attempt(5),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',250,false,now(),null,true);
select public.sync_create_event_attempt_v2(pg_temp.beer_attempt(6),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',null,true,now(),'DNF',true);
select public.sync_create_event_attempt_v2(pg_temp.beer_attempt(7),pg_temp.beer_event(),pg_temp.beer_person('guest'),'guest',100,false,now(),'B',true);
select public.sync_create_event_attempt_v2(pg_temp.beer_attempt(8),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',100,false,now(),'AK',true);
update public.attempts set is_ak=true where id=pg_temp.beer_attempt(8);
select public.sync_create_event_attempt_v2(pg_temp.beer_attempt(9),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',100,false,now(),'Deleted',true);
update public.attempts set deleted_at=now() where id=pg_temp.beer_attempt(9);
select is((select beer_brand from public.events where id=pg_temp.beer_event()),'Flensburger Pilsener','override preserves default');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)),'Flensburger Pilsener','legacy snapshot preserved');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(2)),'B','override trimmed and persisted');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(5)),null::text,'explicit unknown preserved');
select is((public.get_player_beer_profile(pg_temp.beer_person('permanent'),null)->>'validAttempts')::int,5,'personal total includes unknown, excludes guest/AK/DNF/deleted');
select is(public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'beers'->0->>'brand','A','equal PB uses deterministic brand order');
select is(public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'beers'->1->>'brand','B','one brand per slot');
select is((public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'beers'->1->>'bestHundredths')::int,200,'best individual time, not average');
select is((public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'beers'->0->>'attempts')::int,1,'single attempt qualifies');
select is(jsonb_array_length(public.get_player_beer_profile(pg_temp.beer_person('permanent'),null)->'beers'),3,'maximum three brands');
select is((public.get_player_beer_profile(pg_temp.beer_person('permanent'),2027)->>'validAttempts')::int,0,'season exclusion');
select is((public.get_player_beer_profile(pg_temp.beer_person('guest'),null)->>'validAttempts')::int,0,'guest has no personal statistics');

-- Full aggregate uses exactly the same qualified source as the legacy top three.
select is(jsonb_array_length(public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'brandRankings'),3,'only documented valid brands');
select is((public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'brandRankings'->1->>'worstHundredths')::int,210,'slowest actual B attempt');
select is((public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'brandRankings'->1->>'averageHundredths')::numeric,205::numeric,'one common average for both directions');
select is((public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'brandRankings'->1->>'attempts')::int,2,'repeated brand counted once with sample');
select is(public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'brandRankings',public.get_player_beer_profile(pg_temp.beer_person('permanent'),null)->'brandRankings','All-Time matches single season fixture');
select is(public.get_player_beer_profile(pg_temp.beer_person('permanent'),2027)->'brandRankings','[]'::jsonb,'other season empty');
select is(public.get_player_beer_profile(pg_temp.beer_person('guest'),null)->'brandRankings','[]'::jsonb,'no guest brand ranking');
select public.sync_create_event_attempt_v2(pg_temp.beer_attempt(20),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',450,false,now(),'Fourth',true);
select is(jsonb_array_length(public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'beers'),3,'legacy still top three');
select is(jsonb_array_length(public.get_player_beer_profile(pg_temp.beer_person('permanent'),2026)->'brandRankings'),4,'new aggregate is untruncated');

-- Exercise effective constraints on an isolated copy; leave every existing upload unchanged.
create temporary table award_before as select * from public.award_assets;
create temporary table award_probe (like public.award_assets including all);
create function pg_temp.probe_asset(id text, kind text, path text default null, w integer default 512, h integer default 512)
returns void language sql as $$
 insert into award_probe(asset_id,asset_type,storage_path,mime_type,size_bytes,width,height)
 values(id,kind,coalesce(path,id||'/00000000-0000-0000-0000-000000000001.png'),'image/png',1024,w,h)
$$;
select lives_ok(format('select pg_temp.probe_asset(%L,%L)',id,split_part(id,':',1)),'valid slot '||id)
from unnest(array['medal:podium:gold','medal:podium:silver','medal:podium:bronze',
'medal:statistics:gold','medal:statistics:silver','medal:statistics:bronze',
'record:wr','record:sr','record:pb','record:eb','badge:test-badge',
 'trophy:season:2026:gold','trophy:denmark:2026:silver','trophy:historical:first-sub-3',
 'trophy:historical:first-sub-2','trophy:historical:first-bingo-card']) id;
select throws_ok($$select pg_temp.probe_asset('record:unknown','record')$$,'23514',null,'unknown record rejected');
select throws_ok($$select pg_temp.probe_asset('record:wr','medal')$$,'23514',null,'mismatched type rejected');
select throws_ok($$select pg_temp.probe_asset('record:wr','record','arbitrary/file.png')$$,'23514',null,'arbitrary path rejected');
select throws_ok($$select pg_temp.probe_asset('record:wr','record','record:pb/00000000-0000-0000-0000-000000000002.png')$$,'23514',null,'foreign asset path rejected');
select throws_ok($$select pg_temp.probe_asset('record:wr','record',null,512,768)$$,'23514',null,'record must be square');
select throws_ok($$select pg_temp.probe_asset('record:wr','record',null,511,511)$$,'23514',null,'minimum dimensions retained');
select lives_ok($$select pg_temp.probe_asset('trophy:season:2026:bronze','trophy',null,768,1024)$$,'portrait trophy preserved');
select results_eq('select * from public.award_assets order by asset_id','select * from award_before order by asset_id','existing uploads unchanged');
select ok((select relrowsecurity from pg_class where oid='public.award_assets'::regclass),'asset RLS remains enabled');
select ok(not exists(select 1 from pg_policies where schemaname='public' and tablename='award_assets' and cmd in ('ALL','INSERT','UPDATE','DELETE')),'no public write policies introduced');
select * from finish();
rollback;
