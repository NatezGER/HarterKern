-- Disposable isolated LOCAL database only, migrations 001–077 and pgTAP.
-- Synthetic regression fixtures; never execute on production. Everything rolls back.
begin;
create extension if not exists pgtap;
select no_plan();
create function pg_temp.pid(n integer) returns uuid language sql immutable as $$
 select ('77000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid
$$;
insert into public.players(id,display_name,is_ak)
select pg_temp.pid(n),'PR B fixture '||n,n=20 from generate_series(1,24) n;
create function pg_temp.event(e integer, y integer default 2096, active boolean default false)
returns void language plpgsql as $$
begin
 insert into public.events(id,name,start_date,started_at,ends_at,status,closed_at)
 values(pg_temp.pid(1000+e),'PR B event '||e,make_date(y,1,1)+e,
   (make_date(y,1,1)+e)::timestamptz,(make_date(y,1,1)+e)::timestamptz+interval '24 hours',
   case when active then 'active'::public.event_status else 'closed'::public.event_status end,
   case when active then null else (make_date(y,1,1)+e)::timestamptz+interval '23 hours' end);
 insert into public.event_participants(event_id,player_id)
 select pg_temp.pid(1000+e),pg_temp.pid(n) from generate_series(1,24) n;
end;
$$;
create function pg_temp.attempt(e integer,p integer,n integer,t integer,
 ak boolean default false,deleted boolean default false,pending boolean default false)
returns void language plpgsql as $$
declare ts timestamptz;
begin
 select started_at+n*interval '1 minute' into ts from public.events where id=pg_temp.pid(1000+e);
 insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at,is_ak,deleted_at)
 values(pg_temp.pid(1000000+e*1000+n),pg_temp.pid(p),pg_temp.pid(1000+e),
   case when pending then 'pending'::public.attempt_status else 'approved'::public.attempt_status end,
   t,t is null,ts,case when pending then null else ts end,ak,case when deleted then ts end);
