-- P11.6: pair-scoped persisted prestige and one batched admin progress read.

create or replace function public.get_player_badge_prestige(p_player_ids uuid[])
returns table (
  player_id uuid, at_least_bronze integer, at_least_silver integer,
  at_least_gold integer, at_least_diamond integer, emerald integer
)
language sql stable security invoker set search_path = public
as $$
  with requested as (
    select distinct unnest(coalesce(p_player_ids, array[]::uuid[])) player_id
  ), family_maximums as (
    select ledger.player_id, definitions.family_key,
      max(case definitions.tier when 'bronze' then 1 when 'silver' then 2
        when 'gold' then 3 when 'diamond' then 4 else 0 end)::integer tier_rank
    from public.player_badge_award_ledger ledger
    join requested on requested.player_id = ledger.player_id
    join public.badge_definitions definitions on definitions.badge_key = ledger.badge_key
    where definitions.is_active and definitions.badge_kind = 'tiered'
      and definitions.design_variant = 'standard'
      and definitions.family_key is not null
      and definitions.tier in ('bronze', 'silver', 'gold', 'diamond')
    group by ledger.player_id, definitions.family_key
  ), ladder as (
    select player_id,
      count(*) filter (where tier_rank >= 1)::integer at_least_bronze,
      count(*) filter (where tier_rank >= 2)::integer at_least_silver,
      count(*) filter (where tier_rank >= 3)::integer at_least_gold,
      count(*) filter (where tier_rank >= 4)::integer at_least_diamond
    from family_maximums group by player_id
  ), specials as (
    select ledger.player_id, count(distinct ledger.badge_key)::integer emerald
    from public.player_badge_award_ledger ledger
    join requested on requested.player_id = ledger.player_id
    join public.badge_definitions definitions on definitions.badge_key = ledger.badge_key
    where definitions.is_active and definitions.design_variant = 'positive_special'
    group by ledger.player_id
  )
  select requested.player_id, coalesce(ladder.at_least_bronze, 0),
    coalesce(ladder.at_least_silver, 0), coalesce(ladder.at_least_gold, 0),
    coalesce(ladder.at_least_diamond, 0), coalesce(specials.emerald, 0)
  from requested left join ladder using (player_id) left join specials using (player_id);
$$;

create or replace function public.get_admin_badge_family_progress()
returns table (
  player_id uuid, display_name text, family_key text,
  current_progress integer, time_hundredths integer
)
language sql stable security definer set search_path = public
as $$
  with valid_attempts as materialized (
    select a.id, a.player_id, a.event_id, a.submitted_at
    from public.attempts a join public.players p on p.id = a.player_id
    left join public.events e on e.id = a.event_id
    where a.status = 'approved' and a.deleted_at is null and not a.is_dnf
      and not a.is_ak and a.time_hundredths is not null
      and not p.is_ak and not p.is_archived
      and (a.event_id is null or e.deleted_at is null)
  ), event_attempts as (
    select player_id, max(event_total)::integer progress from (
      select player_id, event_id, count(*) event_total from valid_attempts
      where event_id is not null group by player_id, event_id
    ) counts group by player_id
  ), rapid_fire as (
    select player_id, max(window_total)::integer progress from (
      select current_attempt.player_id,
        (select count(*) from valid_attempts window_attempt
          where window_attempt.player_id = current_attempt.player_id
            and window_attempt.submitted_at between current_attempt.submitted_at - interval '60 minutes' and current_attempt.submitted_at) window_total
      from valid_attempts current_attempt
    ) windows group by player_id
  ), teamwork as (
    select standings.player_id, count(distinct standings.event_id)::integer progress
    from public.event_final_standings standings
    join public.players players on players.id = standings.player_id
    where standings.player_id is not null and standings.best_time_hundredths is not null
      and not standings.is_ak and not players.is_ak and not players.is_archived
      and exists (select 1 from public.event_final_standings teammate
        where teammate.event_id = standings.event_id
          and teammate.best_time_hundredths = standings.best_time_hundredths
          and not teammate.is_ak
          and (teammate.player_id is distinct from standings.player_id or teammate.guest_id is distinct from standings.guest_id))
    group by standings.player_id
  ), direct_progress as (
    select ps.player_id, p.display_name, 'valid-attempts'::text family_key, ps.valid_attempts::integer progress, null::integer time_hundredths
      from public.player_statistics ps join public.players p on p.id = ps.player_id
    union all select ps.player_id, p.display_name, 'event-wins', ps.event_wins::integer, null
      from public.player_statistics ps join public.players p on p.id = ps.player_id
    union all select ps.player_id, p.display_name, 'events-played', ps.event_participations::integer, null
      from public.player_statistics ps join public.players p on p.id = ps.player_id
    union all select ps.player_id, p.display_name, 'podiums',
      (ps.event_wins + ps.second_places + ps.third_places)::integer, null
      from public.player_statistics ps join public.players p on p.id = ps.player_id
    union all select ps.player_id, p.display_name, 'time-limits', ps.personal_best_hundredths::integer, ps.personal_best_hundredths::integer
      from public.player_statistics ps join public.players p on p.id = ps.player_id where ps.personal_best_hundredths is not null
    union all select metrics.player_id, p.display_name, 'event-attempts', metrics.progress, null
      from event_attempts metrics join public.players p on p.id = metrics.player_id
    union all select metrics.player_id, p.display_name, 'rapid-fire', metrics.progress, null
      from rapid_fire metrics join public.players p on p.id = metrics.player_id
    union all select metrics.player_id, p.display_name, 'teamwork', metrics.progress, null
      from teamwork metrics join public.players p on p.id = metrics.player_id
  ), evidence as materialized (
    select source.player_id, players.display_name, definitions.family_key,
      definitions.category, (source.metadata->>'progress')::integer progress,
      (source.metadata->>'timeHundredths')::integer time_hundredths
    from public.player_badge_award_sync_source source
    join public.badge_definitions definitions on definitions.badge_key = source.badge_key
    join public.players players on players.id = source.player_id
    where definitions.is_active and definitions.badge_kind = 'tiered'
      and definitions.design_variant = 'standard'
      and definitions.family_key is not null
      and source.metadata ? 'progress'
      and not players.is_ak and not players.is_archived
  ), candidates as (
    select direct_progress.*, 0 source_priority from direct_progress
    union all
    select evidence.player_id, evidence.display_name, evidence.family_key,
      evidence.progress, evidence.time_hundredths, 1 from evidence
  ), ranked as (
    select candidates.*, row_number() over (
      partition by player_id, family_key
      order by source_priority, progress desc nulls last, time_hundredths asc nulls last
    ) family_position
    from candidates
  )
  select player_id, display_name, family_key, progress, time_hundredths
  from ranked where family_position = 1;
$$;

revoke all on function public.get_player_badge_prestige(uuid[]),
  public.get_admin_badge_family_progress() from public;
grant execute on function public.get_player_badge_prestige(uuid[]),
  public.get_admin_badge_family_progress() to anon, authenticated;
