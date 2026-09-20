-- PR #58: read-only, bounded Hall of Fame statistics. No badge source or
-- attempt-write path is changed.

create or replace function public.get_two_in_sixty_hall_of_fame(
  p_mode text default 'best'
)
returns table (
  rank bigint, player_id uuid, display_name text, run_count bigint,
  first_time_hundredths integer, second_time_hundredths integer,
  sum_hundredths integer, event_id uuid, event_name text, event_date date
)
language sql stable security invoker set search_path = public
as $$
  with qualified as (
    select a.id, a.player_id, a.event_id, a.submitted_at,
      a.time_hundredths, p.display_name, e.name event_name,
      e.start_date event_date
    from public.attempts a
    join public.players p on p.id = a.player_id
      and not p.is_ak and not p.is_archived
    join public.events e on e.id = a.event_id and e.deleted_at is null
    where a.status = 'approved' and a.deleted_at is null
      and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
  ), adjacent as (
    select qualified.*,
      lag(id) over attempt_order previous_id,
      lag(time_hundredths) over attempt_order previous_time,
      lag(submitted_at) over attempt_order previous_submitted_at
    from qualified
    window attempt_order as (
      partition by player_id, event_id order by submitted_at, id
    )
  ), pairs as (
    select player_id, display_name, event_id, event_name, event_date,
      previous_id, id second_id, previous_time first_time,
      time_hundredths second_time,
      previous_time + time_hundredths total_time, submitted_at
    from adjacent
    -- Manual entry may lag the real drink: the public name stays "2 in 60",
    -- while the recorded timestamps deliberately allow 180 seconds.
    where previous_id is not null
      and submitted_at - previous_submitted_at <= interval '180 seconds'
  ), personal as (
    select pairs.*,
      count(*) over (partition by player_id) personal_run_count,
      row_number() over (
        partition by player_id
        order by total_time, submitted_at, second_id
      ) personal_position
    from pairs
  ), best as (
    select * from personal where personal_position = 1
  ), ranked as (
    select best.*,
      rank() over (order by total_time) best_rank,
      rank() over (order by personal_run_count desc, total_time)
        frequency_rank
    from best
  )
  select case when p_mode = 'frequency' then frequency_rank else best_rank end,
    player_id, display_name, personal_run_count, first_time, second_time,
    total_time, event_id, event_name, event_date
  from ranked
  order by case when p_mode = 'frequency' then personal_run_count end desc,
    total_time, display_name, player_id;
$$;

create or replace function public.get_ranked_official_attempts(
  p_limit integer default 50, p_offset integer default 0
)
returns table (
  rank bigint, total_count bigint, source_id uuid, source_type text,
  player_id uuid, guest_id uuid, display_name text,
  time_hundredths integer, event_name text, source_label text,
  occurred_date date, attempt_number integer
)
language sql stable security invoker set search_path = public
as $$
  with ranked as (
    select rank() over (order by q.time_hundredths) placement,
      count(*) over () total_count, q.source_id, q.source_type,
      q.player_id, q.guest_id, q.display_name, q.time_hundredths,
      e.name event_name, h.historical_label source_label,
      q.occurred_date,
      case when q.source_type = 'attempt' and q.source_order > 0
        then q.source_order end attempt_number,
      q.occurred_at, q.source_priority, q.source_order
    from public.qualified_official_times q
    left join public.events e on e.id = q.event_id
    left join public.historical_attempts h
      on h.id = q.source_id and q.source_type = 'historical_attempt'
  )
  select placement, total_count, source_id, source_type, player_id,
    guest_id, display_name, time_hundredths, event_name, source_label,
    occurred_date, attempt_number
  from ranked
  order by time_hundredths, occurred_at, source_priority, source_order,
    source_id
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_event_first_attempt_benchmarks(
  p_event_id uuid
)
returns table (player_id uuid, best_time_hundredths integer)
language sql stable security invoker set search_path = public
as $$
  with current_event as (
    select id, started_at from public.events
    where id = p_event_id and deleted_at is null
  ), participants as (
    select ep.player_id
    from public.event_participants ep
    join public.players p on p.id = ep.player_id
      and not p.is_ak and not p.is_archived
    join current_event on current_event.id = ep.event_id
    where ep.player_id is not null
  )
  select details.player_id, min(details.time_hundredths)::integer
  from participants
  join public.event_attempt_details details
    on details.player_id = participants.player_id
      and details.attempt_number = 1
  join public.events previous_event on previous_event.id = details.event_id
    and previous_event.deleted_at is null
  cross join current_event
  where previous_event.started_at < current_event.started_at
    and not details.is_dnf and not details.is_ak
    and details.time_hundredths is not null
    and not exists (
      select 1 from public.attempts current_attempt
      where current_attempt.event_id = p_event_id
        and current_attempt.player_id = participants.player_id
        and current_attempt.status = 'approved'
        and current_attempt.deleted_at is null
        and not current_attempt.is_dnf and not current_attempt.is_ak
        and current_attempt.time_hundredths is not null
    )
  group by details.player_id;
$$;

revoke all on function public.get_two_in_sixty_hall_of_fame(text),
  public.get_ranked_official_attempts(integer, integer),
  public.get_event_first_attempt_benchmarks(uuid) from public;
grant execute on function public.get_two_in_sixty_hall_of_fame(text),
  public.get_ranked_official_attempts(integer, integer),
  public.get_event_first_attempt_benchmarks(uuid) to anon, authenticated;
