-- Disposable local test database only; migrations through 068 and pgTAP required.
begin;
create extension if not exists pgtap;
select no_plan();

insert into public.players (id, display_name, is_ak) values
 ('68000000-0000-0000-0000-000000000001', 'Guest scope A', false),
 ('68000000-0000-0000-0000-000000000002', 'Guest scope B', false),
 ('68000000-0000-0000-0000-000000000003', 'Guest scope AK', true);
insert into public.events (id, name, start_date, started_at, ends_at, status, closed_at) values
 ('68000000-0000-0000-0001-000000000001','Guest scope','2095-01-01','2095-01-01 00:00Z','2095-01-02 00:00Z','closed','2095-01-02 00:00Z'),
 ('68000000-0000-0000-0001-000000000002','Same people','2095-01-02','2095-01-02 00:00Z','2095-01-03 00:00Z','closed','2095-01-03 00:00Z');
insert into public.event_participants(event_id,player_id)
select e.id,p.id from public.events e cross join public.players p
where e.id in ('68000000-0000-0000-0001-000000000001','68000000-0000-0000-0001-000000000002')
  and p.id in ('68000000-0000-0000-0000-000000000001','68000000-0000-0000-0000-000000000002','68000000-0000-0000-0000-000000000003');
insert into public.event_guests (id,event_id,display_name)
select ('68000000-0000-0000-0002-'||lpad((event_no*10+n)::text,12,'0'))::uuid,
 ('68000000-0000-0000-0001-'||lpad(event_no::text,12,'0'))::uuid,
 'Guest scope person '||n
from generate_series(1,2) event_no cross join generate_series(1,4) n;
insert into public.attempts (id,event_id,player_id,guest_id,status,time_hundredths,is_dnf,submitted_at,approved_at)
select ('68000000-0000-0000-0003-'||lpad(n::text,12,'0'))::uuid,
 '68000000-0000-0000-0001-000000000001',
 case when p is not null then ('68000000-0000-0000-0000-'||lpad(p::text,12,'0'))::uuid end,
 case when g is not null then ('68000000-0000-0000-0002-'||lpad((10+g)::text,12,'0'))::uuid end,
 'approved',t,t is null,'2095-01-01 00:00Z'::timestamptz+mins*interval '1 minute',
 '2095-01-01 00:00Z'::timestamptz+mins*interval '1 minute'
from (values
 (1,null::integer,1,320,0),(2,1,null::integer,310,25),(3,null,2,295,65),
 (4,2,null,290,75),(5,null,3,280,80),(6,1,null,285,85),
 (7,2,null,280,90),(8,1,null,275,95),(9,null,4,null,100),
 (10,1,null,null,101),(11,null,1,null,102),(12,null,1,320,103),(13,3,null,100,104)
) v(n,p,g,t,mins);

