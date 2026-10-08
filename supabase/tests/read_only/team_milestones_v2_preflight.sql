-- Transactional manual Supabase preflight. Review first; schema and bucket changes roll back.
BEGIN;

-- PR70: editorial content and a scoped, read-only chronological snapshot.
-- 063/065/066 and all award/write hotpaths remain unchanged.
create table if not exists public.team_milestone_content (
  milestone_id text primary key check (milestone_id ~ '^(beer|team)-[a-z0-9-]+$'),
  info_text text check (length(info_text) <= 4000),
  image_path text check (image_path ~ '^(beer|team)-[a-z0-9-]+/[0-9a-f-]{36}\.(webp|png|jpg)$'),
  updated_at timestamptz not null default now()
);
alter table public.team_milestone_content enable row level security;
drop policy if exists team_milestone_content_read on public.team_milestone_content;
create policy team_milestone_content_read on public.team_milestone_content
  for select to anon, authenticated using (true);
revoke all on public.team_milestone_content from anon, authenticated;
grant select on public.team_milestone_content to anon, authenticated;
grant all on public.team_milestone_content to service_role;
-- Mutations use the existing token-verified admin-media service, like award_assets.
-- No public write policies. No alternative client-side authorization model.
drop trigger if exists team_milestone_content_updated on public.team_milestone_content;
create trigger team_milestone_content_updated before update on public.team_milestone_content
  for each row execute function public.set_updated_at();
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-milestone-artwork', 'team-milestone-artwork', true, 5242880,
  array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists team_milestone_artwork_read on storage.objects;
create policy team_milestone_artwork_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'team-milestone-artwork');

-- Thresholds are supplied by the single code catalogue, not a second SQL registry.
-- The bounded list is presentation input only: nothing is awarded/persisted.
create or replace function public.get_team_milestones_snapshot_v2(
  p_season_year integer default null,
  p_milestones jsonb default '[]'::jsonb
) returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  r record;
  m record;
  personal_bests jsonb := '{}'::jsonb;
  crossed jsonb := '{}'::jsonb;
  crossings jsonb := '[]'::jsonb;
  valid_count bigint := 0;
  team_total bigint := 5000;
  previous_total bigint := 5000;
  player_count integer := 0;
  old_pb integer;
  proof jsonb;
