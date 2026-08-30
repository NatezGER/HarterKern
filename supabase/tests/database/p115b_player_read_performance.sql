begin;
select plan(15);

select has_function('public', 'get_player_bingo', array['uuid'],
  'player-scoped BINGO RPC exists');
select has_function('public', 'get_badge_rarity', array[]::text[],
  'combined badge rarity RPC exists');

select ok(position('where source.player_id = p_player_id' in pg_get_functiondef(
  'public.get_visible_player_badges(uuid)'::regprocedure)) > 0,
  'visible badge RPC filters every requested source by player');
select ok(position('visible_player_badges' in pg_get_functiondef(
  'public.get_visible_player_badges(uuid)'::regprocedure)) = 0,
  'visible badge RPC no longer expands the league-wide visible view');
select ok(position('where ep.player_id = p_player_id' in pg_get_functiondef(
  'public.get_player_trophies(uuid)'::regprocedure)) > 0,
  'trophy RPC filters event podium before its union');
select ok(position('where h.player_id = p_player_id' in pg_get_functiondef(
  'public.get_player_bingo(uuid)'::regprocedure)) > 0,
  'BINGO RPC filters hits before fields and lines');

select is((select count(*) from (
  (select p.id, scoped.badge_key, scoped.award_key
    from public.players p
    cross join lateral public.get_visible_player_badges(p.id) scoped
   except
   select p.id, current.badge_key, current.award_key
    from public.players p
    join public.visible_player_badges current on current.player_id = p.id)
  union all
  (select p.id, current.badge_key, current.award_key
    from public.players p
    join public.visible_player_badges current on current.player_id = p.id
   except
   select p.id, scoped.badge_key, scoped.award_key
    from public.players p
    cross join lateral public.get_visible_player_badges(p.id) scoped)
) differences), 0::bigint, 'player badge RPC keeps visible badge identity parity');

select is((select count(*) from (
  (select p.id, b.ending, b.hit_count, b.field_tier
  from public.players p cross join lateral public.get_player_bingo(p.id) b
  except
  select f.player_id, f.ending, f.hit_count, f.field_tier
  from public.player_bingo_fields f)
  union all
  (select f.player_id, f.ending, f.hit_count, f.field_tier
  from public.player_bingo_fields f
  except
  select p.id, b.ending, b.hit_count, b.field_tier
  from public.players p cross join lateral public.get_player_bingo(p.id) b)
) differences), 0::bigint, 'player BINGO fields retain canonical parity');

select is((select count(*) from public.players p where
  (select sum(jsonb_array_length(b.hits))
    from public.get_player_bingo(p.id) b) is distinct from
  (select count(*) from public.player_bingo_hits h where h.player_id = p.id)
), 0::bigint, 'player BINGO RPC retains every canonical hit');

select is((select count(*) from (
  select p.id, b.collected_endings, b.bronze_lines, b.silver_lines,
    b.gold_lines, b.diamond_lines, b.highest_badge_tier
  from public.players p cross join lateral (
    select * from public.get_player_bingo(p.id) limit 1
  ) b
  except
  select s.player_id, s.collected_endings, s.bronze_lines, s.silver_lines,
    s.gold_lines, s.diamond_lines, s.highest_badge_tier
  from public.player_bingo_statistics s
) differences), 0::bigint, 'player BINGO summary retains canonical parity');

select is((select count(*) from (
  select r.badge_key, r.recipient_count, r.regular_player_count, r.rarity_percent
  from public.get_badge_rarity() r
  except
  select r.badge_key, r.recipient_count, r.regular_player_count, r.rarity_percent
  from public.badge_rarity_statistics r
) differences), 0::bigint, 'combined rarity RPC retains grouped rarity parity');

select is((select count(*) from (
  (select p.id, scoped.trophy_key
    from public.players p
    cross join lateral public.get_player_trophies(p.id) scoped
   except
   select p.id, expected.trophy_key
    from public.players p
    join (
      select trophy_key, player_id from public.player_trophies
      union all select trophy_key, player_id from public.season_trophies
    ) expected on expected.player_id = p.id)
  union all
  (select p.id, expected.trophy_key
    from public.players p
    join (
      select trophy_key, player_id from public.player_trophies
      union all select trophy_key, player_id from public.season_trophies
    ) expected on expected.player_id = p.id
   except
   select p.id, scoped.trophy_key
    from public.players p
    cross join lateral public.get_player_trophies(p.id) scoped)
) differences), 0::bigint, 'player trophy RPC keeps event, historical and season parity');

select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions
  where family_key = 'favorite-time' and is_active), array[2,3,5,10],
  'Favorite Time thresholds remain unchanged');
select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions
  where family_key = 'bingo-completion' and is_active), array[1,2,3,5],
  'BINGO completion thresholds remain unchanged');
select is((select array_agg(threshold order by sort_order)
  from public.badge_definitions
  where family_key = 'bingo' and is_active), array[1,2,3,5],
  'BINGO line thresholds remain unchanged');

select * from finish();
rollback;
