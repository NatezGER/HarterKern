-- Additive V3.1. No backfill or changes to existing RPC signatures/rankings.
create function public.get_player_beer_profile(p_player_id uuid, p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path = public as $$
with eligible as materialized (
 select q.time_hundredths, a.beer_brand
 from public.official_event_attempts q
 join public.attempts a on a.id=q.attempt_id
 join public.events e on e.id=q.event_id
 where q.player_id=p_player_id and q.is_valid_time and q.time_hundredths>0
 and (p_season_year is null or (p_season_year>=2026 and extract(year from e.start_date)::integer=p_season_year))
), ranked as (
 select beer_brand, min(time_hundredths) best, count(*) attempts
 from eligible where nullif(btrim(beer_brand),'') is not null
 group by beer_brand order by min(time_hundredths), beer_brand collate "C" limit 3
)
select jsonb_build_object('seasonYear',p_season_year,'validAttempts',(select count(*) from eligible),
 'beers',coalesce((select jsonb_agg(jsonb_build_object('brand',r.beer_brand,'bestHundredths',r.best,
 'attempts',r.attempts,'imagePath',i.image_path) order by r.best,r.beer_brand collate "C")
 from ranked r left join public.beer_brand_images i on i.brand=r.beer_brand),'[]'::jsonb));
$$;
revoke all on function public.get_player_beer_profile(uuid,integer) from public;
grant execute on function public.get_player_beer_profile(uuid,integer) to anon, authenticated;

create or replace function public.sync_create_event_attempt_v2(
  p_id uuid,
  p_event_id uuid,
  p_participant_id uuid,
  p_participant_kind text,
  p_time_hundredths integer,
  p_is_dnf boolean,
  p_submitted_at timestamptz,
  p_beer_brand text default null,
  p_override_beer_brand boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare event_beer text;
begin
  if (p_is_dnf and p_time_hundredths is not null)
    or (not p_is_dnf and (p_time_hundredths is null or p_time_hundredths not between 1 and 30000)) then
    raise exception 'Ungültige Zeit- oder DNS-Angabe.';
  end if;
  select beer_brand into event_beer from public.events
  where id = p_event_id and status = 'active' and ends_at > now();
  if not found then raise exception 'Das Event ist nicht aktiv.'; end if;

  if p_override_beer_brand then
    event_beer := nullif(btrim(p_beer_brand), '');
  end if;
  if char_length(event_beer) > 80 then raise exception 'Biermarke darf maximal 80 Zeichen enthalten.'; end if;

  if p_participant_kind = 'guest' then
    if not exists (
      select 1 from public.event_guests
      where id = p_participant_id and event_id = p_event_id
    ) then raise exception 'Gast nimmt nicht an diesem Event teil.'; end if;
    insert into public.attempts (
      id, guest_id, event_id, status, time_hundredths, is_dnf,
      submitted_at, approved_at, source, beer_brand
    ) values (
      p_id, p_participant_id, p_event_id, 'approved', p_time_hundredths,
      p_is_dnf, coalesce(p_submitted_at, now()), now(), 'admin', event_beer
    );
  else
    if not exists (
      select 1 from public.event_participants
      where player_id = p_participant_id and event_id = p_event_id
    ) then raise exception 'Spieler nimmt nicht an diesem Event teil.'; end if;
    insert into public.attempts (
      id, player_id, event_id, status, time_hundredths, is_dnf,
      submitted_at, approved_at, source, beer_brand
    ) values (
      p_id, p_participant_id, p_event_id, 'approved', p_time_hundredths,
      p_is_dnf, coalesce(p_submitted_at, now()), now(), 'admin', event_beer
    );
  end if;
  return p_id;
end;
$$;

revoke all on function public.sync_create_event_attempt_v2(uuid,uuid,uuid,text,integer,boolean,timestamptz,text,boolean) from public;
grant execute on function public.sync_create_event_attempt_v2(uuid,uuid,uuid,text,integer,boolean,timestamptz,text,boolean) to anon, authenticated;

-- Preserve V3 ranking calculations; decorate the same payload with avatars.
create function public.get_beer_statistics_dashboard_v31(p_season_year integer default null)
returns jsonb language sql stable security invoker set search_path=public as $$
with payload as materialized (select public.get_beer_statistics_dashboard(p_season_year) data)
select data || jsonb_build_object('avatars',coalesce((
 select jsonb_object_agg(p.id,jsonb_build_object('path',p.avatar_path,'url',p.avatar_url))
 from public.players p where p.id::text in (
  select distinct value #>> '{}' from jsonb_path_query(data,'$.**.playerId') value
 )
),'{}'::jsonb)) from payload;
$$;
revoke all on function public.get_beer_statistics_dashboard_v31(integer) from public;
grant execute on function public.get_beer_statistics_dashboard_v31(integer) to anon,authenticated;

create function public.get_event_beer_images(p_event_id uuid)
returns table(brand text, image_path text) language sql stable security invoker set search_path=public as $$
with consumed as (
 select distinct a.beer_brand brand from public.attempts a
 join public.events e on e.id=a.event_id and e.deleted_at is null
 where a.event_id=p_event_id and a.status='approved' and a.deleted_at is null
 and not a.is_dnf and a.time_hundredths>0 and nullif(btrim(a.beer_brand),'') is not null
)
-- NULL does not distinguish legacy missing snapshots from an explicit unknown beer.
-- Never infer consumption from the current event default.
select b.brand,i.image_path from consumed b left join public.beer_brand_images i on i.brand=b.brand
order by b.brand collate "C";
$$;
revoke all on function public.get_event_beer_images(uuid) from public;
grant execute on function public.get_event_beer_images(uuid) to anon,authenticated;