begin
  if jsonb_typeof(p_milestones) is distinct from 'array' then
    raise exception 'Milestones must be an array';
  end if;
  if jsonb_array_length(p_milestones) > 200 then raise exception 'Too many milestones'; end if;
  if exists (select 1 from jsonb_to_recordset(p_milestones) as x(id text, kind text, threshold numeric)
    where id is null or id !~ '^(beer|team)-[a-z0-9-]+$'
      or kind is null or kind not in ('beer-volume', 'team-time')
      or threshold is null or threshold <= 0 or threshold > 1000000000)
    or (select count(*) <> count(distinct x.id)
      from jsonb_to_recordset(p_milestones) as x(id text)) then
    raise exception 'Invalid milestones';
  end if;
  -- A future >=50s stage is already reached at baseline, without an invented trigger.
  for m in select * from jsonb_to_recordset(p_milestones) as x(id text, kind text, threshold numeric)
    where kind = 'team-time' and threshold >= 50 loop
    crossed := crossed || jsonb_build_object(m.id, true);
    crossings := crossings || jsonb_build_array(jsonb_build_object('milestoneId', m.id,
      'sourceType', 'baseline', 'occurredDate', null, 'occurredAt', null,
      'eventId', null, 'eventName', null, 'playerId', null, 'playerName', null,
      'sourceId', null, 'timeHundredths', null, 'improvementHundredths', null));
  end loop;
  for r in
    -- Thin projection of 017/026 qualification, avoiding event_attempt_details expansion.
    -- PBs retain event-less official attempts; only real event attempts add volume.
    select a.id source_id, a.player_id, p.display_name player_name, a.time_hundredths,
      a.submitted_at occurred_at, (a.submitted_at at time zone 'Europe/Berlin')::date occurred_date,
      a.event_id, e.name event_name, 'attempt'::text source_type,
      2 source_priority, 0 source_order
    from public.attempts a join public.players p on p.id = a.player_id
    left join public.events e on e.id = a.event_id
    where a.status = 'approved' and a.deleted_at is null and not a.is_dnf
      and a.time_hundredths is not null and not a.is_ak
      and not p.is_ak and not p.is_archived and a.guest_id is null
      and (a.event_id is null or e.deleted_at is null)
      and (p_season_year is null or (p_season_year >= 2026
        and extract(year from e.start_date)::integer = p_season_year))
    union all
    select h.id, h.player_id, h.display_name, h.time_hundredths,
      h.attempt_date::timestamp at time zone 'Europe/Berlin', h.attempt_date,
      null::uuid, null::text, 'historical_attempt'::text, 1, h.sort_order
    from public.historical_attempts h join public.players p on p.id = h.player_id
    where h.deleted_at is null and not h.is_guest and not h.out_of_competition
      and not p.is_ak and not p.is_archived
      and (p_season_year is null or (p_season_year >= 2026
        and extract(year from h.attempt_date)::integer = p_season_year))
    order by occurred_at, source_priority, source_order, source_id
  loop
    if r.source_type = 'attempt' and r.event_id is not null then
      valid_count := valid_count + 1;
    end if;
    previous_total := team_total;
    old_pb := (personal_bests ->> r.player_id::text)::integer;
    if old_pb is null or r.time_hundredths < old_pb then
      personal_bests := personal_bests || jsonb_build_object(r.player_id::text, r.time_hundredths);
      select count(*)::integer, coalesce(sum(t.best), 0) + (10-count(*))*500
        into player_count, team_total
      from (select value::integer best from jsonb_each_text(personal_bests)
        order by value::integer, key limit 10) t;
    end if;
    proof := jsonb_build_object('sourceId', r.source_id, 'sourceType', r.source_type,
      'occurredDate', r.occurred_date,
      'occurredAt', case when r.source_type = 'attempt' then r.occurred_at else null end,
      'eventId', r.event_id, 'eventName', r.event_name,
      'playerId', r.player_id, 'playerName', r.player_name, 'timeHundredths', r.time_hundredths);
    for m in select * from jsonb_to_recordset(p_milestones) as x(id text, kind text, threshold numeric)
      where not (crossed ? x.id) and (
        (kind = 'beer-volume' and r.source_type = 'attempt' and r.event_id is not null
          and valid_count::numeric * 0.2 >= threshold)
        or (kind = 'team-time' and team_total < previous_total and team_total <= threshold * 100))
    loop
      crossed := crossed || jsonb_build_object(m.id, true);
      crossings := crossings || jsonb_build_array(proof || jsonb_build_object(
        'milestoneId', m.id, 'improvementHundredths',
        case when m.kind = 'team-time' then previous_total-team_total else null end));
    end loop;
  end loop;
  return jsonb_build_object('seasonYear', p_season_year, 'validAttempts', valid_count,
    'teamTimeHundredths', team_total, 'playerCount', player_count,
    'placeholderCount', 10-player_count, 'targetPlayerCount', 10, 'crossings', crossings);
end;
$$;
revoke all on function public.get_team_milestones_snapshot_v2(integer,jsonb) from public;
grant execute on function public.get_team_milestones_snapshot_v2(integer,jsonb) to anon, authenticated;

