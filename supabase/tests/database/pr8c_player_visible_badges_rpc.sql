begin;
create extension if not exists pgtap;
select plan(9);

select has_function(
  'public',
  'get_visible_player_badges',
  array['uuid'],
  'player-scoped visible badge RPC exists'
);

select has_function(
  'public',
  'get_player_profile_prestige',
  array['uuid'],
  'player-scoped prestige RPC exists'
);

insert into public.players (id, display_name, is_ak)
values
  ('99000000-0000-0000-0000-000000000001', 'Scoped Badges', false),
  ('99000000-0000-0000-0000-000000000002', 'Other Badges', false);

insert into public.historical_attempts (
  id, player_id, display_name, attempt_date, time_hundredths,
  sort_order, source
) values
  ('99000000-0000-0000-0000-000000000011',
    '99000000-0000-0000-0000-000000000001', 'Scoped Badges',
    date '2026-01-01', 450, 1, 'admin'),
  ('99000000-0000-0000-0000-000000000012',
    '99000000-0000-0000-0000-000000000002', 'Other Badges',
    date '2026-01-02', 350, 1, 'admin');

select ok(
  exists (
    select 1 from public.get_visible_player_badges(
      '99000000-0000-0000-0000-000000000001'
    )
  ),
  'RPC returns badges for the requested player'
);

select ok(
  not exists (
    select 1 from public.get_visible_player_badges(
      '99000000-0000-0000-0000-000000000001'
    ) where player_id <> '99000000-0000-0000-0000-000000000001'
  ),
  'RPC never returns another player'
);

select is(
  (select count(*) from public.get_visible_player_badges(
    '99000000-0000-0000-0000-000000000001'
  )),
  (select count(*) from public.visible_player_badges
    where player_id = '99000000-0000-0000-0000-000000000001'),
  'RPC preserves the visible badge count'
);

select is(
  (select jsonb_agg(to_jsonb(scoped) order by tier_rank desc,
      is_special_event_badge desc, recipient_count, sort_order, award_key)
    from public.get_visible_player_badges(
      '99000000-0000-0000-0000-000000000001'
    ) scoped),
  (select jsonb_agg(to_jsonb(existing) order by tier_rank desc,
      is_special_event_badge desc, recipient_count, sort_order, award_key)
    from public.visible_player_badges existing
    where player_id = '99000000-0000-0000-0000-000000000001'),
  'RPC preserves the complete CompactBadge read model'
);

select ok(
  not exists (
    select coalesce(family_key, award_key)
    from public.get_visible_player_badges(
      '99000000-0000-0000-0000-000000000001'
    )
    group by coalesce(family_key, award_key)
    having count(*) > 1
  ),
  'RPC exposes only the highest visible tier per family'
);

select is(
  (select count(*) from public.get_visible_player_badges(
    '99000000-0000-0000-0000-000000000099'
  )),
  0::bigint,
  'unknown players return no badges'
);

select is(
  (select visible_badge_count
    from public.player_prestige_statistics
    where player_id = '99000000-0000-0000-0000-000000000001'),
  (select count(*)::integer from public.get_visible_player_badges(
    '99000000-0000-0000-0000-000000000001'
  )),
  'the existing prestige badge count equals the reusable gallery count'
);

select * from finish();
rollback;
