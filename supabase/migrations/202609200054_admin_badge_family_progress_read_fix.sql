-- Admin catalog reads must not expand the global live-award union. The ledger
-- already contains canonical achieved evidence; current direct metrics stay on
-- their established statistics views. No writes or badge sync occur here.
create or replace function public.get_admin_badge_family_progress()
returns table (
  player_id uuid, display_name text, family_key text,
  current_progress integer, time_hundredths integer
)
language sql stable security definer set search_path = public
as $$
  with statistics as materialized (
    select ps.*, players.display_name
    from public.player_statistics ps
    join public.players players on players.id = ps.player_id
    where not players.is_ak and not players.is_archived
  ), valid_attempts as materialized (
    select attempts.id, attempts.player_id, attempts.event_id,
      attempts.submitted_at
    from public.attempts attempts
    join public.players players on players.id = attempts.player_id
    left join public.events events on events.id = attempts.event_id
    where attempts.status = 'approved' and attempts.deleted_at is null
      and not attempts.is_dnf and not attempts.is_ak
      and attempts.time_hundredths is not null
      and not players.is_ak and not players.is_archived
      and (attempts.event_id is null or events.deleted_at is null)
  ), event_attempts as (
    select player_id, max(event_total)::integer progress from (
      select player_id, event_id, count(*) event_total
      from valid_attempts where event_id is not null
      group by player_id, event_id
    ) counts group by player_id
  ), rapid_fire as (
    select player_id, max(window_total)::integer progress from (
      -- RANGE includes every peer with the same submitted_at and the exact
      -- 60-minute boundary, matching the former inclusive BETWEEN count.
      select player_id, count(*) over (
        partition by player_id order by submitted_at
        range between interval '60 minutes' preceding and current row
      ) window_total
      from valid_attempts
    ) windows group by player_id
  ), teamwork as (
    select standings.player_id, count(distinct standings.event_id)::integer progress
    from public.event_final_standings standings
    join public.players players on players.id = standings.player_id
    where standings.player_id is not null
      and standings.best_time_hundredths is not null
      and not standings.is_ak and not players.is_ak and not players.is_archived
      and exists (select 1 from public.event_final_standings teammate
        where teammate.event_id = standings.event_id
          and teammate.best_time_hundredths = standings.best_time_hundredths
          and not teammate.is_ak
          and (teammate.player_id is distinct from standings.player_id
            or teammate.guest_id is distinct from standings.guest_id))
    group by standings.player_id
  ), bingo as materialized (
    select player_id, bronze_lines, collected_endings
    from public.player_bingo_statistics
  ), direct_progress as (
    select player_id, display_name, 'valid-attempts'::text family_key,
      valid_attempts::integer progress, null::integer time_hundredths
    from statistics
    union all select player_id, display_name, 'event-wins',
      event_wins::integer, null from statistics
    union all select player_id, display_name, 'events-played',
      event_participations::integer, null from statistics
    union all select player_id, display_name, 'podiums',
      (event_wins + second_places + third_places)::integer, null
      from statistics
    union all select player_id, display_name, 'time-limits',
      personal_best_hundredths::integer,
      personal_best_hundredths::integer from statistics
      where personal_best_hundredths is not null
    union all select metrics.player_id, players.display_name,
      'event-attempts', metrics.progress, null
      from event_attempts metrics
      join public.players players on players.id = metrics.player_id
    union all select metrics.player_id, players.display_name,
      'rapid-fire', metrics.progress, null
      from rapid_fire metrics
      join public.players players on players.id = metrics.player_id
    union all select metrics.player_id, players.display_name,
      'teamwork', metrics.progress, null
      from teamwork metrics
      join public.players players on players.id = metrics.player_id
    union all select metrics.player_id, players.display_name,
      'bingo', metrics.bronze_lines, null
      from bingo metrics
      join public.players players on players.id = metrics.player_id
    union all select metrics.player_id, players.display_name,
      'bingo-completion', metrics.collected_endings, null
      from bingo metrics
      join public.players players on players.id = metrics.player_id
  ), evidence as (
    select ledger.player_id, players.display_name, definitions.family_key,
      coalesce(case when ledger.metadata->>'progress' ~ '^[0-9]{1,9}$'
        then (ledger.metadata->>'progress')::integer end,
        definitions.threshold) progress,
      case when ledger.metadata->>'timeHundredths' ~ '^[0-9]{1,9}$'
        then (ledger.metadata->>'timeHundredths')::integer end time_hundredths
    from public.player_badge_award_ledger ledger
    join public.badge_definitions definitions
      on definitions.badge_key = ledger.badge_key
    join public.players players on players.id = ledger.player_id
    where definitions.is_active and definitions.badge_kind = 'tiered'
      and definitions.design_variant = 'standard'
      and definitions.family_key is not null
      and ledger.metadata ? 'progress'
      and not players.is_ak and not players.is_archived
  ), candidates as (
    select direct_progress.*, 0 source_priority from direct_progress
    union all
    select evidence.player_id, evidence.display_name, evidence.family_key,
      evidence.progress, evidence.time_hundredths, 1 from evidence
    where evidence.progress is not null
  ), ranked as (
    select candidates.*, row_number() over (
      partition by player_id, family_key
      order by source_priority, progress desc nulls last,
        time_hundredths asc nulls last
    ) family_position
    from candidates
  )
  select player_id, display_name, family_key, progress, time_hundredths
  from ranked where family_position = 1;
$$;