-- No user-data fixtures/writes. This local setting disappears on ROLLBACK.
select set_config('app.milestone_preflight_catalog', '[{"id":"beer-blood-donation","kind":"beer-volume","threshold":0.5},{"id":"beer-mass-1l","kind":"beer-volume","threshold":1},{"id":"beer-drinking-water","kind":"beer-volume","threshold":1.5},{"id":"beer-boot-3l","kind":"beer-volume","threshold":3},{"id":"beer-party-keg","kind":"beer-volume","threshold":5},{"id":"beer-blood-volume","kind":"beer-volume","threshold":5.5},{"id":"beer-toilet-flush","kind":"beer-volume","threshold":6},{"id":"beer-crate-033","kind":"beer-volume","threshold":7.92},{"id":"beer-crate-05","kind":"beer-volume","threshold":10},{"id":"beer-cola-crate","kind":"beer-volume","threshold":12},{"id":"beer-keyes-20-4","kind":"beer-volume","threshold":20.4},{"id":"beer-steins-26","kind":"beer-volume","threshold":26},{"id":"beer-cow-milk","kind":"beer-volume","threshold":36},{"id":"beer-body-water","kind":"beer-volume","threshold":45},{"id":"beer-denmark-keg-50l","kind":"beer-volume","threshold":50},{"id":"beer-dowdeswell-51-1","kind":"beer-volume","threshold":51.1},{"id":"beer-water-footprint-02","kind":"beer-volume","threshold":60},{"id":"beer-andre-legend","kind":"beer-volume","threshold":73},{"id":"beer-annual-consumption","kind":"beer-volume","threshold":84.3},{"id":"beer-water-footprint-033","kind":"beer-volume","threshold":99},{"id":"beer-champagne-117","kind":"beer-volume","threshold":117},{"id":"beer-paper-bin-120","kind":"beer-volume","threshold":120},{"id":"beer-cow-water","kind":"beer-volume","threshold":125},{"id":"beer-coffee","kind":"beer-volume","threshold":130},{"id":"beer-shopping-cart","kind":"beer-volume","threshold":150},{"id":"beer-bathtub-180l","kind":"beer-volume","threshold":180},{"id":"beer-dixi-tank","kind":"beer-volume","threshold":225},{"id":"beer-paper-bin-240","kind":"beer-volume","threshold":240},{"id":"beer-water-footprint-1l","kind":"beer-volume","threshold":300},{"id":"beer-whisky-bottle","kind":"beer-volume","threshold":311},{"id":"beer-porsche-924","kind":"beer-volume","threshold":370},{"id":"beer-beer-bottle","kind":"beer-volume","threshold":625.5},{"id":"beer-whirlpool","kind":"beer-volume","threshold":795},{"id":"beer-ibc","kind":"beer-volume","threshold":1000},{"id":"beer-beer-glass","kind":"beer-volume","threshold":2082},{"id":"beer-cotton-shirt","kind":"beer-volume","threshold":2495},{"id":"beer-wine-bottle","kind":"beer-volume","threshold":3094},{"id":"beer-dixi-cabin","kind":"beer-volume","threshold":3370},{"id":"beer-pool","kind":"beer-volume","threshold":4500},{"id":"beer-concrete-mixer","kind":"beer-volume","threshold":9000},{"id":"beer-fire-engine","kind":"beer-volume","threshold":10000},{"id":"beer-beer-mug","kind":"beer-volume","threshold":12910},{"id":"beer-beef","kind":"beer-volume","threshold":15500},{"id":"beer-chocolate","kind":"beer-volume","threshold":17000},{"id":"beer-tanker","kind":"beer-volume","threshold":30000},{"id":"beer-heidelberg-barrel","kind":"beer-volume","threshold":219000},{"id":"team-sand-47","kind":"team-time","threshold":47},{"id":"team-400m-43-03","kind":"team-time","threshold":43.03},{"id":"team-red-card-43","kind":"team-time","threshold":43},{"id":"team-ingenuity-39-10","kind":"team-time","threshold":39.1},{"id":"team-relay-36-84","kind":"team-time","threshold":36.84},{"id":"team-speedskating-33-61","kind":"team-time","threshold":33.61},{"id":"team-bolt-300m","kind":"team-time","threshold":30.97},{"id":"team-periodic-table","kind":"team-time","threshold":29.98},{"id":"team-cube-29-49","kind":"team-time","threshold":29.49},{"id":"team-paper-plane","kind":"team-time","threshold":29.2},{"id":"team-sound-10km","kind":"team-time","threshold":29.1},{"id":"team-minesweeper-26-59","kind":"team-time","threshold":26.59},{"id":"team-sack-race-25-96","kind":"team-time","threshold":25.96},{"id":"team-breaststroke-25-95","kind":"team-time","threshold":25.95},{"id":"team-jesko-25-21","kind":"team-time","threshold":25.21},{"id":"team-handstand-25-01","kind":"team-time","threshold":25.01},{"id":"team-bajrami-23","kind":"team-time","threshold":23},{"id":"team-200m-women","kind":"team-time","threshold":21.34},{"id":"team-minecraft","kind":"team-time","threshold":21.05},{"id":"team-nhl-21","kind":"team-time","threshold":21},{"id":"team-freestyle-20-88","kind":"team-time","threshold":20.88},{"id":"team-tetris-19-68","kind":"team-time","threshold":19.68},{"id":"team-bolt-200m","kind":"team-time","threshold":19.19},{"id":"team-soda-18-45","kind":"team-time","threshold":18.45},{"id":"team-hotdog-18-15","kind":"team-time","threshold":18.15}]', true);
set local role authenticated;
with scopes as (
  select null::integer season_year
  union all
  select max(year) from (
    select extract(year from start_date)::integer year from public.events where deleted_at is null
    union all select extract(year from attempt_date)::integer from public.historical_attempts where deleted_at is null
  ) years having max(year) >= 2026
), snapshots as materialized (
  select season_year,
    public.get_team_milestones_snapshot_v2(season_year,current_setting('app.milestone_preflight_catalog')::jsonb) payload,
    public.get_team_milestones_snapshot(season_year) old_payload
  from scopes
)
select coalesce(season_year::text,'All-Time') scope,
  case when (payload->>'validAttempts')::bigint=(old_payload->>'validAttempts')::bigint then 'OK' else 'FAIL' end volume_parity,
  case when (payload->>'teamTimeHundredths')::bigint=
    coalesce((old_payload->>'teamTimeHundredths')::bigint,0)+(10-(old_payload->>'playerCount')::integer)*500
    then 'OK' else 'FAIL' end adjusted_pb_parity,
  (payload->>'validAttempts')::numeric*.2 beer_liters,
  (payload->>'teamTimeHundredths')::numeric/100 team_seconds,
  payload->>'playerCount' player_count,payload->>'placeholderCount' placeholders,
  jsonb_array_length(payload->'crossings') crossing_count,
  payload->'crossings' historical_evidence