select is((select count(*) from public.qualified_events where event_id='68000000-0000-0000-0001-000000000001'),1::bigint,'two players plus guests qualify the event');
select is((select count(*) from public.get_medal_qualified_events(array['68000000-0000-0000-0001-000000000001']::uuid[])),1::bigint,'archive/detail RPC does not hide a guest-qualified podium');
select is((select count(*) from public.event_podium where event_id='68000000-0000-0000-0001-000000000001'),3::bigint,'competition podium includes tied guest and player');
select ok(exists(select 1 from public.event_podium where event_id='68000000-0000-0000-0001-000000000001' and guest_id='68000000-0000-0000-0002-000000000013' and rank=2),'guest shares silver; no artificial permanent ranking');
select is((select valid_attempts from public.event_final_standings where event_id='68000000-0000-0000-0001-000000000001' and guest_id='68000000-0000-0000-0002-000000000011'),2,'guest time/DNF/time counts two');
select is((select valid_attempts from public.event_final_standings where event_id='68000000-0000-0000-0001-000000000001' and guest_id='68000000-0000-0000-0002-000000000014'),0,'DNF-only guest is unranked');
select is((select count(*) from public.event_participant_lead_segments where event_id='68000000-0000-0000-0001-000000000001'),6::bigint,'full strict progression, tie/slower/DNF/AK ignored');
select is((select duration_seconds from public.event_participant_lead_segments where source_attempt_id='68000000-0000-0000-0003-000000000001'),1500::bigint,'first guest leads 25 minutes');
select is((select duration_seconds from public.event_participant_lead_segments where source_attempt_id='68000000-0000-0000-0003-000000000002'),2400::bigint,'player leads 40 minutes before guest');
select is((select duration_seconds from public.event_participant_lead_segments where source_attempt_id='68000000-0000-0000-0003-000000000003'),600::bigint,'second guest leads ten minutes');
select is((select total_lead_seconds from public.event_lead_player_statistics where player_id='68000000-0000-0000-0000-000000000001' and season_year=2095),2880::bigint,'personal lead duration does not absorb guest segments');
select is((select lead_losses from public.event_lead_player_statistics where player_id='68000000-0000-0000-0000-000000000001' and season_year=2095),1,'loss to a guest is counted');
select is((select valid_attempts from public.event_statistics where event_id='68000000-0000-0000-0001-000000000001'),9::bigint,'event volume includes all nine valid player/guest times');
select is((select sum(sample_count) from public.event_attempt_number_statistics where event_id='68000000-0000-0000-0001-000000000001'),9::bigint,'attempt-number samples include guests, not AK/DNF');
select is((select count(*) from public.qualified_official_times where player_id in ('68000000-0000-0000-0000-000000000001','68000000-0000-0000-0000-000000000002')),5::bigint,'personal All-Time source contains only five permanent times');
select is((select count(*) from public.season_qualified_official_times where season_year=2095 and player_id in ('68000000-0000-0000-0000-000000000001','68000000-0000-0000-0000-000000000002')),5::bigint,'season personal source is unchanged by guests');
select is((public.get_team_milestones_snapshot_v2(2095)->>'validAttempts')::bigint,9::bigint,'community volume includes guests');
select is((select community_valid_attempts from public.season_global_statistics where season_year=2095),9::bigint,'overview consumption includes guests');
select is((select valid_attempts from public.season_global_statistics where season_year=2095),5,'personal performance denominator remains permanent-only');
select is((public.get_team_milestones_snapshot(2095)->>'validAttempts')::bigint,9::bigint,'snapshot versions agree on guest volume');
select is((public.get_team_milestones_snapshot_v2(2095)->>'teamTimeHundredths')::bigint,4555::bigint,'guest PBs do not enter personal team time');
select is(public.get_team_milestones_snapshot_v2(2095,'[{"id":"beer-guest","kind":"beer-volume","threshold":0.2}]')->'crossings'->0->>'playerName','Guest scope person 1','guest can trigger consumed-volume milestone');
select ok(exists(select 1 from public.public_player_badges where player_id='68000000-0000-0000-0000-000000000001' and badge_key='community-bronze'),'four guest identities plus second player reach community bronze');
select ok(not exists(select 1 from public.public_player_badges where player_id='68000000-0000-0000-0000-000000000001' and badge_key='community-silver'),'same normalized guest names across events are not new people');
select is((select direct_takeovers from public.rivalry_pair_events where event_id='68000000-0000-0000-0001-000000000001' and player_low_id='68000000-0000-0000-0000-000000000001' and player_high_id='68000000-0000-0000-0000-000000000002'),3,'guest-heavy event retains three canonical pairwise takeovers');
select ok((select is_rivalry_event from public.rivalry_pair_events where event_id='68000000-0000-0000-0001-000000000001' and player_low_id='68000000-0000-0000-0000-000000000001' and player_high_id='68000000-0000-0000-0000-000000000002'),'closed guest-heavy event remains a rivalry event');

select * from finish();
rollback;
