-- Beer statistics 3.0: additive read-model replacement only. Requires 073.
-- No writes, backfill, new media infrastructure or eligibility changes.
-- Existing whole-population averages / favorite fields remain compatible.
create or replace function public.get_beer_statistics_dashboard(p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path = public as $$
with scoped_events as (
  select id, name, start_date from public.events
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
  select q.attempt_id, q.player_id, q.event_id, q.time_hundredths, a.beer_brand,
    e.name event_name, e.start_date event_date, a.submitted_at
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
), player_details as (
  select b.*, p.display_name, o.average overall_average, o.attempts overall_attempts,
    b.average - o.average effect,
    jsonb_build_object('playerId', b.player_id, 'name', p.display_name, 'brand', b.beer_brand,
      'attempts', b.attempts, 'averageHundredths', b.average, 'bestHundredths', b.best,
      'overallAverageHundredths', o.average, 'overallAttempts', o.attempts,
      'effectHundredths', b.average-o.average) item
  from player_beers b join overall o using(player_id)
  join public.players p on p.id=b.player_id
), personal_records as (
  -- player_details is already exactly one row per player/brand.
  select *, row_number() over (partition by beer_brand order by best, player_id) best_order
  from player_details
), brand_power as (
  select beer_brand, avg(best)::numeric power_value, count(*)::integer player_count,
    min(best)::numeric best,
    jsonb_agg(item order by best, player_id) players
  from personal_records where best_order <= 5 group by beer_brand
), fastest_players as (
  select beer_brand, jsonb_agg(item order by best, player_id) players
  from personal_records group by beer_brand
), customers as (
  select beer_brand, jsonb_agg(jsonb_build_object(
    'personKey',person_key,'playerId',player_id,'name',person_name,
    'isGuest',is_guest,'isAk',is_ak,'attempts',attempts
  ) order by position) items
  from person_consumption where position<=3 group by beer_brand
), turbo_pairs as (
  select *, row_number() over (partition by beer_brand order by effect, attempts desc,
    display_name collate "C", player_id) effect_order
  from player_details where attempts>=2 and effect<0
), brake_pairs as (
  select *, row_number() over (partition by beer_brand order by effect desc, attempts desc,
    display_name collate "C", player_id) effect_order
  from player_details where attempts>=2 and effect>0
), brand_turbo as (
  select beer_brand,jsonb_agg(item order by effect_order) items
  from turbo_pairs where effect_order<=3 group by beer_brand
), brand_brake as (
  select beer_brand,jsonb_agg(item order by effect_order) items
  from brake_pairs where effect_order<=3 group by beer_brand
), brand_record as (
  select distinct on (q.beer_brand) q.beer_brand,q.player_id,p.display_name,
    q.time_hundredths,q.attempt_id,q.submitted_at
  from performance q join public.players p on p.id=q.player_id
  where nullif(btrim(q.beer_brand),'') is not null
  order by q.beer_brand,q.time_hundredths,q.submitted_at,q.attempt_id
), ranking_values as (
  select 'power'::text category,beer_brand,power_value::numeric value,
    player_count::integer player_count,null::uuid player_id,null::text player_name,
    best::numeric best,0::numeric attempts
  from brand_power where player_count>=2
  union all
  select 'record'::text,beer_brand,time_hundredths::numeric,null::integer,player_id,
    display_name::text,time_hundredths::numeric,0::numeric from brand_record
  union all
  select 'volume'::text,beer_brand,attempts::numeric*0.2,null::integer,null::uuid,
    null::text,null::numeric,attempts::numeric from brand_consumption
  union all
  select 'turbo'::text,beer_brand,effect::numeric,null::integer,player_id,
    display_name::text,best::numeric,attempts::numeric from turbo_pairs where effect_order=1
), ranked_brands as (
  -- Product order explicitly includes sample count and deterministic final brand key.
  select *,row_number() over (partition by category order by
    case when category='volume' then -value else value end,
    player_count desc nulls last,attempts desc,best nulls last,beer_brand collate "C") position
  from ranking_values
), ranking_json as (
  select category,position,jsonb_build_object('brand',beer_brand,'rank',position,
    'value',value,'playerCount',player_count,'playerId',player_id,'playerName',player_name) item
  from ranked_brands
), brand_players as (
  select beer_brand, jsonb_agg(item order by average, attempts desc, best, player_id) items
  from player_details group by beer_brand
), brand_events as (
  select c.beer_brand, jsonb_agg(jsonb_build_object(
    'eventId',e.id,'name',e.name,'date',e.start_date,'attempts',c.attempts
  ) order by e.start_date desc,e.id) items
  from (select beer_brand,event_id,count(*) attempts from consumption group by beer_brand,event_id) c
  join scoped_events e on e.id=c.event_id group by c.beer_brand
), fastest as (
  select q.*, p.display_name from performance q join public.players p on p.id=q.player_id
  where q.beer_brand is not null and btrim(q.beer_brand)<>''
  order by q.time_hundredths,q.submitted_at,q.attempt_id limit 10
), brands as (
  select c.beer_brand, c.attempts, jsonb_build_object(
    'powerValue', pw.power_value, 'powerPlayerCount', coalesce(pw.player_count,0),
    'powerQualified', coalesce(pw.player_count>=2,false),
    'powerPlayers', coalesce(pw.players,'[]'::jsonb),
    'fastestPlayers', coalesce(fp.players,'[]'::jsonb),
    'customers', coalesce(cu.items,'[]'::jsonb),
    'turbo', coalesce(bt.items,'[]'::jsonb), 'brake', coalesce(br.items,'[]'::jsonb),
    'imagePath', bi.image_path, 'players', coalesce(pd.items,'[]'::jsonb),
    'eventDetails', coalesce(ed.items,'[]'::jsonb),
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
  left join brand_power pw on pw.beer_brand=c.beer_brand
  left join fastest_players fp on fp.beer_brand=c.beer_brand
  left join customers cu on cu.beer_brand=c.beer_brand
  left join brand_turbo bt on bt.beer_brand=c.beer_brand
  left join brand_brake br on br.beer_brand=c.beer_brand
  left join public.beer_brand_images bi on bi.brand=c.beer_brand
  left join brand_players pd on pd.beer_brand=c.beer_brand
  left join brand_events ed on ed.beer_brand=c.beer_brand
  left join brand_performance p on p.beer_brand=c.beer_brand
  left join best_beers bb on bb.beer_brand=c.beer_brand
  join person_consumption d on d.beer_brand=c.beer_brand and d.position=1
  left join qualified_player_beers bp on bp.beer_brand=c.beer_brand and bp.beer_player_order=1
  left join public.players pl on pl.id=bp.player_id
)
select jsonb_build_object(
  'seasonYear', p_season_year,
  'rankings', jsonb_build_object(
    'power',coalesce((select jsonb_agg(item order by position) from ranking_json where category='power'),'[]'::jsonb),
    'record',coalesce((select jsonb_agg(item order by position) from ranking_json where category='record'),'[]'::jsonb),
    'volume',coalesce((select jsonb_agg(item order by position) from ranking_json where category='volume'),'[]'::jsonb),
    'turbo',coalesce((select jsonb_agg(item order by position) from ranking_json where category='turbo'),'[]'::jsonb)
  ),
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
  'unlucky', coalesce((select jsonb_agg(item order by effect desc, attempts desc, display_name collate "C", player_id, beer_brand collate "C")
    from player_details where attempts>=2 and effect>0),'[]'::jsonb),
  'fastest', coalesce((select jsonb_agg(jsonb_build_object(
    'attemptId',attempt_id,'playerId',player_id,'name',display_name,'brand',beer_brand,
    'timeHundredths',time_hundredths,'eventId',event_id,'eventName',event_name,'eventDate',event_date
  ) order by time_hundredths,submitted_at,attempt_id) from fastest),'[]'::jsonb),
  'variety', coalesce((select jsonb_agg(jsonb_build_object(
    'playerId',player_id,'name',display_name,'brands',brands,'attempts',attempts
  ) order by brands desc,attempts desc,display_name collate "C",player_id) from variety),'[]'::jsonb)
);
$$;
revoke all on function public.get_beer_statistics_dashboard(integer) from public;
grant execute on function public.get_beer_statistics_dashboard(integer) to anon, authenticated;
