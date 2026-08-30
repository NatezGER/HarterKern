-- P11.7: canonical closed-event lead takeovers, pair rivalries and ledger awards.

insert into public.badge_definitions (
  badge_key, category, tier, name, description, threshold, sort_order,
  family_key, requirement, is_secret, badge_kind, design_variant, scope_type, is_active
) values
  ('rivalry-bronze', 'rivalry', 'bronze', 'Rivalität Bronze', 'Ein Rivalitäts-Event.', 1, 162, 'rivalry', '1 Rivalitäts-Event-Paarung', false, 'tiered', 'standard', 'all_time', true),
  ('rivalry-silver', 'rivalry', 'silver', 'Rivalität Silber', 'Drei Rivalitäts-Events.', 3, 163, 'rivalry', '3 Rivalitäts-Event-Paarungen', false, 'tiered', 'standard', 'all_time', true),
  ('rivalry-gold', 'rivalry', 'gold', 'Rivalität Gold', 'Fünf Rivalitäts-Events.', 5, 164, 'rivalry', '5 Rivalitäts-Event-Paarungen', false, 'tiered', 'standard', 'all_time', true),
  ('rivalry-diamond', 'rivalry', 'diamond', 'Rivalität Diamond', 'Zehn Rivalitäts-Events.', 10, 165, 'rivalry', '10 Rivalitäts-Event-Paarungen', false, 'tiered', 'standard', 'all_time', true)
on conflict (badge_key) do update set category = excluded.category, tier = excluded.tier,
  name = excluded.name, description = excluded.description, threshold = excluded.threshold,
  sort_order = excluded.sort_order, family_key = excluded.family_key,
  requirement = excluded.requirement, badge_kind = excluded.badge_kind,
  design_variant = excluded.design_variant, scope_type = excluded.scope_type,
  is_active = excluded.is_active;

create view public.event_direct_lead_takeovers with (security_invoker = true) as
with eligible as (
  select a.id attempt_id, a.event_id, a.player_id, a.submitted_at, a.time_hundredths
  from public.attempts a
  join public.players p on p.id = a.player_id
  join public.events e on e.id = a.event_id
  where e.status = 'closed' and e.deleted_at is null
    and a.status = 'approved' and a.deleted_at is null
    and not a.is_dnf and not a.is_ak and a.time_hundredths is not null
    and not p.is_ak and not p.is_archived
), contextual as (
  select eligible.*,
    min(time_hundredths) over (partition by event_id order by submitted_at, attempt_id rows between unbounded preceding and 1 preceding) prior_best
  from eligible
), changes as (
  select contextual.*,
    (select case when count(distinct prior.player_id) = 1 then min(prior.player_id) end
      from eligible prior
      where prior.event_id = contextual.event_id
        and (prior.submitted_at, prior.attempt_id) < (contextual.submitted_at, contextual.attempt_id)
        and prior.time_hundredths = contextual.prior_best) previous_player_id,
    row_number() over (partition by contextual.event_id order by contextual.submitted_at, contextual.attempt_id)::integer lead_sequence
  from contextual
  where contextual.prior_best is not null and contextual.time_hundredths < contextual.prior_best
)
select event_id, least(previous_player_id, player_id) player_low_id,
  greatest(previous_player_id, player_id) player_high_id,
  previous_player_id, player_id takeover_player_id, attempt_id source_attempt_id,
  submitted_at takeover_at, lead_sequence
from changes
where previous_player_id is not null and previous_player_id <> player_id;

