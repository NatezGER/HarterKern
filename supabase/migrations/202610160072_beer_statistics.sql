-- Isolated read-only beer dashboard. Never infer a snapshot from events.beer_brand.
-- Consumption deliberately includes guests/AK. Performance reuses the canonical
-- permanent, non-AK, non-archived population. No writes, triggers or new indexes.
create function public.get_beer_statistics_dashboard(p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path = public as $$
with scoped_events as (
  select id from public.events
  where deleted_at is null and (p_season_year is null or
    (p_season_year >= 2026 and extract(year from start_date)::integer = p_season_year))
), consumption as materialized (
  select a.id, a.event_id, a.beer_brand,
    case when a.player_id is not null then 'player:' || a.player_id::text
      else 'guest:' || g.normalized_name end person_key,
    a.player_id, coalesce(p.display_name, g.display_name) person_name,
    (a.guest_id is not null) is_guest,
    (a.is_ak or coalesce(p.is_ak, false)) is_ak
  from public.attempts a join scoped_events e on e.id = a.event_id
  left join public.players p on p.id = a.player_id
  left join public.event_guests g on g.id = a.guest_id and g.event_id = a.event_id
  where a.status = 'approved' and a.deleted_at is null and not a.is_dnf
    and a.time_hundredths is not null and a.time_hundredths > 0
    and a.beer_brand is not null and btrim(a.beer_brand) <> ''
    and (p.id is not null or g.id is not null)
), performance as materialized (
  select q.player_id, q.event_id, q.time_hundredths, a.beer_brand
  from public.official_event_attempts q
  join scoped_events e on e.id = q.event_id
  join public.attempts a on a.id = q.attempt_id
  where q.is_valid_time and q.time_hundredths > 0
    -- Only players with documented consumption need an overall baseline.
    -- Their NULL-beer attempts stay in this complete scoped population.
    and q.player_id in (select player_id from consumption where player_id is not null)
), overall as (
  -- Includes NULL/blank beer; excludes standalone historical times.
  select player_id, count(*) attempts, avg(time_hundredths)::numeric average
  from performance group by player_id
), player_beers as (
  select player_id, beer_brand, count(*) attempts,
    avg(time_hundredths)::numeric average, min(time_hundredths) best
  from performance where beer_brand is not null and btrim(beer_brand) <> ''
  group by player_id, beer_brand
), qualified_player_beers as (
  select *,
    row_number() over (partition by player_id order by average, attempts desc, best, beer_brand collate "C") favorite_order,
    row_number() over (partition by beer_brand order by average, attempts desc, best, player_id) beer_player_order
  from player_beers where attempts >= 2
), favorites as (
  select b.player_id, p.display_name, b.beer_brand, b.attempts, b.average, b.best,
    o.average overall_average, o.attempts overall_attempts,
    b.average - o.average effect
  from qualified_player_beers b join overall o using (player_id)
  join public.players p on p.id = b.player_id
  where b.favorite_order = 1
), favorite_json as (
  select *, jsonb_build_object(
    'playerId', player_id, 'name', display_name, 'brand', beer_brand,
    'attempts', attempts, 'averageHundredths', average, 'bestHundredths', best,
    'overallAverageHundredths', overall_average, 'overallAttempts', overall_attempts,
    'effectHundredths', effect
  ) item from favorites
), variety as (
  select b.player_id, p.display_name, count(*) brands, sum(b.attempts) attempts
  from player_beers b join public.players p on p.id=b.player_id
  group by b.player_id, p.display_name
), person_consumption as (
  select beer_brand, person_key, player_id, min(person_name collate "C") person_name,
    bool_or(is_guest) is_guest, bool_or(is_ak) is_ak, count(*) attempts,
    row_number() over (partition by beer_brand order by count(*) desc,
      min(person_name collate "C"), person_key) position
  from consumption group by beer_brand, person_key, player_id
), brand_performance as (
  select beer_brand, count(*) attempts, avg(time_hundredths)::numeric average,
    min(time_hundredths) best
  from performance where beer_brand is not null and btrim(beer_brand) <> ''
  group by beer_brand
), best_beers as (
  select beer_brand, row_number() over (
    order by average, attempts desc, best, beer_brand collate "C"
  ) position from brand_performance where attempts >= 2
), brand_consumption as (
  select beer_brand, count(*) attempts, count(distinct event_id) events,
    count(distinct person_key) people from consumption group by beer_brand
), brands as (
  select c.beer_brand, c.attempts, jsonb_build_object(
    'brand', c.beer_brand, 'attempts', c.attempts, 'events', c.events, 'people', c.people,
    'performanceAttempts', coalesce(p.attempts,0), 'averageHundredths', p.average,
    'bestHundredths', p.best, 'qualified', coalesce(p.attempts >= 2,false),
    'performancePosition', bb.position,
    'mostDrinker', jsonb_build_object('personKey', d.person_key, 'playerId', d.player_id,
      'name', d.person_name, 'isGuest', d.is_guest, 'isAk', d.is_ak, 'attempts', d.attempts),
    'bestPlayer', case when bp.player_id is null then null else jsonb_build_object(
      'playerId', bp.player_id, 'name', pl.display_name, 'attempts', bp.attempts,
      'averageHundredths', bp.average, 'bestHundredths', bp.best) end
  ) item
  from brand_consumption c
  left join brand_performance p using (beer_brand)
  left join best_beers bb using (beer_brand)
  join person_consumption d on d.beer_brand=c.beer_brand and d.position=1
  left join qualified_player_beers bp on bp.beer_brand=c.beer_brand and bp.beer_player_order=1
  left join public.players pl on pl.id=bp.player_id
)
select jsonb_build_object(
  'seasonYear', p_season_year,
  'summary', jsonb_build_object(
    'attempts', (select count(*) from consumption),
    'brands', (select count(*) from brand_consumption),
    'events', (select count(distinct event_id) from consumption),
    'people', (select count(distinct person_key) from consumption),
    'bestBeer', (select beer_brand from best_beers where position=1)
  ),
  'brands', coalesce((select jsonb_agg(item order by attempts desc, beer_brand collate "C") from brands),'[]'::jsonb),
  'favorites', coalesce((select jsonb_agg(item order by display_name collate "C", player_id) from favorite_json),'[]'::jsonb),
  'effects', coalesce((select jsonb_agg(item order by effect, attempts desc, display_name collate "C", player_id)
    from favorite_json where effect < 0),'[]'::jsonb),
  'variety', coalesce((select jsonb_agg(jsonb_build_object(
    'playerId',player_id,'name',display_name,'brands',brands,'attempts',attempts
  ) order by brands desc,attempts desc,display_name collate "C",player_id) from variety),'[]'::jsonb)
);
$$;
revoke all on function public.get_beer_statistics_dashboard(integer) from public;
grant execute on function public.get_beer_statistics_dashboard(integer) to anon, authenticated;
