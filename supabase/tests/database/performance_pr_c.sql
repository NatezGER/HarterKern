-- Disposable isolated LOCAL database only, migrations 001–078 and pgTAP.
-- Synthetic regression fixtures; never execute on production. Everything rolls back.
begin;
create extension if not exists pgtap;
select no_plan();
create function pg_temp.pid(n integer) returns uuid language sql immutable as $$
 select ('78000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid
$$;
insert into public.players(id,display_name,is_ak)
select pg_temp.pid(n),'PR C fixture '||n,n=24 from generate_series(1,26) n;
create function pg_temp.event(e integer, y integer default 2098, active boolean default false)
returns void language plpgsql as $$
begin
 insert into public.events(id,name,start_date,started_at,ends_at,status,closed_at)
 values(pg_temp.pid(1000+e),'PR C event '||e,make_date(y,1,1)+e,
   (make_date(y,1,1)+e)::timestamptz,(make_date(y,1,1)+e)::timestamptz+interval '24 hours',
   case when active then 'active'::public.event_status else 'closed'::public.event_status end,
   case when active then null else (make_date(y,1,1)+e)::timestamptz+interval '23 hours' end);
 insert into public.event_participants(event_id,player_id)
 select pg_temp.pid(1000+e),pg_temp.pid(n) from generate_series(1,26) n;
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
 values(pg_temp.pid(5000+e),pg_temp.pid(1000+e),'PR C guest '||e) on conflict(id) do nothing;
 select started_at+n*interval '1 minute' into ts from public.events where id=pg_temp.pid(1000+e);
 insert into public.attempts(id,guest_id,event_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
 values(pg_temp.pid(1000000+e*1000+n),pg_temp.pid(5000+e),pg_temp.pid(1000+e),'approved',t,t is null,ts,ts);
end;
$$;


create function pg_temp.history(p integer,n integer,d date,t integer,ordering integer default 0)
returns void language sql as $$
 insert into public.historical_attempts(id,player_id,display_name,attempt_date,time_hundredths,sort_order)
 values(pg_temp.pid(9000000+p*100+n),pg_temp.pid(p),'PR C historical '||p,d,t,ordering);
$$;
create function pg_temp.entry(payload jsonb,k text,p integer) returns jsonb language sql immutable as $$
 select r from jsonb_array_elements(payload) m cross join lateral jsonb_array_elements(m->'rankings') r
 where m->>'key'='performance-'||k and r->>'playerId'=pg_temp.pid(p)::text;
$$;
-- Spirals count transitions, not attempts. DNF, ties and reversals break runs.
select pg_temp.event(1); select pg_temp.event(2); select pg_temp.event(3); select pg_temp.event(4); select pg_temp.event(5);
select pg_temp.attempt(1,1,n,t) from(values(1,340),(2,320),(3,310),(4,295)) v(n,t);
select pg_temp.attempt(2,1,n,t) from(values(1,290),(2,280),(3,270),(4,260)) v(n,t);
select pg_temp.attempt(3,2,n,t) from(values(1,270),(2,295),(3,330),(4,380)) v(n,t);
select pg_temp.attempt(4,3,1,300);
select pg_temp.attempt(5,4,n,t) from(values(1,340),(2,320),(3,320),(4,310),(5,null),(6,300),(7,290)) v(n,t);
-- Nine insufficient; ten sufficient; eleven ignores oldest outlier.
select pg_temp.event(6); select pg_temp.event(7); select pg_temp.event(8); select pg_temp.event(9);
select pg_temp.attempt(6,5,n,400-n) from generate_series(1,9) n;
select pg_temp.attempt(7,6,n,case when n<=5 then 340 else 305 end) from generate_series(1,10) n;
select pg_temp.attempt(8,7,n,case when n=1 then 999 when n<=6 then 295 else 340 end) from generate_series(1,11) n;
select pg_temp.attempt(9,8,n,300) from generate_series(1,10) n;
select pg_temp.event(10,2097); select pg_temp.event(11,2098);
select pg_temp.attempt(10,9,n,340) from generate_series(1,5) n;
select pg_temp.attempt(11,9,n,305) from generate_series(1,5) n;
-- Historical PB, twelve equal valid efforts, DNF, then PB: thirteen counted.
select pg_temp.history(10,1,'2097-12-01',295);
select pg_temp.event(12);
select pg_temp.attempt(12,10,n,295) from generate_series(1,12) n;
select pg_temp.attempt(12,10,13,null); select pg_temp.attempt(12,10,14,270);
-- Exact near-miss boundaries, including reference changing after a new PB.
select pg_temp.history(11,1,'2097-12-01',275); select pg_temp.event(13);
select pg_temp.attempt(13,11,n,t) from(values(1,276),(2,285),(3,286),(4,275),(5,270),(6,271)) v(n,t);
-- Past-season plateau is not changed by a future PB.
select pg_temp.history(12,1,'2097-12-01',265); select pg_temp.event(14);
select pg_temp.attempt(14,12,n,300) from generate_series(1,26) n;
select pg_temp.event(15,2099); select pg_temp.attempt(15,12,1,250);
select pg_temp.history(13,1,'2097-12-01',300);
-- Ambiguous import sequence must not manufacture a PB ranking.
select pg_temp.history(14,1,'2098-01-01',400); select pg_temp.history(14,2,'2098-01-01',300);
select pg_temp.event(16); select pg_temp.attempt(16,14,1,305);
select pg_temp.history(15,1,'2097-12-01',300); select pg_temp.event(17);
select pg_temp.attempt(17,15,1,300); select pg_temp.attempt(17,15,2,300);
-- Isolated CV season: seven eligible players, ceil(7/3)=3; four tie at CV zero.
do $$ declare p integer; n integer; begin
 for p in 16..23 loop
  perform pg_temp.event(100+p,2090);
  for n in 1..(case when p=23 then 9 else 10 end) loop
   perform pg_temp.attempt(100+p,p,n,case when p=16 then 500 when p in(17,18) then 300
     when p=19 then 200 else case when n<=5 then 100 else 900 end end);
  end loop;
 end loop;
end $$;
-- Equal near counts preserve sporting ties; long proof lists are capped explicitly.
select pg_temp.history(25,1,'2097-12-01',275); select pg_temp.event(18);
select pg_temp.attempt(18,25,n,t) from(values(1,276),(2,285),(3,286),(4,275),(5,270),(6,271)) v(n,t);
select pg_temp.history(26,1,'2097-12-01',275); select pg_temp.event(19);
select pg_temp.attempt(19,26,n,276) from generate_series(1,21) n;
-- Non-integer hundredths mean is retained, and CV boundary ties qualify both.
select pg_temp.event(120,2091); select pg_temp.event(121,2091);
select pg_temp.attempt(120,16,n,case when n=10 then 301 else 300 end) from generate_series(1,10) n;
select pg_temp.attempt(121,17,n,case when n=10 then 301 else 300 end) from generate_series(1,10) n;
create temporary table precise_result as select public.get_performance_development_metrics(2091) payload;
create temporary table result as select public.get_performance_development_metrics(2098) payload;
create temporary table all_result as select public.get_performance_development_metrics(null) payload;
create temporary table cv_result as select public.get_performance_development_metrics(2090) payload;
select is((pg_temp.entry(payload,'upward-spiral',1)->>'value')::numeric,3::numeric,'four times give three improvements, not seven across events') from result;
select is(pg_temp.entry(payload,'upward-spiral',1)->'developmentEvidence'->>'eventId',pg_temp.pid(1001)::text,'equal-length evidence chooses earliest event') from result;
select is(jsonb_array_length(pg_temp.entry(payload,'upward-spiral',1)->'developmentEvidence'->'attempts'),4,'complete spiral proof') from result;
select is((pg_temp.entry(payload,'downward-spiral',2)->>'value')::numeric,3::numeric,'four times give three deteriorations') from result;
select ok(pg_temp.entry(payload,'upward-spiral',3) is null,'one time no positive spiral') from result;
select is((pg_temp.entry(payload,'upward-spiral',4)->>'value')::numeric,1::numeric,'ties and DNF break spiral') from result;
select ok(pg_temp.entry(payload,'form-rise',5) is null,'nine times insufficient') from result;
select is((pg_temp.entry(payload,'form-rise',6)->>'value')::numeric,35::numeric,'two median blocks improve by 35 hundredths') from result;
select is((pg_temp.entry(payload,'form-decay',7)->>'value')::numeric,45::numeric,'only latest ten of eleven used') from result;
select is(jsonb_array_length(pg_temp.entry(payload,'form-decay',7)->'developmentEvidence'->'older'),5,'five older proofs') from result;
select ok(pg_temp.entry(payload,'form-rise',8) is null and pg_temp.entry(payload,'form-decay',8) is null,'equal medians no trend') from result;
select ok(pg_temp.entry(payload,'form-rise',9) is null,'season does not mix five times from prior year') from result;
select is((pg_temp.entry(payload,'form-rise',9)->>'value')::numeric,35::numeric,'All-Time trend crosses events and seasons') from all_result;
select is((pg_temp.entry(payload,'record-hunter',10)->>'value')::numeric,13::numeric,'historical PB plus twelve attempts plus new PB, DNF excluded') from result;
select is((pg_temp.entry(payload,'record-hunter',10)->'developmentEvidence'->>'intermediate')::integer,12,'new PB included, old PB excluded') from result;
select is(pg_temp.entry(payload,'record-hunter',10)->'developmentEvidence'->'before'->>'source','historical_attempt','historical source retained') from result;
select ok(pg_temp.entry(payload,'record-hunter',12) is null,'ongoing search is not completed hunt') from result;
select ok(pg_temp.entry(payload,'record-hunter',13) is null,'first PB is not completed hunt') from all_result;
select is((pg_temp.entry(payload,'near-legend',11)->>'value')::numeric,3::numeric,'+1,+10 and new-reference +1 count; +11, equal and PB do not') from result;
select ok(exists(select 1 from jsonb_array_elements(pg_temp.entry(payload,'near-legend',11)->'developmentEvidence'->'hits') h where h->>'time'='285' and h->>'priorPb'='275'),'historical PB rather than current 270 reference') from result;
select is((pg_temp.entry(payload,'plateau',12)->>'value')::numeric,24::numeric,'past season remains at 24 despite future PB') from result;
select ok(pg_temp.entry(payload,'plateau',12) is null,'current PB resets plateau to zero') from all_result;
select ok(pg_temp.entry(payload,'plateau',13) is null,'single PB plateau zero') from all_result;
select is((pg_temp.entry(payload,'plateau',15)->>'value')::numeric,2::numeric,'equal PBs count toward plateau with prior-season reference') from result;
select ok(pg_temp.entry(payload,'plateau',14) is null and pg_temp.entry(payload,'near-legend',14) is null,'ambiguous history does not create PB leaders') from result;
select is((pg_temp.entry(payload,'fastest-consistent',19)->>'rank')::integer,1,'speed decides within qualified third') from cv_result;
select is((pg_temp.entry(payload,'fastest-consistent',19)->'developmentEvidence'->>'population')::integer,7,'minimum ten excludes nine-time player') from cv_result;
select is((pg_temp.entry(payload,'fastest-consistent',19)->'developmentEvidence'->>'target')::integer,3,'ceil seven divided by three') from cv_result;
select is((pg_temp.entry(payload,'fastest-consistent',19)->'developmentEvidence'->>'qualified')::integer,4,'all CV boundary ties included') from cv_result;
select is(pg_temp.entry(payload,'fastest-consistent',17)->>'rank',pg_temp.entry(payload,'fastest-consistent',18)->>'rank','equal exact means share rank') from cv_result;
select ok(pg_temp.entry(payload,'fastest-consistent',20) is null,'higher CV excluded even when potentially fast') from cv_result;
select is(pg_temp.entry(payload,'near-legend',11)->>'rank',pg_temp.entry(payload,'near-legend',25)->>'rank','equal near counts share sporting rank') from result;
select is(jsonb_array_length(pg_temp.entry(payload,'near-legend',26)->'developmentEvidence'->'hits'),20,'large near proof list capped to twenty') from result;
select is((pg_temp.entry(payload,'near-legend',26)->>'value')::numeric,21::numeric,'proof cap does not truncate count') from result;
select is((pg_temp.entry(payload,'fastest-consistent',16)->>'value')::numeric,300.1::numeric,'speed mean is not rounded before ranking') from precise_result;
select is((pg_temp.entry(payload,'fastest-consistent',16)->'developmentEvidence'->>'qualified')::integer,2,'cutoff ties with ceil two divided by three') from precise_result;
select ok(pg_temp.entry(public.get_performance_development_metrics(2097),'record-hunter',10) is null,'hunt only belongs to finishing PB season');
select * from finish();
rollback;
