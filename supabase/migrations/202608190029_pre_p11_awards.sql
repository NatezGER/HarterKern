-- Pre-P11: additive badge families, consolation awards and deterministic
-- historical trophies. Existing badge activation states remain untouched.

insert into public.badge_definitions (
  badge_key, category, tier, name, description, threshold, sort_order,
  family_key, requirement, is_secret, badge_kind, design_variant,
  scope_type, is_active
) values
  ('bingo-completion-bronze', 'bingo', 'bronze', 'Volle Karte Bronze',
    'Alle 100 BINGO-Felder mindestens einmal getroffen.', 1, 140,
    'bingo-completion', 'Alle 100 BINGO-Felder mindestens 1-mal treffen',
    false, 'tiered', 'standard', 'all_time', true),
  ('bingo-completion-silver', 'bingo', 'silver', 'Volle Karte Silber',
    'Alle 100 BINGO-Felder mindestens zweimal getroffen.', 2, 141,
    'bingo-completion', 'Alle 100 BINGO-Felder mindestens 2-mal treffen',
    false, 'tiered', 'standard', 'all_time', true),
  ('bingo-completion-gold', 'bingo', 'gold', 'Volle Karte Gold',
    'Alle 100 BINGO-Felder mindestens dreimal getroffen.', 3, 142,
    'bingo-completion', 'Alle 100 BINGO-Felder mindestens 3-mal treffen',
    false, 'tiered', 'standard', 'all_time', true),
  ('bingo-completion-diamond', 'bingo', 'diamond', 'Volle Karte Diamant',
    'Alle 100 BINGO-Felder mindestens fünfmal getroffen.', 5, 143,
    'bingo-completion', 'Alle 100 BINGO-Felder mindestens 5-mal treffen',
    false, 'tiered', 'standard', 'all_time', true),
  ('photo-finish', 'consolation', 'special', 'Photo Finish',
    'Ein wertungsfähiges Event exakt 0,01 Sekunden hinter dem direkt davor platzierten Teilnehmer beendet.',
    null, 210, null,
    'Ein wertungsfähiges Event exakt 0,01 Sekunden hinter dem direkt davor Platzierten beenden',
    false, 'single', 'consolation', 'event', true),
  ('reverse-gear', 'consolation', 'special', 'Rückwärtsgang',
    'Fünf direkt aufeinanderfolgende gültige Versuche innerhalb eines Events werden jeweils langsamer.',
    5, 211, null,
    'Innerhalb eines Events fünf gültige Versuche in Folge jeweils langsamer werden',
    false, 'single', 'consolation', 'event', true),
  ('wooden-bronze-medal', 'consolation', 'special', 'Bronzemedaille aus Holz',
    'Bei fünf abgeschlossenen wertungsfähigen Events Platz 4 erreicht.',
    5, 212, null,
    'Bei fünf abgeschlossenen wertungsfähigen Events Platz 4 erreichen',
    false, 'single', 'consolation', 'all_time', true)
on conflict (badge_key) do update set
  category = excluded.category,
  tier = excluded.tier,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  sort_order = excluded.sort_order,
  family_key = excluded.family_key,
  requirement = excluded.requirement,
  is_secret = excluded.is_secret,
  badge_kind = excluded.badge_kind,
  design_variant = excluded.design_variant,
  scope_type = excluded.scope_type;

update public.badge_definitions
set design_variant = 'consolation', tier = 'special'
where badge_key = 'false-starter';