end;
$$;
create function pg_temp.guest(e integer,n integer,t integer) returns void language plpgsql as $$
declare ts timestamptz;
begin
 insert into public.event_guests(id,event_id,display_name)
 values(pg_temp.pid(5000+e),pg_temp.pid(1000+e),'PR B guest '||e) on conflict(id) do nothing;
 select started_at+n*interval '1 minute' into ts from public.events where id=pg_temp.pid(1000+e);
 insert into public.attempts(id,guest_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
 values(pg_temp.pid(1000000+e*1000+n),pg_temp.pid(5000+e),pg_temp.pid(1000+e),'approved',t,t is null,ts,ts);
end;
$$;

-- 4/5/7/8/11/12 attempts: one successful event, one zero-gain event per player.
do $$ declare p integer; e integer; n integer; i integer; k integer;
begin
 for p in 1..6 loop
  n := (array[4,5,7,8,11,12])[p]; k := n/4;
  for e in (p*2-1)..(p*2) loop
   perform pg_temp.event(e);
   for i in 1..n loop
    perform pg_temp.attempt(e,p,i,case when mod(e,2)=1 and i=n-k+1 then 275
      when mod(e,2)=1 and i>n-k+1 then null else 305 end);
   end loop;
  end loop;
 end loop;
 -- All-Time qualifies, but one event per season does not.
 perform pg_temp.event(21,2095); perform pg_temp.event(22,2096);
 for e in 21..22 loop for i in 1..5 loop perform pg_temp.attempt(e,7,i,case when i=5 then 275 else 305 end); end loop; end loop;
 -- No valid PB before the last quarter: neither event qualifies.
 for e in 23..24 loop perform pg_temp.event(e); for i in 1..5 loop perform pg_temp.attempt(e,8,i,case when i=5 then 200 else null end); end loop; end loop;
 -- Only one eligible Endspurt event.
 perform pg_temp.event(25); for i in 1..5 loop perform pg_temp.attempt(25,9,i,case when i=5 then 275 else 305 end); end loop;
 -- Fast Starter: exactly two three-attempt events, one event, and DNF Attempt 1.
 for e in 31..35 loop perform pg_temp.event(e); end loop;
 for i in 1..3 loop
  perform pg_temp.attempt(31,11,i,case when i=1 then 350 else 300 end);
  perform pg_temp.attempt(32,11,i,case when i=1 then 330 else 300 end);
  perform pg_temp.attempt(33,12,i,case when i=1 then 350 else 300 end);
  perform pg_temp.attempt(34,13,i,case when i=1 then null else 300 end);
  perform pg_temp.attempt(35,13,i,case when i=1 then null else 300 end);
 end loop;
end $$;

-- Three qualified events against the same opponent; only two takeovers in event 45.
do $$ declare e integer;
begin
 foreach e in array array[41,42,43,45] loop
  perform pg_temp.event(e);
  perform pg_temp.attempt(e,14,1,400); perform pg_temp.attempt(e,15,2,500);
  perform pg_temp.attempt(e,15,3,350); perform pg_temp.attempt(e,14,4,300);
  if e<>45 then perform pg_temp.attempt(e,15,5,250); end if;
 end loop;
end $$;
-- Two qualifying pairs in one event for player 17, but only one event point.
select pg_temp.event(44);
select pg_temp.attempt(44,p,n,t) from (values
 (17,1,400),(18,2,500),(19,3,600),(18,4,350),(17,5,300),(18,6,250),
 (19,7,200),(17,8,150),(19,9,100)) v(p,n,t);

-- Leadership starts at the first valid time; guests never receive/cause pair points.
select pg_temp.event(51);
select pg_temp.attempt(51,21,1,350); select pg_temp.attempt(51,22,2,300);
select pg_temp.attempt(51,21,3,280); -- real takeover already counts with two regular players
select pg_temp.guest(51,4,100);
select pg_temp.attempt(51,22,5,270); select pg_temp.attempt(51,21,6,260); -- real re-takeover
-- At this point: exactly two regular players plus one guest.
select is((select count(distinct player_id) from public.official_event_attempts
 where event_id=pg_temp.pid(1051)),2::bigint,'official attempts exclude guest from player population');
select is((select count(distinct participant_id) from public.event_eligible_attempts
 where event_id=pg_temp.pid(1051)),3::bigint,'event eligibility includes guest');
select is((select qualification_attempt_id from public.event_lead_windows
 where event_id=pg_temp.pid(1051)),pg_temp.pid(1051001),
 'current leadership starts at first valid attempt with two players plus guest');
select is((select value from public.get_performance_event_metrics(2096)
 where metric_key='performance-chaos-takeovers' and player_id=pg_temp.pid(21)),2::numeric,
 'two regular players plus guest: both real actor takeovers count before third regular player');
select is((select value from public.get_performance_event_metrics(2096)
 where metric_key='performance-chaos-takeovers' and player_id=pg_temp.pid(22)),1::numeric,
 'two regular players plus guest: opponent retakeover counts');
select pg_temp.attempt(51,23,7,250); -- first valid placement, not a takeover

-- One attempt passes three existing opponents. Invalid/excluded rows cannot add points.
select pg_temp.event(52);
select pg_temp.attempt(52,p,n,t) from (values (21,1,350),(22,2,280),(23,3,300),(24,4,320),(21,5,270)) v(p,n,t);
select pg_temp.attempt(52,22,6,null);
select pg_temp.attempt(52,22,7,200,true);
select pg_temp.attempt(52,22,8,190,false,true);
select pg_temp.attempt(52,22,9,180,false,false,true);
select pg_temp.attempt(52,20,10,170); select pg_temp.guest(52,11,160);

-- Midfield changes behind a faster leader, including a real re-takeover.
select pg_temp.event(53);
select pg_temp.attempt(53,p,n,t) from (values (21,1,200),(22,2,300),(23,3,400),(23,4,280),(22,5,270)) v(p,n,t);
select is((select count(distinct player_id) from public.official_event_attempts
 where event_id=pg_temp.pid(1053)),3::bigint,'three regular players remain official');
select is((select qualification_attempt_id from public.event_lead_windows
 where event_id=pg_temp.pid(1053)),pg_temp.pid(1053001),
 'current leadership also starts at first valid attempt with three regular players');
-- Tie, tie resolution, real reversal, another tie and resolution.
select pg_temp.event(54);
select pg_temp.attempt(54,p,n,t) from (values (21,1,300),(22,2,350),(23,3,200),(22,4,300),(22,5,290),(21,6,280),(22,7,280),(22,8,270)) v(p,n,t);
-- DNF and AK rows do not add points; no third valid participant is required.
select pg_temp.event(55);
select pg_temp.attempt(55,p,n,t) from (values (21,1,350),(22,2,300),(23,3,null),(20,4,200),(21,5,280)) v(p,n,t);
-- Same multi-pass in another season.
select pg_temp.event(56,2095);
select pg_temp.attempt(56,p,n,t) from (values (21,1,350),(22,2,280),(23,3,300),(24,4,320),(21,5,270)) v(p,n,t);
-- Equal timestamps use ID order, both at qualification and in the pair state.
select pg_temp.event(57);
select pg_temp.attempt(57,p,n,t) from (values (21,1,350),(22,2,300),(23,3,200),(21,4,280)) v(p,n,t);
update public.attempts set submitted_at=(select started_at from public.events where id=pg_temp.pid(1057))
where event_id=pg_temp.pid(1057);

-- Do not disturb a seeded active event. Exercise the open-event case when possible.
do $$ begin if not exists(select 1 from public.events where status='active') then
 perform pg_temp.event(58,2096,true);
 perform pg_temp.attempt(58,14,1,400); perform pg_temp.attempt(58,15,2,500);
 perform pg_temp.attempt(58,16,3,600); perform pg_temp.attempt(58,15,4,350);
 perform pg_temp.attempt(58,14,5,300); perform pg_temp.attempt(58,15,6,250);
end if; end $$;

-- Equal median: successful-event rate first, then event count; rank remains equal.
do $$ declare e integer; i integer;
begin
 for e in 61..66 loop
  perform pg_temp.event(e);
  for i in 1..5 loop
   perform pg_temp.attempt(e,case when e<=64 then 10 else 16 end,i,
    case when i<5 or e<=62 then 305 when e<=64 then 275 else 290 end);
  end loop;
 end loop;
end $$;
create temporary table metrics as select * from public.get_performance_event_metrics(2096);
create function pg_temp.chaos(p integer,e integer) returns numeric language sql stable as $$
 select coalesce(sum((v->>'takeovers')::numeric),0) from metrics m
 cross join lateral jsonb_array_elements(m.evidence) v
 where m.metric_key='performance-chaos-takeovers' and m.player_id=pg_temp.pid(p)
 and v->>'eventId'=pg_temp.pid(1000+e)::text
$$;
select ok(not exists(select 1 from metrics where metric_key='performance-endspurt' and player_id=pg_temp.pid(1)),'four attempts do not qualify');
select is(value,15::numeric,'median includes zero event for player '||player_id) from metrics
where metric_key='performance-endspurt' and player_id in (select pg_temp.pid(n) from generate_series(2,6) n);
select is(sample_count,2::numeric,'two qualifying events') from metrics where metric_key='performance-endspurt' and player_id=pg_temp.pid(4);
select is(hit_count,1::numeric,'only positive gain counted as successful') from metrics where metric_key='performance-endspurt' and player_id=pg_temp.pid(4);
select is(jsonb_array_length(v->'lastQuarter'),(v->>'attemptCount')::integer/4,'floor n/4 boundary')
from metrics m cross join lateral jsonb_array_elements(evidence) v where metric_key='performance-endspurt';
select is((v->'lastQuarter'->0->>'attemptNumber')::integer,
 (v->>'attemptCount')::integer-(v->>'attemptCount')::integer/4+1,'first last-quarter position')
from metrics m cross join lateral jsonb_array_elements(evidence) v where metric_key='performance-endspurt';
select ok(exists(select 1 from metrics m cross join lateral jsonb_array_elements(evidence) e
 cross join lateral jsonb_array_elements(e->'lastQuarter') a
 where metric_key='performance-endspurt' and a->>'isDnf'='true' and a->'timeHundredths'='null'::jsonb),'DNF retained in evidence');
select ok(not exists(select 1 from metrics where metric_key='performance-endspurt' and player_id in (pg_temp.pid(7),pg_temp.pid(8),pg_temp.pid(9))),'scope/previous PB/two-event requirements');
select is((select value from public.get_performance_event_metrics(null) where metric_key='performance-endspurt' and player_id=pg_temp.pid(7)),30::numeric,'All-Time combines both seasons');

create temporary table dashboard as select public.get_statistics_performance_dashboard(2096) payload;
create function pg_temp.ranking(k text,p integer) returns jsonb language sql stable as $$
 select r from dashboard d cross join lateral jsonb_array_elements(d.payload->'metrics') m
 cross join lateral jsonb_array_elements(m->'rankings') r
 where m->>'key'=k and r->>'playerId'=pg_temp.pid(p)::text
$$;
select is((pg_temp.ranking('fast-starter',11)->>'value')::numeric,40::numeric,'unchanged Fast Starter median (50+30)/2');
select is(pg_temp.ranking('fast-starter',11)->>'total','2','two three-attempt events qualify');
select ok(pg_temp.ranking('fast-starter',12) is null,'one Fast Starter event excluded');
select ok(pg_temp.ranking('fast-starter',13) is null,'DNF at actual Attempt 1 excluded');
select is((select sample_count from public.get_statistics_sequence_metrics(array[pg_temp.pid(12)],2096,null) where metric_key='fast-starter'),1::numeric,'shared helper still accepts one event');
select is((select m->'rankings'->0->>'playerId' from dashboard d cross join lateral jsonb_array_elements(d.payload->'metrics') m where m->>'key'='performance-endspurt'),pg_temp.pid(16)::text,'higher success rate orders tied median first');
select is((select m->'rankings'->1->>'playerId' from dashboard d cross join lateral jsonb_array_elements(d.payload->'metrics') m where m->>'key'='performance-endspurt'),pg_temp.pid(10)::text,'more events orders equal median and equal success rate next');
select is(pg_temp.ranking('performance-endspurt',16)->>'rank',pg_temp.ranking('performance-endspurt',10)->>'rank','success-rate sorting never changes equal rank');
select is(pg_temp.ranking('performance-endspurt',2)->>'rank',pg_temp.ranking('performance-endspurt',3)->>'rank','equal medians share sporting rank');

select is(value,3::numeric,'same opponent in three different events counts three') from metrics where metric_key='performance-rivalry-events' and player_id=pg_temp.pid(14);
select is(value,1::numeric,'two qualifying pairs in one event count once') from metrics where metric_key='performance-rivalry-events' and player_id=pg_temp.pid(17);
select is(jsonb_array_length(evidence->0->'opponents'),2,'both qualified opponents kept in event evidence') from metrics where metric_key='performance-rivalry-events' and player_id=pg_temp.pid(17);
select ok(not exists(select 1 from metrics m cross join lateral jsonb_array_elements(evidence) v
 where metric_key='performance-rivalry-events' and v->>'eventId'=pg_temp.pid(1045)::text),'two takeovers do not qualify');
select ok(not exists(select 1 from public.get_performance_event_metrics(2095) where metric_key='performance-rivalry-events' and player_id=pg_temp.pid(14)),'Rivalry season filtering');

select is(pg_temp.chaos(21,51),2::numeric,'two-player takeover and later real re-takeover both count');
select is(pg_temp.chaos(22,51),1::numeric,'guest does not prevent regular-player takeover');
select is(pg_temp.chaos(23,51),0::numeric,'first valid placement never counts');
select is(pg_temp.chaos(21,52),3::numeric,'single attempt overtakes three opponents');
select is(pg_temp.chaos(p,52),0::numeric,'passed/excluded player gets no points') from unnest(array[22,23,24,20]) p;
select is(pg_temp.chaos(23,53),1::numeric,'midfield takeover counts');
select is(pg_temp.chaos(22,53),1::numeric,'real midfield re-takeover counts');
select is(pg_temp.chaos(21,54),1::numeric,'true reversal after tie resolution counts');
select is(pg_temp.chaos(22,54),0::numeric,'ties and tie resolution never count');
select is(pg_temp.chaos(21,55),1::numeric,'two valid regular players suffice regardless of DNF or AK participants');
select is(pg_temp.chaos(21,56),0::numeric,'other season excluded');
select is(pg_temp.chaos(21,57),1::numeric,'equal timestamps ordered deterministically by ID');
select is((select value from public.get_performance_event_metrics(null) where metric_key='performance-chaos-takeovers' and player_id=pg_temp.pid(21)),
 (select value+3 from metrics where metric_key='performance-chaos-takeovers' and player_id=pg_temp.pid(21)),'All-Time includes other-season takeovers');
select ok(not exists(select 1 from metrics m cross join lateral jsonb_array_elements(evidence) e
 where metric_key in ('performance-rivalry-events','performance-chaos-takeovers') and e->>'eventId'=pg_temp.pid(1058)::text),'open event contributes no Rivalry/Chaos points')
where exists(select 1 from public.events where id=pg_temp.pid(1058));
select * from skip('Open-event fixture skipped: pre-existing active event',1)
where not exists(select 1 from public.events where id=pg_temp.pid(1058));
select * from finish();
rollback;
