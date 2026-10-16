-- Optional, event-batched read. Reuse the profile chart's canonical statistics;
-- no writes, badges, triggers or changes to the attempt-save transaction.
create function public.get_event_sweet_spots(p_event_id uuid)
returns table (
  player_id uuid, attempt_number integer, average_hundredths integer,
  sample_count bigint, next_attempt_number integer
)
language sql stable security invoker set search_path = public as $$
  with participants as materialized (
    select ep.player_id
    from public.event_participants ep
    join public.events e on e.id = ep.event_id
      and e.status = 'active' and e.deleted_at is null
    join public.players p on p.id = ep.player_id
      and not p.is_ak and not p.is_archived
    where ep.event_id = p_event_id
  ), current_counts as (
    -- Same approved/nondeleted/non-AK population as the chart RPC.
    -- DNF consumes an ordinal, even though it contributes no average.
    select a.player_id, count(*)::integer attempts
    from public.official_event_attempts a
    join participants p on p.player_id = a.player_id
    where a.event_id = p_event_id group by a.player_id
  )
  select p.player_id, best.attempt_number, best.average_hundredths,
    best.valid_attempts, coalesce(c.attempts, 0) + 1
  from participants p
  cross join lateral (
    select s.attempt_number, s.average_hundredths, s.valid_attempts
    from public.get_player_attempt_number_statistics(p.player_id) s
    where s.average_hundredths is not null
    order by s.average_hundredths, s.attempt_number
    limit 1
  ) best
  left join current_counts c on c.player_id = p.player_id
  order by p.player_id;
$$;
revoke all on function public.get_event_sweet_spots(uuid) from public;
grant execute on function public.get_event_sweet_spots(uuid) to anon, authenticated;