create view public.bingo_card_completion_progress
with (security_invoker = true)
as
with tiers(tier, threshold) as (
  values ('bronze'::text, 1), ('silver'::text, 2),
    ('gold'::text, 3), ('diamond'::text, 5)
), completed as (
  select
    h.player_id,
    t.tier,
    t.threshold,
    count(distinct h.ending)::integer completed_fields,
    (array_agg(h.occurred_at order by h.occurred_at desc,
      h.source_priority desc, h.source_order desc, h.source_id desc))[1] completed_at,
    (array_agg(h.source_priority order by h.occurred_at desc,
      h.source_priority desc, h.source_order desc, h.source_id desc))[1] completed_source_priority,
    (array_agg(h.source_order order by h.occurred_at desc,
      h.source_priority desc, h.source_order desc, h.source_id desc))[1] completed_source_order,
    (array_agg(h.source_id order by h.occurred_at desc,
      h.source_priority desc, h.source_order desc, h.source_id desc))[1] completed_source_id
  from tiers t
  join public.player_bingo_hits h on h.hit_sequence = t.threshold
  group by h.player_id, t.tier, t.threshold
  having count(distinct h.ending) = 100
)
select * from completed;

create view public.pre_p11_badge_awards
with (security_invoker = true)
as
with placement_qualified_events as (
  select qe.event_id from public.qualified_events qe
  union
  select e.id
  from public.events e
  where e.status = 'closed' and e.deleted_at is null and e.awards_trophies
), photo_finish_candidates as (
  select
    current_place.player_id,
    current_place.event_id,
    current_place.best_time_hundredths,
    coalesce(e.closed_at, e.ends_at) awarded_at,
    row_number() over (
      partition by current_place.player_id
      order by coalesce(e.closed_at, e.ends_at), current_place.event_id
    ) match_sequence
  from public.event_podium current_place
  join public.event_podium prior_place
    on prior_place.event_id = current_place.event_id
    and prior_place.rank = current_place.rank - 1
    and current_place.best_time_hundredths = prior_place.best_time_hundredths + 1
  join placement_qualified_events qualified
    on qualified.event_id = current_place.event_id
  join public.events e on e.id = current_place.event_id
    and e.status = 'closed' and e.deleted_at is null
  join public.players p on p.id = current_place.player_id
    and not p.is_ak and not p.is_archived
  where current_place.player_id is not null
), ordered_event_attempts as (
  select
    a.id,
    a.player_id,
    a.event_id,
    a.time_hundredths,
    a.is_dnf,
    a.submitted_at,
    lag(a.time_hundredths, 1) over attempt_order time_1,
    lag(a.time_hundredths, 2) over attempt_order time_2,
    lag(a.time_hundredths, 3) over attempt_order time_3,
    lag(a.time_hundredths, 4) over attempt_order time_4,
    lag(a.is_dnf, 1) over attempt_order dnf_1,
    lag(a.is_dnf, 2) over attempt_order dnf_2,
    lag(a.is_dnf, 3) over attempt_order dnf_3,
    lag(a.is_dnf, 4) over attempt_order dnf_4
  from public.attempts a
  join public.events e on e.id = a.event_id and e.deleted_at is null
  join public.players p on p.id = a.player_id
    and not p.is_ak and not p.is_archived
  where a.status = 'approved' and a.deleted_at is null and not a.is_ak
  window attempt_order as (
    partition by a.player_id, a.event_id order by a.submitted_at, a.id
  )
), reverse_candidates as (
  select o.*,
    row_number() over (
      partition by player_id order by submitted_at, id
    ) match_sequence
  from ordered_event_attempts o
  where not o.is_dnf and not o.dnf_1 and not o.dnf_2 and not o.dnf_3 and not o.dnf_4
    and o.time_hundredths is not null and o.time_1 is not null
    and o.time_2 is not null and o.time_3 is not null and o.time_4 is not null
    and o.time_hundredths > o.time_1 and o.time_1 > o.time_2
    and o.time_2 > o.time_3 and o.time_3 > o.time_4
), fourth_places as (
  select
    ep.player_id,
    ep.event_id,
    coalesce(e.closed_at, e.ends_at) awarded_at,
    row_number() over (
      partition by ep.player_id
      order by coalesce(e.closed_at, e.ends_at), ep.event_id
    ) fourth_place_count
  from public.event_podium ep
  join placement_qualified_events qualified on qualified.event_id = ep.event_id
  join public.events e on e.id = ep.event_id
    and e.status = 'closed' and e.deleted_at is null
  join public.players p on p.id = ep.player_id
    and not p.is_ak and not p.is_archived
  where ep.player_id is not null and ep.rank = 4
), bingo_awards as (
  select
    concat(c.player_id, ':', bd.badge_key) award_key,
    c.player_id,
    bd.badge_key,
    'bingo'::text source_type,
    null::uuid source_attempt_id,
    null::uuid source_historical_attempt_id,
    null::uuid source_event_id,
    c.completed_at awarded_at,
    jsonb_build_object('progress', 100, 'minimumHitsPerField', c.threshold) metadata
  from public.bingo_card_completion_progress c
  join public.badge_definitions bd
    on bd.family_key = 'bingo-completion' and bd.threshold = c.threshold
    and bd.is_active
), photo_finish_awards as (
  select
    concat(player_id, ':photo-finish'), player_id, 'photo-finish'::text,
    'event'::text, null::uuid, null::uuid, event_id, awarded_at,
    jsonb_build_object('differenceHundredths', 1,
      'timeHundredths', best_time_hundredths)
  from photo_finish_candidates where match_sequence = 1
), reverse_awards as (
  select
    concat(player_id, ':reverse-gear'), player_id, 'reverse-gear'::text,
    'attempt'::text, id, null::uuid, event_id, submitted_at,
    jsonb_build_object('progress', 5, 'timeHundredths', time_hundredths)
  from reverse_candidates where match_sequence = 1
), fourth_place_awards as (
  select
    concat(player_id, ':wooden-bronze-medal'), player_id,
    'wooden-bronze-medal'::text, 'event'::text,
    null::uuid, null::uuid, event_id, awarded_at,
    jsonb_build_object('progress', fourth_place_count, 'rank', 4)
  from fourth_places where fourth_place_count = 5
)
select * from bingo_awards
union all select * from photo_finish_awards
union all select * from reverse_awards
union all select * from fourth_place_awards;

