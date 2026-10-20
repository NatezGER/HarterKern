-- LOCAL disposable database only, with migrations through 073 and pgTAP.
-- Never execute synthetic fixtures against production.
begin;
create extension if not exists pgtap;
select no_plan();

create temporary table beer_setup as
select public.sync_start_event_v5(
  'Beer snapshot fixture', current_date,
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
select is((select beer_brand from public.events where id=pg_temp.beer_event()), 'Flensburger Pilsener', 'start trims beer');
select ok((select awards_trophies and trophy_competition_key='denmark' and trophy_competition_year=2026
  from public.events where id=pg_temp.beer_event()), 'trophy start preserved');
select is((select jsonb_array_length(payload->'participants') from beer_setup), 2, 'regular and guest start preserved');

select public.sync_create_event_attempt(pg_temp.beer_attempt(1),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',300,false,now());
select public.sync_create_event_attempt(pg_temp.beer_attempt(2),pg_temp.beer_event(),pg_temp.beer_person('guest'),'guest',null,true,now());
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)), 'Flensburger Pilsener', 'valid time snapshots default');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(2)), 'Flensburger Pilsener', 'guest DNF snapshots default');

select public.sync_update_event_v3(pg_temp.beer_event(),'Beer snapshot fixture',current_date,true,' Astra Urtyp ',true);
select is((select beer_brand from public.events where id=pg_temp.beer_event()), 'Astra Urtyp', 'event edit trims default');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)), 'Flensburger Pilsener', 'event edit preserves existing snapshot');
select public.sync_create_event_attempt(pg_temp.beer_attempt(3),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',290,false,now());
select public.sync_create_event_attempt(pg_temp.beer_attempt(4),pg_temp.beer_event(),pg_temp.beer_person('guest'),'guest',310,false,now());
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(3)), 'Astra Urtyp', 'next regular attempt uses new default');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(4)), 'Astra Urtyp', 'next guest attempt uses new default');

select public.sync_update_event_attempt_v2(pg_temp.beer_attempt(1),pg_temp.beer_person('permanent'),'permanent',300,false,now(),'  Individual beer  ',true);
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)), 'Individual beer', 'individual override trimmed');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(2)), 'Flensburger Pilsener', 'other attempt unchanged');
select public.sync_update_event_attempt_v2(pg_temp.beer_attempt(1),pg_temp.beer_person('permanent'),'permanent',299,false,now());
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)), 'Individual beer', 'omitted beer preserves override');
select public.sync_update_event_v3(pg_temp.beer_event(),'Beer snapshot fixture',current_date,true,'New default',true);
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)), 'Individual beer', 'later event edit preserves individual override');
select public.sync_update_event_v3(pg_temp.beer_event(),'Renamed',current_date,true);
select is((select beer_brand from public.events where id=pg_temp.beer_event()), 'New default', 'omitted event beer preserves default');
select public.sync_update_event_attempt_v2(pg_temp.beer_attempt(2),pg_temp.beer_person('guest'),'guest',null,true,now(),'  ',true);
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(2)), null::text, 'blank guest admin field clears to NULL');
select public.sync_update_event_attempt_v2(pg_temp.beer_attempt(1),pg_temp.beer_person('permanent'),'permanent',299,false,now(),null,true);
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)), null::text, 'explicit NULL clears regular snapshot');
select public.sync_update_event_v3(pg_temp.beer_event(),'Beer snapshot fixture',current_date,true,' ',true);
select public.sync_create_event_attempt(pg_temp.beer_attempt(5),pg_temp.beer_event(),pg_temp.beer_person('permanent'),'permanent',null,true,now());
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(5)), null::text, 'no default produces NULL snapshot');
select ok((select is_dnf from public.attempts where id=pg_temp.beer_attempt(5)), 'regular DNF still works');
select public.sync_close_event(pg_temp.beer_event(),'manual');
select is((select status::text from public.events where id=pg_temp.beer_event()), 'closed', 'event closure unchanged');

-- Backwards-compatible start without the optional parameter.
create temporary table beer_omitted as
select public.sync_start_event_v5('No beer', current_date,
  '[{"clientId":"p2","name":"Beer omitted regular","kind":"permanent"}]'::jsonb) payload;
select is((select e.beer_brand from public.events e join beer_omitted s on e.id=(s.payload->>'eventId')::uuid), null::text, 'omitted start beer is NULL');
select public.sync_close_event((payload->>'eventId')::uuid,'manual') from beer_omitted;
create temporary table beer_blank as
select public.sync_start_event_v5('Blank beer', current_date,
  '[{"clientId":"p3","name":"Beer blank regular","kind":"permanent"}]'::jsonb,
  p_beer_brand => '   ') payload;
select is((select e.beer_brand from public.events e join beer_blank s on e.id=(s.payload->>'eventId')::uuid), null::text, 'blank start beer is NULL');

select throws_ok(
  format('update public.events set beer_brand=%L where id=%L', repeat('x',81),pg_temp.beer_event()),
  '23514', null, 'database rejects overlong event beer');
select throws_ok(
  format('update public.attempts set beer_brand=%L where id=%L', repeat('x',81),pg_temp.beer_attempt(1)),
  '23514', null, 'database rejects overlong attempt beer');

-- 073: a running event must not fill even empty snapshots.
select public.sync_update_event_v4((payload->>'eventId')::uuid,'Blank beer',current_date,false,'Active beer',true) from beer_blank;
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)),null::text,'unrelated event unchanged');
-- Reuse closed event with individual snapshots, guest DNF and NULLs.
select public.sync_update_event_v4(pg_temp.beer_event(),'Beer snapshot fixture',current_date,true,'Closed beer',true);
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)),'Closed beer','closed edit fills empty regular snapshot');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(2)),'Closed beer','closed edit fills empty guest DNF snapshot');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(3)),'Astra Urtyp','closed edit preserves nonempty override');
select public.sync_update_event_v4(pg_temp.beer_event(),'Beer snapshot fixture',current_date,true,null,true);
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)),'Closed beer','clearing default preserves snapshots');
-- Same helper as migration's one-time invocation: already assigned default, no UI re-edit.
update public.events set beer_brand='Previously assigned' where id=pg_temp.beer_event();
update public.attempts set beer_brand=' ' where id=pg_temp.beer_attempt(1);
update public.attempts set beer_brand=null,deleted_at=now() where id=pg_temp.beer_attempt(5);
select is(public.backfill_closed_event_beer(pg_temp.beer_event()),1::bigint,'one-time helper fills only remaining blank');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(5)),null::text,'deleted attempt is not backfilled');
select is(public.backfill_closed_event_beer(pg_temp.beer_event()),0::bigint,'backfill is idempotent');
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(1)),'Previously assigned','already assigned historical default picked up');

-- Active event with a genuinely empty attempt remains empty after an edit.
select public.sync_create_event_attempt(pg_temp.beer_attempt(6),(payload->>'eventId')::uuid,
  (payload->'participants'->0->>'participantId')::uuid,'permanent',300,false,now()) from beer_blank;
update public.attempts set beer_brand=null where id=pg_temp.beer_attempt(6);
select public.sync_update_event_v4((payload->>'eventId')::uuid,'Blank beer',current_date,false,'Changed active',true) from beer_blank;
select is((select beer_brand from public.attempts where id=pg_temp.beer_attempt(6)),null::text,'active edit does not backfill old attempts');
select ok(not has_function_privilege('anon','public.backfill_closed_event_beer(uuid)','execute'),'public cannot invoke all-event backfill');
select * from finish();
rollback;