create view public.rivalry_pair_events with (security_invoker = true) as
with common_pairs as (
  select left_side.event_id, least(left_side.player_id, right_side.player_id) player_low_id,
    greatest(left_side.player_id, right_side.player_id) player_high_id,
    events.start_date event_date, coalesce(events.closed_at, events.ends_at) closed_at
  from public.event_final_standings left_side
  join public.event_final_standings right_side on right_side.event_id = left_side.event_id
    and right_side.player_id > left_side.player_id
  join public.events events on events.id = left_side.event_id
  where left_side.player_id is not null and right_side.player_id is not null
    and left_side.best_time_hundredths is not null and right_side.best_time_hundredths is not null
    and not left_side.is_ak and not right_side.is_ak
    and events.status = 'closed' and events.deleted_at is null
), switches as (
  select event_id, player_low_id, player_high_id, count(*)::integer direct_takeovers,
    min(takeover_at) first_takeover_at, max(takeover_at) last_takeover_at
  from public.event_direct_lead_takeovers
  group by event_id, player_low_id, player_high_id
)
select pairs.event_id, pairs.player_low_id, pairs.player_high_id, pairs.event_date,
  pairs.closed_at, coalesce(switches.direct_takeovers, 0)::integer direct_takeovers,
  coalesce(switches.direct_takeovers, 0) >= 3 is_rivalry_event,
  switches.first_takeover_at, switches.last_takeover_at
from common_pairs pairs left join switches using (event_id, player_low_id, player_high_id);

create or replace function public.get_pair_rivalry(p_player_a_id uuid, p_player_b_id uuid, p_season_year integer default null)
returns table (event_id uuid, direct_takeovers integer, is_rivalry_event boolean,
  common_events integer, rivalry_events integer, total_direct_takeovers integer,
  first_rivalry_date date, last_rivalry_date date)
language sql stable security invoker set search_path = public as $$
  with requested as materialized (
    select * from public.rivalry_pair_events
    where player_low_id = least(p_player_a_id, p_player_b_id)
      and player_high_id = greatest(p_player_a_id, p_player_b_id)
      and (p_season_year is null or extract(year from event_date)::integer = p_season_year)
  ), summary as (
    select count(*)::integer common_events,
      count(*) filter (where is_rivalry_event)::integer rivalry_events,
      coalesce(sum(direct_takeovers), 0)::integer total_direct_takeovers,
      min(event_date) filter (where is_rivalry_event) first_rivalry_date,
      max(event_date) filter (where is_rivalry_event) last_rivalry_date
    from requested
  )
  select requested.event_id, requested.direct_takeovers, requested.is_rivalry_event,
    summary.* from requested cross join summary
  union all select null, 0, false, summary.* from summary
    where not exists (select 1 from requested);
$$;

create or replace function public.get_player_rivalries(p_player_id uuid)
returns table (rival_player_id uuid, display_name text, avatar_url text, avatar_path text,
  rivalry_events integer, direct_takeovers integer, first_rivalry_date date, last_rivalry_date date)
language sql stable security invoker set search_path = public as $$
  with oriented as (
    select case when player_low_id = p_player_id then player_high_id else player_low_id end rival_player_id,
      event_date, direct_takeovers
    from public.rivalry_pair_events
    where is_rivalry_event and p_player_id in (player_low_id, player_high_id)
  )
  select oriented.rival_player_id, players.display_name, players.avatar_url, players.avatar_path,
    count(*)::integer rivalry_events, sum(oriented.direct_takeovers)::integer direct_takeovers,
    min(oriented.event_date), max(oriented.event_date)
  from oriented join public.players players on players.id = oriented.rival_player_id
  group by oriented.rival_player_id, players.display_name, players.avatar_url, players.avatar_path
  order by rivalry_events desc, direct_takeovers desc, max(oriented.event_date) desc,
    oriented.rival_player_id;
$$;

create or replace function public.get_rivalry_badge_progress()
returns table (player_id uuid, display_name text, family_key text,
  current_progress integer, time_hundredths integer)
language sql stable security invoker set search_path = public as $$
  select players.id, players.display_name, 'rivalry'::text,
    count(events.event_id)::integer, null::integer
  from public.players players
  join public.rivalry_pair_events events
    on events.is_rivalry_event and players.id in (events.player_low_id, events.player_high_id)
  where not players.is_ak and not players.is_archived
  group by players.id, players.display_name;
$$;

