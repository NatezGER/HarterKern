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
