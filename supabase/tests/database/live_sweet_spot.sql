-- Disposable LOCAL database only, migrations through 070 + pgTAP.
-- Never run these synthetic fixtures against production.
begin;
create extension if not exists pgtap;
select no_plan();
create function pg_temp.spid(n integer) returns uuid language sql immutable as $$
  select ('70000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid
$$;
insert into public.players(id,display_name,is_ak,is_archived)
select pg_temp.spid(n),'Sweet Spot fixture '||n,n=3,n=4 from generate_series(1,6) n;
insert into public.events(id,name,start_date,started_at,ends_at,status,closed_at)
values
 (pg_temp.spid(100),'Sweet Spot previous','2097-01-01','2097-01-01 00:00Z','2097-01-02 00:00Z','closed','2097-01-02 00:00Z'),
 (pg_temp.spid(101),'Sweet Spot active','2098-01-01','2098-01-01 00:00Z','2098-01-02 00:00Z','active',null),
 (pg_temp.spid(102),'Sweet Spot deleted','2096-01-01','2096-01-01 00:00Z','2096-01-02 00:00Z','closed','2096-01-02 00:00Z');
update public.events set deleted_at='2096-01-03 00:00Z' where id=pg_temp.spid(102);
insert into public.event_participants(event_id,player_id)
select pg_temp.spid(e),pg_temp.spid(p) from generate_series(100,102) e cross join generate_series(1,6) p;
insert into public.event_guests(id,event_id,display_name) values (pg_temp.spid(200),pg_temp.spid(101),'Sweet Spot guest');
-- Identical timestamps deliberately exercise canonical id ordering.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.spid(1000+n),pg_temp.spid(1),pg_temp.spid(100),'approved',t,t is null,
 '2097-01-01 01:00Z','2097-01-01 01:00Z'
from (values(1,700),(2,650),(3,600),(4,null::integer),(5,236),(6,550)) v(n,t);
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select pg_temp.spid(1100+n),pg_temp.spid(1),pg_temp.spid(101),'approved',t,t is null,
 '2098-01-01 01:00Z','2098-01-01 01:00Z'
from (values(1,800),(2,null::integer),(3,750),(4,700)) v(n,t);
-- Tied means with one sample each: lower ordinal wins.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
values
 (pg_temp.spid(1201),pg_temp.spid(2),pg_temp.spid(100),'approved',240,false,'2097-01-01 01:00Z','2097-01-01 01:00Z'),
 (pg_temp.spid(1202),pg_temp.spid(2),pg_temp.spid(100),'approved',240,false,'2097-01-01 01:00Z','2097-01-01 01:00Z'),
 (pg_temp.spid(1203),pg_temp.spid(3),pg_temp.spid(100),'approved',100,false,'2097-01-01 01:00Z','2097-01-01 01:00Z'),
 (pg_temp.spid(1204),pg_temp.spid(4),pg_temp.spid(100),'approved',100,false,'2097-01-01 01:00Z','2097-01-01 01:00Z'),
 (pg_temp.spid(1205),pg_temp.spid(5),pg_temp.spid(100),'approved',null,true,'2097-01-01 01:00Z','2097-01-01 01:00Z'),
 (pg_temp.spid(1206),pg_temp.spid(1),pg_temp.spid(102),'approved',1,false,'2096-01-01 01:00Z','2096-01-01 01:00Z');
-- AK/deleted/pending/rejected attempts cannot consume a chart ordinal.
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_ak,deleted_at,submitted_at,approved_at,rejected_at)
values
 (pg_temp.spid(1301),pg_temp.spid(1),pg_temp.spid(101),'approved',1,true,null,'2098-01-01 00:30Z','2098-01-01 00:30Z',null),
 (pg_temp.spid(1302),pg_temp.spid(1),pg_temp.spid(101),'approved',1,false,'2098-01-01 02:00Z','2098-01-01 00:30Z','2098-01-01 00:30Z',null),
 (pg_temp.spid(1303),pg_temp.spid(1),pg_temp.spid(101),'pending',1,false,null,'2098-01-01 00:30Z',null,null),
 (pg_temp.spid(1304),pg_temp.spid(1),pg_temp.spid(101),'rejected',1,false,null,'2098-01-01 00:30Z',null,'2098-01-01 00:30Z');
insert into public.attempts(id,guest_id,event_id,status,time_hundredths,submitted_at,approved_at)
values(pg_temp.spid(1401),pg_temp.spid(200),pg_temp.spid(101),'approved',1,'2098-01-01 01:00Z','2098-01-01 01:00Z');
-- Standalone historical time must not fabricate an event/ordinal.
insert into public.historical_attempts(player_id,display_name,attempt_date,time_hundredths)
values(pg_temp.spid(1),'Sweet Spot fixture 1','2090-01-01',1);
create temporary table spot_before as select * from public.get_event_sweet_spots(pg_temp.spid(101));
select is((select attempt_number from spot_before where player_id=pg_temp.spid(1)),5,'sweet spot #5');
select is((select average_hundredths from spot_before where player_id=pg_temp.spid(1)),236,'same mean as chart');
select is((select sample_count from spot_before where player_id=pg_temp.spid(1)),1::bigint,'no minimum sample size');
select is((select next_attempt_number from spot_before where player_id=pg_temp.spid(1)),5,'four canonical attempts incl DNF, excluding AK/deleted/pending/rejected');
select is((select attempt_number from spot_before where player_id=pg_temp.spid(2)),1,'tie selects earliest ordinal');
select is((select count(*) from spot_before),2::bigint,'guests, AK, archived, DNF-only and empty histories excluded');
select is((select count(*) from public.get_event_sweet_spots(pg_temp.spid(100))),0::bigint,'no display for closed events');
select is((select count(*) from public.get_event_sweet_spots(pg_temp.spid(102))),0::bigint,'no display for deleted events');
select is((select count(*) from public.get_event_sweet_spots(null)),0::bigint,'missing event is empty');
select results_eq(
 'select player_id,attempt_number,average_hundredths,sample_count from spot_before order by player_id',
 'select p.id,b.attempt_number,b.average_hundredths,b.valid_attempts from public.players p
  cross join lateral (select * from public.get_player_attempt_number_statistics(p.id)
   where average_hundredths is not null order by average_hundredths,attempt_number limit 1) b
  where p.id in (pg_temp.spid(1),pg_temp.spid(2)) order by p.id',
 'sweet spot is exactly the chart aggregate, not a parallel calculation');
insert into public.attempts(id,player_id,event_id,status,time_hundredths,submitted_at,approved_at)
values(pg_temp.spid(1501),pg_temp.spid(1),pg_temp.spid(101),'approved',300,'2098-01-01 03:00Z','2098-01-01 03:00Z');
select is((select next_attempt_number from public.get_event_sweet_spots(pg_temp.spid(101)) where player_id=pg_temp.spid(1)),6,'saved #5 consumes the incoming ordinal');
select ok((select attempt_number<>next_attempt_number from public.get_event_sweet_spots(pg_temp.spid(101)) where player_id=pg_temp.spid(1)),'no hint after #5');
update public.attempts set deleted_at='2098-01-01 04:00Z' where id=pg_temp.spid(1501);
select is((select next_attempt_number from public.get_event_sweet_spots(pg_temp.spid(101)) where player_id=pg_temp.spid(1)),5,'delete restores canonical next ordinal');
select * from finish();
rollback;
