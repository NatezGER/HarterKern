begin;
select plan(11);

select has_function('public', 'get_player_visible_badges', array['uuid'],
  'slim player badge RPC exists');
select has_function('public', 'get_player_qualified_times', array['uuid', 'integer'],
  'player qualified-time RPC exists');
select has_function('public', 'get_player_attempt_number_statistics', array['uuid'],
  'player attempt-number RPC exists');
select has_function('public', 'get_player_event_history', array['uuid'],
  'player event-history RPC exists');

select ok(position('where hits.player_id = p_player_id' in pg_get_functiondef(
  'public.get_player_bingo(uuid)'::regprocedure)) > 0,
  'BINGO profile RPC starts at the selected player');

select is((select count(*) from (
  (select p.id, scoped.badge_key, scoped.award_key
    from public.players p
    cross join lateral public.get_player_visible_badges(p.id) scoped
   except
   select p.id, current.badge_key, current.award_key
    from public.players p
    cross join lateral public.get_visible_player_badges(p.id) current)
  union all
  (select p.id, current.badge_key, current.award_key
    from public.players p
    cross join lateral public.get_visible_player_badges(p.id) current
   except
   select p.id, scoped.badge_key, scoped.award_key
    from public.players p
    cross join lateral public.get_player_visible_badges(p.id) scoped)
) differences), 0::bigint, 'slim badge RPC retains visible badge identity parity');

select is((select count(*) from (
  select q.time_hundredths from public.qualified_official_times q
    where q.player_id = (select id from public.players limit 1)
  except all
  select q.time_hundredths from public.get_player_qualified_times(
    (select id from public.players limit 1), null) q
) differences), 0::bigint, 'qualified-time RPC retains all-time values');

select is((select count(*) from (
  (select p.id, scoped.attempt_number, scoped.attempt_count,
      scoped.valid_attempts, scoped.dnf_count, scoped.average_hundredths
    from public.players p cross join lateral
      public.get_player_attempt_number_statistics(p.id) scoped
   except
   select current.player_id, current.attempt_number, current.attempt_count,
      current.valid_attempts, current.dnf_count, current.average_hundredths
    from public.player_attempt_number_statistics current)
  union all
  (select current.player_id, current.attempt_number, current.attempt_count,
      current.valid_attempts, current.dnf_count, current.average_hundredths
    from public.player_attempt_number_statistics current
   except
   select p.id, scoped.attempt_number, scoped.attempt_count,
      scoped.valid_attempts, scoped.dnf_count, scoped.average_hundredths
    from public.players p cross join lateral
      public.get_player_attempt_number_statistics(p.id) scoped)
) differences), 0::bigint, 'attempt-number RPC retains canonical parity');

select is((select count(*) from (
  (select p.id, scoped.event_id, scoped.best_time_hundredths, scoped.rank,
      scoped.attempt_count, scoped.valid_attempts, scoped.dnf_count
    from public.players p cross join lateral public.get_player_event_history(p.id) scoped
   except
   select current.player_id, current.event_id, current.best_time_hundredths,
      current.rank, current.attempt_count, current.valid_attempts, current.dnf_count
    from public.player_event_history current)
  union all
  (select current.player_id, current.event_id, current.best_time_hundredths,
      current.rank, current.attempt_count, current.valid_attempts, current.dnf_count
    from public.player_event_history current
   except
   select p.id, scoped.event_id, scoped.best_time_hundredths, scoped.rank,
      scoped.attempt_count, scoped.valid_attempts, scoped.dnf_count
    from public.players p cross join lateral public.get_player_event_history(p.id) scoped)
) differences), 0::bigint, 'event-history RPC retains canonical parity');

select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions where family_key = 'favorite-time' and is_active),
  array[2,3,5,10], 'Favorite Time thresholds remain unchanged');
select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions where family_key = 'bingo' and is_active),
  array[1,2,3,5], 'BINGO line thresholds remain unchanged');

select * from finish();
rollback;
