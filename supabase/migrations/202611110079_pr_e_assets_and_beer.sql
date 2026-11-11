-- PR E: additive presentation assets and personal beer aggregates.
-- Existing rows, RLS, grants, dimension/size/type-match checks remain intact.
begin;
alter table public.award_assets drop constraint award_assets_asset_id_check;
alter table public.award_assets add constraint award_assets_asset_id_check check (
 asset_id ~ '^medal:(podium|statistics):(gold|silver|bronze)$'
 or asset_id ~ '^record:(wr|sr|pb|eb)$'
 or asset_id ~ '^badge:[a-z0-9][a-z0-9-]{1,119}$'
 or asset_id ~ '^trophy:(season|denmark):2026:(gold|silver|bronze)$'
 or asset_id ~ '^trophy:historical:(first-sub-3|first-sub-2|first-bingo-card)$'
);
alter table public.award_assets drop constraint award_assets_asset_type_check;
alter table public.award_assets add constraint award_assets_asset_type_check
 check (asset_type in ('medal','badge','trophy','record'));
alter table public.award_assets drop constraint award_assets_storage_path_check;
alter table public.award_assets add constraint award_assets_storage_path_check
 check (storage_path ~ '^(medal|badge|trophy|record):[a-z0-9:-]+/[0-9a-f-]{36}\.(png|webp)$');
-- Existing generated paths remain valid. NOT VALID preserves legacy rows without
-- rewriting them; all new/updated rows must match their own asset slot.
alter table public.award_assets add constraint award_assets_storage_owner_check
 check (split_part(storage_path, '/', 1) = asset_id) not valid;

create or replace function public.get_player_beer_profile(p_player_id uuid, p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path = public as $$
with eligible as materialized (
 select q.time_hundredths, a.beer_brand
 from public.official_event_attempts q
 join public.attempts a on a.id=q.attempt_id
 join public.events e on e.id=q.event_id
 where q.player_id=p_player_id and q.is_valid_time and q.time_hundredths>0
 and (p_season_year is null or (p_season_year>=2026 and extract(year from e.start_date)::integer=p_season_year))
), brand_aggregates as (
 select beer_brand, min(time_hundredths) best, max(time_hundredths) worst,
 avg(time_hundredths) average, count(*) attempts
 from eligible where nullif(btrim(beer_brand),'') is not null
 group by beer_brand
), ranked as (
 select beer_brand, min(time_hundredths) best, count(*) attempts
 from eligible where nullif(btrim(beer_brand),'') is not null
 group by beer_brand order by min(time_hundredths), beer_brand collate "C" limit 3
)
select jsonb_build_object('seasonYear',p_season_year,'validAttempts',(select count(*) from eligible),
 'beers',coalesce((select jsonb_agg(jsonb_build_object('brand',r.beer_brand,'bestHundredths',r.best,
 'attempts',r.attempts,'imagePath',i.image_path) order by r.best,r.beer_brand collate "C")
 from ranked r left join public.beer_brand_images i on i.brand=r.beer_brand),'[]'::jsonb),
 'brandRankings',coalesce((select jsonb_agg(jsonb_build_object(
 'brand',r.beer_brand,'imagePath',i.image_path,'attempts',r.attempts,
 'bestHundredths',r.best,'worstHundredths',r.worst,'averageHundredths',r.average
 ) order by r.beer_brand collate "C")
 from brand_aggregates r left join public.beer_brand_images i on i.brand=r.beer_brand),'[]'::jsonb));
$$;
revoke all on function public.get_player_beer_profile(uuid,integer) from public;
grant execute on function public.get_player_beer_profile(uuid,integer) to anon, authenticated;

commit;