create or replace view public.public_player_badges
with (security_invoker = true)
as
with combined_awards as (
  select * from public.player_badge_awards
  union all
  select * from public.pre_p11_badge_awards
)
select
  awards.award_key,
  awards.player_id,
  p.display_name,
  p.avatar_url,
  awards.badge_key,
  bd.category,
  bd.tier,
  bd.name,
  bd.description,
  awards.source_type,
  awards.source_attempt_id,
  awards.source_historical_attempt_id,
  awards.source_event_id,
  awards.awarded_at,
  awards.metadata,
  bd.badge_kind,
  bd.design_variant,
  bd.scope_type
from combined_awards awards
join public.badge_definitions bd
  on bd.badge_key = awards.badge_key and bd.is_active
join public.players p on p.id = awards.player_id
where not p.is_ak and not p.is_archived;

-- Player-scoped badge gallery read model. The existing visible_player_badges
-- view remains unchanged for consumers that need the league-wide result.
create or replace function public.get_visible_player_badges(p_player_id uuid)
returns table (
  award_key text,
  player_id uuid,
  display_name text,
  avatar_url text,
  avatar_path text,
  badge_key text,
  category text,
  tier public.badge_tier,
  name text,
  description text,
  family_key text,
  requirement text,
  threshold integer,
  sort_order integer,
  is_secret boolean,
  source_type text,
  source_attempt_id uuid,
  source_historical_attempt_id uuid,
  source_event_id uuid,
  source_event_name text,
  source_event_date date,
  awarded_at timestamptz,
  metadata jsonb,
  tier_rank integer,
  recipient_count integer,
  regular_player_count integer,
  rarity_percent integer,
  source_attempt_number integer,
  source_time_hundredths integer,
  next_badge_key text,
  next_badge_name text,
  next_requirement text,
  next_tier public.badge_tier,
  next_threshold integer,
  current_progress integer,
  is_special_event_badge boolean,
  badge_kind text,
  design_variant text,
  scope_type text
)
language sql
stable
security invoker
set search_path = public
as $$
  with requested_awards as materialized (
    select awards.*
    from (
      select pba.*
      from public.player_badge_awards pba
      where pba.player_id = p_player_id
      union all
      select supplemental.*
      from public.pre_p11_badge_awards supplemental
      where supplemental.player_id = p_player_id
    ) awards
    join public.players p on p.id = awards.player_id
    where not p.is_ak
      and not p.is_archived
  ), enriched as (
    select
      ra.*,
      p.display_name,
      p.avatar_url,
      p.avatar_path,
      bd.category,
      bd.tier,
      bd.name,
      bd.description,
      bd.family_key,
      bd.requirement,
      bd.threshold,
      bd.sort_order,
      bd.is_secret,
      e.name as source_event_name,
      e.start_date as source_event_date,
      ead.attempt_number as source_attempt_number,
      ead.time_hundredths as source_time_hundredths,
      case when ra.source_historical_attempt_id is not null
        then h.attempt_date::timestamp at time zone 'Europe/Berlin'
        else ra.awarded_at end as canonical_awarded_at,
      case bd.tier
        when 'special' then 6 when 'diamond' then 5 when 'gold' then 4
        when 'silver' then 3 when 'bronze' then 2 end as tier_rank,
      bd.badge_kind,
      bd.design_variant,
      bd.scope_type
    from requested_awards ra
    join public.players p on p.id = ra.player_id
    join public.badge_definitions bd
      on bd.badge_key = ra.badge_key and bd.is_active
    left join public.events e
      on e.id = ra.source_event_id and e.deleted_at is null
    left join public.historical_attempts h
      on h.id = ra.source_historical_attempt_id and h.deleted_at is null
    left join public.event_attempt_details ead
      on ead.attempt_id = ra.source_attempt_id
  ), ranked as materialized (
    select enriched.*, row_number() over (
      partition by player_id, coalesce(family_key, award_key)
      order by tier_rank desc, threshold desc nulls last, awarded_at, award_key
    ) as family_position
    from enriched
  ), relevant_badge_keys as materialized (
    select distinct badge_key
    from ranked
    where family_position = 1
  ), relevant_award_recipients as materialized (
    select pba.player_id, pba.badge_key
    from public.player_badge_awards pba
    join relevant_badge_keys relevant on relevant.badge_key = pba.badge_key
    union all
    select supplemental.player_id, supplemental.badge_key
    from public.pre_p11_badge_awards supplemental
    join relevant_badge_keys relevant
      on relevant.badge_key = supplemental.badge_key
  ), rarity as materialized (
    select
      awards.badge_key,
      count(distinct awards.player_id)::integer as recipient_count
    from relevant_award_recipients awards
    join public.players recipient on recipient.id = awards.player_id
    where not recipient.is_ak
      and not recipient.is_archived
    group by awards.badge_key
  ), population as materialized (
    select count(*)::integer as regular_player_count
    from public.players
    where not is_ak and not is_archived
  )
  select
    r.award_key, r.player_id, r.display_name, r.avatar_url, r.avatar_path,
    r.badge_key, r.category, r.tier, r.name, r.description, r.family_key,
    r.requirement, r.threshold, r.sort_order, r.is_secret, r.source_type,
    r.source_attempt_id, r.source_historical_attempt_id, r.source_event_id,
    r.source_event_name, r.source_event_date,
    r.canonical_awarded_at as awarded_at, r.metadata, r.tier_rank,
    rarity.recipient_count, population.regular_player_count,
    case when population.regular_player_count = 0 then null
      else round(rarity.recipient_count * 100.0 /
        population.regular_player_count)::integer
      end as rarity_percent,
    r.source_attempt_number, r.source_time_hundredths,
    next_badge.badge_key as next_badge_key,
    next_badge.name as next_badge_name,
    next_badge.requirement as next_requirement,
    next_badge.tier as next_tier,
    next_badge.threshold as next_threshold,
    coalesce((r.metadata->>'progress')::integer,
      case r.category
        when 'attempts' then ps.valid_attempts
        when 'wins' then ps.event_wins
        when 'performance' then ps.personal_best_hundredths
        else null end) as current_progress,
    false as is_special_event_badge,
    r.badge_kind,
    r.design_variant,
    r.scope_type
  from ranked r
  join rarity on rarity.badge_key = r.badge_key
  cross join population
  left join public.player_statistics ps on ps.player_id = r.player_id
  left join lateral (
    select bd.badge_key, bd.name, bd.requirement, bd.tier, bd.threshold,
      case bd.tier when 'special' then 6 when 'diamond' then 5
        when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end as next_rank
    from public.badge_definitions bd
    where bd.family_key = r.family_key and bd.is_active
      and case bd.tier when 'special' then 6 when 'diamond' then 5
        when 'gold' then 4 when 'silver' then 3 when 'bronze' then 2 end > r.tier_rank
    order by next_rank, bd.threshold nulls last, bd.sort_order
    limit 1
  ) next_badge on true
  where r.family_position = 1
  order by r.tier_rank desc, is_special_event_badge desc,
    rarity.recipient_count, r.sort_order, r.award_key;