from snapshots;

-- Auth/RLS: SELECT allowed, client writes forbidden; admin-media is the sole writer.
select
  case when has_table_privilege('anon','public.team_milestone_content','SELECT')
    and has_table_privilege('authenticated','public.team_milestone_content','SELECT')
    and not has_table_privilege('anon','public.team_milestone_content','INSERT,UPDATE,DELETE')
    and not has_table_privilege('authenticated','public.team_milestone_content','INSERT,UPDATE,DELETE')
    then 'OK' else 'FAIL' end content_grants;
select milestone_id,info_text,image_path from public.team_milestone_content;
select policyname,cmd,roles,qual,with_check from pg_policies
where (schemaname='public' and tablename='team_milestone_content')
  or (schemaname='storage' and tablename='objects' and
    (coalesce(qual,'') like '%team-milestone-artwork%' or coalesce(with_check,'') like '%team-milestone-artwork%'));

-- RPC total execution, INCLUDING the chronological loop. No statement_timeout override.
explain (analyze,buffers,timing off)
select public.get_team_milestones_snapshot_v2(null,current_setting('app.milestone_preflight_catalog')::jsonb);
explain (analyze,buffers,timing off)
select public.get_team_milestones_snapshot_v2(s.year,current_setting('app.milestone_preflight_catalog')::jsonb)
from (select max(year) year from (
  select extract(year from start_date)::integer year from public.events where deleted_at is null
  union all select extract(year from attempt_date)::integer from public.historical_attempts where deleted_at is null
) years) s where s.year >= 2026;
-- No matching year => zero rows / SKIP; do not invent a season.
-- EXPLAIN of PL/pgSQL shows total execution, not nested scan plans.
-- Inspect nested plans in a disposable staging DB with auto_explain when needed.
ROLLBACK;
