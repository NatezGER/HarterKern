-- PR 9E: dynamic season finalization and career trophies.

create or replace function public.get_season_finalization_status(
  p_as_of timestamptz default now()
)
returns table (
  season_year integer,
  is_finalized boolean,
  finalized_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with seasons as (
    select generate_series(
      2026,
      extract(year from p_as_of at time zone 'Europe/Berlin')::integer - 1
    )::integer season_year
  ), evaluated as (
    select
      s.season_year,
      not exists (
        select 1
        from public.events active_event
        where active_event.deleted_at is null
          and active_event.status = 'active'
          and extract(year from active_event.start_date)::integer = s.season_year
      ) is_finalized,
      greatest(
        make_timestamptz(s.season_year + 1, 1, 1, 0, 0, 0, 'Europe/Berlin'),
        coalesce(
          (
            select max(coalesce(season_event.closed_at, season_event.ends_at))
            from public.events season_event
            where season_event.deleted_at is null
              and extract(year from season_event.start_date)::integer = s.season_year
          ),
          make_timestamptz(s.season_year + 1, 1, 1, 0, 0, 0, 'Europe/Berlin')
        )
      ) finalized_at
    from seasons s
  )
  select e.season_year, e.is_finalized,
    case when e.is_finalized then e.finalized_at else null end
  from evaluated e;
$$;

create view public.season_finalization_status
with (security_invoker = true)
as
select * from public.get_season_finalization_status(now());

create or replace function public.get_season_trophies(
  p_as_of timestamptz default now()
)
returns table (
  trophy_key text,
  competition_type text,
  scope_type text,
  competition_id uuid,
  season_key text,
  competition_name text,
  competition_year integer,
  event_date date,
  placement integer,
  trophy_tier text,
  player_id uuid,
  guest_id uuid,
  display_name text,
  avatar_url text,
  avatar_path text,
  is_guest boolean,
  best_time_hundredths integer,
  awarded_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    concat('season-trophy:', hof.season_year, ':', hof.player_id, ':', hof.rank),
    'season'::text,
    'season'::text,
    concat(
      '00000000-0000-0000-0000-',
      lpad(hof.season_year::text, 12, '0')
    )::uuid,
    hof.season_year::text,
    case hof.rank
      when 1 then concat('Saisonmeister ', hof.season_year)
      else concat('Saison ', hof.season_year, ' · Platz ', hof.rank)
    end,
    hof.season_year,
    make_date(hof.season_year, 12, 31),
    hof.rank,
    case hof.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end,
    hof.player_id,
    null::uuid,
    hof.display_name,
    hof.avatar_url,
    hof.avatar_path,
    false,
    hof.personal_best_hundredths,
    status.finalized_at
  from public.season_hall_of_fame hof
  join public.get_season_finalization_status(p_as_of) status
    on status.season_year = hof.season_year and status.is_finalized
  where hof.rank between 1 and 3;
$$;

create view public.season_trophies
with (security_invoker = true)
as
select * from public.get_season_trophies(now());

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
  coalesce(e.closed_at, e.ends_at) awarded_at
from public.event_podium ep
join public.events e on e.id = ep.event_id
left join public.players p on p.id = ep.player_id
where e.status = 'closed'
  and e.deleted_at is null
  and e.awards_trophies
  and ep.rank between 1 and 3;

create or replace function public.get_player_trophies(p_player_id uuid)
returns setof public.player_trophies
language sql
stable
security invoker
set search_path = public
as $$
  select trophies.*
  from (
    select *
    from public.player_trophies
    where player_id = p_player_id
    union all
    select
      concat('season-trophy:', hof.season_year, ':', hof.player_id, ':', hof.rank),
      'season'::text,
      'season'::text,
      concat(
        '00000000-0000-0000-0000-',
        lpad(hof.season_year::text, 12, '0')
      )::uuid,
      hof.season_year::text,
      case hof.rank
        when 1 then concat('Saisonmeister ', hof.season_year)
        else concat('Saison ', hof.season_year, ' · Platz ', hof.rank)
      end,
      hof.season_year,
      make_date(hof.season_year, 12, 31),
      hof.rank,
      case hof.rank when 1 then 'gold' when 2 then 'silver' else 'bronze' end,
      hof.player_id,
      null::uuid,
      hof.display_name,
      hof.avatar_url,
      hof.avatar_path,
      false,
      hof.personal_best_hundredths,
      status.finalized_at
    from public.season_hall_of_fame hof
    join public.get_season_finalization_status(now()) status
      on status.season_year = hof.season_year and status.is_finalized
    where hof.player_id = p_player_id
      and hof.rank between 1 and 3
  ) trophies
  order by trophies.awarded_at desc, trophies.trophy_key;
$$;

grant select on public.season_finalization_status,
  public.season_trophies to anon, authenticated;

revoke all on function public.get_season_finalization_status(timestamptz),
  public.get_season_trophies(timestamptz),
  public.get_player_trophies(uuid) from public;
grant execute on function public.get_season_finalization_status(timestamptz),
  public.get_season_trophies(timestamptz),
  public.get_player_trophies(uuid) to anon, authenticated;