$$;

revoke all on function public.get_visible_player_badges(uuid) from public;
grant execute on function public.get_visible_player_badges(uuid) to anon, authenticated;

create view public.historical_player_trophies
with (security_invoker = true)
as
with permanent_times as (
  select q.*,
    row_number() over (
      order by q.occurred_at, q.source_priority, q.source_order, q.source_id
    ) chronological_position
  from public.qualified_official_times q
  where q.player_id is not null and not q.is_guest
), first_sub3 as (
  select * from permanent_times
  where time_hundredths < 300
  order by occurred_at, source_priority, source_order, source_id
  limit 1
), first_sub2 as (
  select * from permanent_times
  where time_hundredths < 200
  order by occurred_at, source_priority, source_order, source_id
  limit 1
), first_bingo as (
  select c.*, p.display_name, p.avatar_url, p.avatar_path
  from public.bingo_card_completion_progress c
  join public.players p on p.id = c.player_id
  where c.tier = 'bronze'
  order by c.completed_at, c.completed_source_priority,
    c.completed_source_order, c.completed_source_id, c.player_id
  limit 1
)
select
  'historical:first-sub-3'::text trophy_key,
  'historical'::text competition_type,
  'all_time'::text scope_type,
  '00000000-0000-0000-0000-000000000001'::uuid competition_id,
  null::text season_key,
  'Erster Sub 3'::text competition_name,
  extract(year from occurred_date)::integer competition_year,
  occurred_date event_date,
  1::integer placement,
  'gold'::text trophy_tier,
  player_id,
  null::uuid guest_id,
  display_name,
  avatar_url,
  avatar_path,
  false is_guest,
  time_hundredths best_time_hundredths,
  occurred_at awarded_at
from first_sub3
union all
select
  'historical:first-sub-2', 'historical', 'all_time',
  '00000000-0000-0000-0000-000000000002'::uuid, null::text,
  'Erster Sub 2', extract(year from occurred_date)::integer,
  occurred_date, 1, 'gold', player_id, null::uuid, display_name,
  avatar_url, avatar_path, false, time_hundredths, occurred_at
from first_sub2
union all
select
  'historical:first-bingo-card', 'historical', 'all_time',
  '00000000-0000-0000-0000-000000000003'::uuid, null::text,
  'Erste volle BINGO-Karte', extract(year from completed_at)::integer,
  (completed_at at time zone 'Europe/Berlin')::date, 1, 'gold',
  player_id, null::uuid, display_name, avatar_url, avatar_path, false,
  0::integer, completed_at
from first_bingo;

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
  and ep.rank between 1 and 3
union all
select * from public.historical_player_trophies;

grant select on public.bingo_card_completion_progress,
  public.pre_p11_badge_awards,
  public.historical_player_trophies to anon, authenticated;