create view public.rivalry_badge_awards with (security_invoker = true) as
with proofs as (
  select player_id, rival_player_id, event_id, event_date, closed_at,
    row_number() over (partition by player_id order by closed_at, event_id, rival_player_id)::integer rivalry_sequence,
    count(*) over (partition by player_id)::integer rivalry_total
  from (
    select player_low_id player_id, player_high_id rival_player_id, event_id, event_date, closed_at
      from public.rivalry_pair_events where is_rivalry_event
    union all
    select player_high_id, player_low_id, event_id, event_date, closed_at
      from public.rivalry_pair_events where is_rivalry_event
  ) oriented
)
select concat(proofs.player_id, ':', definitions.badge_key) award_key,
  proofs.player_id, definitions.badge_key, 'rivalry_event'::text source_type,
  null::uuid source_attempt_id, null::uuid source_historical_attempt_id,
  proofs.event_id source_event_id, proofs.closed_at awarded_at,
  jsonb_build_object('progress', proofs.rivalry_total, 'rivalPlayerId', proofs.rival_player_id,
    'proofSequence', proofs.rivalry_sequence) metadata
from proofs join public.badge_definitions definitions
  on definitions.family_key = 'rivalry' and definitions.is_active
  and proofs.rivalry_sequence >= definitions.threshold;

create or replace view public.player_badge_award_sync_source with (security_invoker = true) as
select * from public.player_badge_awards
union all select * from public.pre_p11_badge_awards
union all select * from public.event_lead_time_badge_awards
union all select * from public.bingo_line_diamond_badge_awards
union all select * from public.p115_badge_expansion_awards
union all select * from public.rivalry_badge_awards;

revoke all on public.player_badge_award_sync_source, public.rivalry_badge_awards from public, anon, authenticated;
grant select on public.event_direct_lead_takeovers, public.rivalry_pair_events to anon, authenticated;
revoke all on function public.get_pair_rivalry(uuid, uuid, integer), public.get_player_rivalries(uuid), public.get_rivalry_badge_progress() from public;
grant execute on function public.get_pair_rivalry(uuid, uuid, integer), public.get_player_rivalries(uuid), public.get_rivalry_badge_progress() to anon, authenticated;

-- A changed proof affects every regular player in the event, not only its author.
create or replace function public.refresh_badge_ledger_after_attempt_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested_player_id uuid;
begin
  for requested_player_id in
    select distinct attempts.player_id from public.attempts attempts
    where attempts.player_id is not null and (
      attempts.id in (select inserted.id from new_attempts inserted)
      or attempts.event_id in (select inserted.event_id from new_attempts inserted where inserted.event_id is not null)
    )
  loop perform public.sync_player_badge_award_ledger(requested_player_id); end loop;
  return null;
end;
$$;

create or replace function public.refresh_badge_ledger_after_attempt_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested_player_id uuid;
begin
  for requested_player_id in
    select distinct attempts.player_id from public.attempts attempts
    where attempts.player_id is not null and attempts.event_id in (
      select old.event_id from old_attempts old where old.event_id is not null
      union select new.event_id from new_attempts new where new.event_id is not null
    )
    union
    select old.player_id from old_attempts old where old.player_id is not null
    union
    select new.player_id from new_attempts new where new.player_id is not null
  loop perform public.sync_player_badge_award_ledger(requested_player_id); end loop;
  return null;
end;
$$;

create or replace function public.refresh_badge_ledger_after_participant_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare requested_player_id uuid; requested_event_id uuid;
begin
  requested_event_id := case when tg_op = 'DELETE' then old.event_id else new.event_id end;
  for requested_player_id in
    select participants.player_id from public.event_participants participants
      where participants.event_id = requested_event_id
    union select attempts.player_id from public.attempts attempts
      where attempts.event_id = requested_event_id and attempts.player_id is not null
    union select old.player_id where tg_op in ('DELETE', 'UPDATE') and old.player_id is not null
  loop perform public.sync_player_badge_award_ledger(requested_player_id); end loop;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

select public.sync_all_player_badge_award_ledgers();
