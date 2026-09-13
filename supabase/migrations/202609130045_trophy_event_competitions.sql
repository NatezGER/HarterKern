-- Add an optional concrete competition identity on top of trophy events.

alter table public.events
  add column if not exists trophy_competition_key text,
  add column if not exists trophy_competition_year integer;

alter table public.events
  add constraint events_trophy_competition_valid check (
    (trophy_competition_key is null) = (trophy_competition_year is null)
    and (awards_trophies or trophy_competition_key is null)
    and (
      trophy_competition_key is null
      or (trophy_competition_key = 'denmark' and trophy_competition_year = 2026)
    )
  );

create or replace function public.sync_start_event_v4(
  p_name text,
  p_start_date date,
  p_participants jsonb,
  p_started_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_legacy_source_id text default null,
  p_awards_trophies boolean default false,
  p_trophy_competition_key text default null,
  p_trophy_competition_year integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not coalesce(p_awards_trophies, false)
    and (p_trophy_competition_key is not null or p_trophy_competition_year is not null)
  then
    raise exception 'Eine Trophäenserie erfordert ein Trophäen-Event.';
  end if;

  if (p_trophy_competition_key is null) <> (p_trophy_competition_year is null) then
    raise exception 'Trophäenserie und Jahr müssen gemeinsam angegeben werden.';
  end if;

  if p_trophy_competition_key is not null
    and not (p_trophy_competition_key = 'denmark' and p_trophy_competition_year = 2026)
  then
    raise exception 'Unbekannte Trophäenserie.';
  end if;

  result := public.sync_start_event_v3(
    p_name, p_start_date, p_participants, p_started_at, p_ends_at,
    p_legacy_source_id, p_awards_trophies
  );

  update public.events
  set trophy_competition_key = p_trophy_competition_key,
      trophy_competition_year = p_trophy_competition_year
  where id = (result->>'eventId')::uuid;

  return result;
end;
$$;

-- Keep the existing edit RPC compatible. Turning trophies off also clears the
-- optional concrete competition, while ordinary edits preserve it.
create or replace function public.sync_update_event_v2(
  p_event_id uuid,
  p_name text,
  p_start_date date,
  p_awards_trophies boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_update_event(p_event_id, p_name, p_start_date);
  update public.events
  set awards_trophies = coalesce(p_awards_trophies, false),
      trophy_competition_key = case when coalesce(p_awards_trophies, false)
        then trophy_competition_key else null end,
      trophy_competition_year = case when coalesce(p_awards_trophies, false)
        then trophy_competition_year else null end
  where id = p_event_id and deleted_at is null;
  if not found then raise exception 'Event nicht gefunden.'; end if;
end;
$$;

drop function public.get_player_trophies(uuid);

create or replace view public.player_trophies
with (security_invoker = true)
as
select
  concat('event-trophy:', ep.event_id, ':',
    coalesce(ep.player_id::text, concat('guest:', ep.guest_id::text)), ':', ep.rank) trophy_key,
  'event'::text competition_type,
  'event'::text scope_type,
  ep.event_id competition_id,
  null::text season_key,
  coalesce(nullif(trim(e.name), ''), concat('Event ', e.start_date::text)) competition_name,
  extract(year from e.start_date)::integer competition_year,
  e.start_date event_date,
  ep.rank::integer placement,
  case ep.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end trophy_tier,
  ep.player_id,
  ep.guest_id,
  ep.display_name,
  p.avatar_url,
  p.avatar_path,
  ep.is_guest,
  ep.best_time_hundredths,
  coalesce(e.closed_at, e.ends_at) awarded_at,
  e.trophy_competition_key,
  e.trophy_competition_year
from public.event_podium ep
join public.events e on e.id = ep.event_id
left join public.players p on p.id = ep.player_id
where e.status = 'closed'
  and e.deleted_at is null
  and e.awards_trophies
  and ep.rank between 1 and 3
union all
select h.*, null::text trophy_competition_key,
  null::integer trophy_competition_year
from public.historical_player_trophies h;

create function public.get_player_trophies(p_player_id uuid)
returns setof public.player_trophies
language sql
stable
security invoker
set search_path = public
as $$
  select trophies.*
  from (
    select concat('event-trophy:', ep.event_id, ':', ep.player_id, ':', ep.rank),
      'event'::text, 'event'::text, ep.event_id, null::text,
      coalesce(nullif(trim(e.name), ''), concat('Event ', e.start_date::text)),
      extract(year from e.start_date)::integer, e.start_date, ep.rank::integer,
      case ep.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end,
      ep.player_id, ep.guest_id, ep.display_name, p.avatar_url, p.avatar_path,
      ep.is_guest, ep.best_time_hundredths, coalesce(e.closed_at, e.ends_at),
      e.trophy_competition_key, e.trophy_competition_year
    from public.event_podium ep
    join public.events e on e.id = ep.event_id
    join public.players p on p.id = ep.player_id
    where ep.player_id = p_player_id and e.status = 'closed'
      and e.deleted_at is null and e.awards_trophies and ep.rank between 1 and 3
    union all
    select h.*, null::text, null::integer
    from public.historical_player_trophies h
    where h.player_id = p_player_id
    union all
    select concat('season-trophy:', hof.season_year, ':', hof.player_id, ':', hof.rank),
      'season'::text, 'season'::text,
      concat('00000000-0000-0000-0000-', lpad(hof.season_year::text, 12, '0'))::uuid,
      hof.season_year::text,
      case hof.rank when 1 then concat('Saisonmeister ', hof.season_year)
        else concat('Saison ', hof.season_year, ' · Platz ', hof.rank) end,
      hof.season_year, make_date(hof.season_year, 12, 31), hof.rank,
      case hof.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end,
      hof.player_id, null::uuid, hof.display_name, hof.avatar_url,
      hof.avatar_path, false, hof.personal_best_hundredths, status.finalized_at,
      null::text, null::integer
    from public.season_hall_of_fame hof
    join public.get_season_finalization_status(now()) status
      on status.season_year = hof.season_year and status.is_finalized
    where hof.player_id = p_player_id and hof.rank between 1 and 3
  ) trophies(
    trophy_key, competition_type, scope_type, competition_id, season_key,
    competition_name, competition_year, event_date, placement, trophy_tier,
    player_id, guest_id, display_name, avatar_url, avatar_path, is_guest,
    best_time_hundredths, awarded_at, trophy_competition_key,
    trophy_competition_year
  )
  order by trophies.awarded_at desc, trophies.trophy_key;
$$;

revoke all on function public.sync_start_event_v4(
  text, date, jsonb, timestamptz, timestamptz, text, boolean, text, integer
) from public;
grant execute on function public.sync_start_event_v4(
  text, date, jsonb, timestamptz, timestamptz, text, boolean, text, integer
) to anon, authenticated;
revoke all on function public.get_player_trophies(uuid) from public;
grant execute on function public.get_player_trophies(uuid) to anon, authenticated;
