-- Disposable LOCAL database only, migrations through 067 + pgTAP. Never production.
begin;
create extension if not exists pgtap;
select no_plan();
insert into public.players(id,display_name,is_ak)
select ('67000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Milestone fixture '||n,n=13
from generate_series(1,13) n;
insert into public.historical_attempts(player_id,display_name,attempt_date,time_hundredths,sort_order)
select ('67000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Milestone fixture '||n,
  make_date(2080+size,1,1),300+n-1,n
from unnest(array[1,7,9,10,12]) size cross join lateral generate_series(1,size) n;
select is((public.get_team_milestones_snapshot_v2(2080)->>'teamTimeHundredths')::bigint,5000::bigint,'0 players = 50s');
select is((public.get_team_milestones_snapshot_v2(2081)->>'teamTimeHundredths')::bigint,4800::bigint,'1 player 3s + nine placeholders');
select is((public.get_team_milestones_snapshot_v2(2087)->>'teamTimeHundredths')::bigint,3621::bigint,'seven PBs + 15s');
select is((public.get_team_milestones_snapshot_v2(2089)->>'teamTimeHundredths')::bigint,3236::bigint,'nine PBs + 5s');
select is((public.get_team_milestones_snapshot_v2(2090)->>'teamTimeHundredths')::bigint,3045::bigint,'ten PBs, no placeholders');
select is((public.get_team_milestones_snapshot_v2(2092)->>'teamTimeHundredths')::bigint,3045::bigint,'12 players, only ten fastest');
select is((public.get_team_milestones_snapshot_v2(2092)->>'validAttempts')::bigint,0::bigint,'historical times are not volume');
select is(public.get_team_milestones_snapshot_v2(2081,'[{"id":"team-test","kind":"team-time","threshold":48}]')->'crossings'->0->>'sourceType','historical_attempt','exact crossing by historical PB');
select ok(public.get_team_milestones_snapshot_v2(2081,'[{"id":"team-test","kind":"team-time","threshold":48}]')->'crossings'->0->'occurredAt' = 'null'::jsonb,'no invented historical clock time');
select ok(public.get_team_milestones_snapshot_v2(2081,'[{"id":"team-test","kind":"team-time","threshold":48}]')->'crossings'->0->'eventId' = 'null'::jsonb,'no invented historical event');

insert into public.events(id,name,start_date,started_at,ends_at,status,closed_at)
values ('67000000-0000-0000-0001-000000000001','Milestone event','2094-01-01','2094-01-01 00:00Z','2094-01-02 00:00Z','closed','2094-01-02 00:00Z');
insert into public.attempts(id,player_id,event_id,status,time_hundredths,is_dnf,is_ak,submitted_at,approved_at)
select ('67000000-0000-0000-0002-'||lpad(n::text,12,'0'))::uuid,
  ('67000000-0000-0000-0000-'||lpad(player::text,12,'0'))::uuid,
  '67000000-0000-0000-0001-000000000001','approved',time,n=5,n=6,
  '2094-01-01 00:00Z'::timestamptz+n*interval '1 minute','2094-01-01 00:00Z'::timestamptz+n*interval '1 minute'
from (values(1,1,300),(2,1,280),(3,1,350),(4,2,200),(5,3,null::integer),(6,3,99),(7,13,99)) v(n,player,time);
insert into public.event_guests(id,event_id,display_name)
values ('67000000-0000-0000-0003-000000000001','67000000-0000-0000-0001-000000000001','Milestone guest');
insert into public.attempts(guest_id,event_id,status,time_hundredths,submitted_at,approved_at)
values ('67000000-0000-0000-0003-000000000001','67000000-0000-0000-0001-000000000001','approved',99,'2094-01-01 00:08Z','2094-01-01 00:08Z');
select is((public.get_team_milestones_snapshot_v2(2094)->>'validAttempts')::bigint,4::bigint,'only valid regular event attempts, including slower valid PB');
select is((public.get_team_milestones_snapshot_v2(2094)->>'teamTimeHundredths')::bigint,4480::bigint,'same-player improvement, slower non-PB unchanged; guest/AK/DNF excluded');
create temporary table milestone_result as select public.get_team_milestones_snapshot_v2(2094,'[
  {"id":"beer-exact","kind":"beer-volume","threshold":0.2},
  {"id":"beer-over","kind":"beer-volume","threshold":0.5},
  {"id":"team-exact","kind":"team-time","threshold":48},
  {"id":"team-over","kind":"team-time","threshold":48.5},
  {"id":"team-pb","kind":"team-time","threshold":47.9}
]') payload;
select is((select c->>'sourceId' from milestone_result,jsonb_array_elements(payload->'crossings') c where c->>'milestoneId'='beer-exact'),'67000000-0000-0000-0002-000000000001','first event attempt triggers exact .2L');
select is((select c->>'sourceId' from milestone_result,jsonb_array_elements(payload->'crossings') c where c->>'milestoneId'='beer-over'),'67000000-0000-0000-0002-000000000003','third attempt crosses .5L, including non-PB');
select is((select count(*) from milestone_result,jsonb_array_elements(payload->'crossings') c where c->>'sourceId'='67000000-0000-0000-0002-000000000001' and c->>'milestoneId' like 'team-%'),2::bigint,'one first PB crosses two time milestones');
select is((select (c->>'improvementHundredths')::integer from milestone_result,jsonb_array_elements(payload->'crossings') c where c->>'milestoneId'='team-pb'),20,'same-player PB improves team by .2s');
select is((select c->>'eventName' from milestone_result,jsonb_array_elements(payload->'crossings') c where c->>'milestoneId'='beer-over'),'Milestone event','correct triggering event');
select is((select c->>'playerId' from milestone_result,jsonb_array_elements(payload->'crossings') c where c->>'milestoneId'='beer-over'),'67000000-0000-0000-0000-000000000001','correct triggering player');
select is((select (c->>'timeHundredths')::integer from milestone_result,jsonb_array_elements(payload->'crossings') c where c->>'milestoneId'='beer-over'),350,'correct triggering time');
select is((public.get_team_milestones_snapshot_v2(null)->>'teamTimeHundredths')::bigint,
  (select coalesce(sum(pb),0)+(10-count(*))*500 from (select player_id,min(time_hundredths) pb from public.qualified_official_times where not is_guest and player_id is not null group by player_id order by pb,player_id limit 10) t)::bigint,'All-Time canonical PB parity with placeholders');
select ok(not has_table_privilege('anon','public.team_milestone_content','INSERT'),'public cannot insert content');
select ok(not has_table_privilege('authenticated','public.team_milestone_content','UPDATE'),'authenticated cannot bypass admin-media');
set local role anon;
select lives_ok('select * from public.team_milestone_content','public content read');
select lives_ok('select public.get_team_milestones_snapshot_v2(2094)','public snapshot read');
reset role;
select * from finish();
rollback;
