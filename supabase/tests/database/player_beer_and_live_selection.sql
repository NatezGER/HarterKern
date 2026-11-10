-- LOCAL disposable database only, with migrations through 075 and pgTAP.
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

-- These fixtures must only run in a disposable LOCAL database through 075.
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
select public.sync_update_event_v3(pg_temp.beer_event(),'Beer snapshot fixture','2026-11-09',true,'Changed',true);
select public.sync_create_event_attempt_v2(pg_temp.beer_attempt(10),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',320,false,now());
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(10)),'Changed','omission uses latest default');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(2)),'B','later default change preserves override');
select throws_ok(format('select public.sync_create_event_attempt_v2(%L,%L,%L,%L,200,false,now(),%L,true)',pg_temp.beer_attempt(11),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',repeat('x',81)),'P0001','Biermarke darf maximal 80 Zeichen enthalten.','80 character limit');
select is((select count(*)::int from public.get_event_beer_images(pg_temp.beer_event()) where brand='B'),1,'duplicate and guest brands collapse');
select ok(exists(select 1 from public.get_event_beer_images(pg_temp.beer_event()) where brand='AK'),'AK consumption included');
select ok(not exists(select 1 from public.get_event_beer_images(pg_temp.beer_event()) where brand in ('DNF','Deleted')),'invalid consumption excluded');
select is(public.get_beer_statistics_dashboard_v31(2026)->'rankings',public.get_beer_statistics_dashboard(2026)->'rankings','avatar decoration preserves every ranking');
update public.attempts set beer_brand=null where event_id=pg_temp.beer_event();
select is((select count(*)::int from public.get_event_beer_images(pg_temp.beer_event())),0,'unknown snapshots never imply event default consumption');
update public.attempts set beer_brand='DNF only', is_dnf=true, time_hundredths=null where event_id=pg_temp.beer_event();
select is((select count(*)::int from public.get_event_beer_images(pg_temp.beer_event())),0,'DNF-only event never implies consumption');
select * from finish();
rollback;
