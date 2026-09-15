-- Pre-DK live badge engine. The RPC evaluates only the saved attempt, its
-- regular player and narrowly bounded player/event sources. It never invokes
-- the global badge award union or a ledger synchronization.

create index if not exists attempts_live_badge_player_sequence_idx
  on public.attempts (player_id, submitted_at, id)
  include (event_id, time_hundredths, is_dnf)
  where status = 'approved' and deleted_at is null and not is_ak;

create index if not exists attempts_live_badge_event_sequence_idx
  on public.attempts (event_id, submitted_at, id)
  include (player_id, time_hundredths)
  where status = 'approved' and deleted_at is null
    and not is_ak and not is_dnf and time_hundredths is not null;

create table public.matrix_glitch_event_evidence (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  source_attempt_id uuid not null references public.attempts(id) on delete cascade,
  previous_attempt_id uuid not null references public.attempts(id) on delete cascade,
  time_hundredths integer not null check (time_hundredths between 1 and 30000),
  mode text not null check (mode in ('global', 'personal_and_global')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matrix_glitch_event_evidence_source_unique unique (source_attempt_id),
  constraint matrix_glitch_event_evidence_distinct_attempts
    check (source_attempt_id <> previous_attempt_id)
);

create index matrix_glitch_event_evidence_event_idx
  on public.matrix_glitch_event_evidence (event_id, source_attempt_id);
create index matrix_glitch_event_evidence_player_idx
  on public.matrix_glitch_event_evidence (player_id, source_attempt_id);

alter table public.matrix_glitch_event_evidence enable row level security;
revoke all on public.matrix_glitch_event_evidence
  from public, anon, authenticated;

-- Preserve the exact personal ordering used by player_badge_awards. Current
-- DNF rows remain in the sequence and therefore break personal adjacency.
create or replace function public.matrix_glitch_personal_match(
  p_attempt_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with current_attempts as materialized (
    select a.id source_id, a.player_id, a.event_id, a.time_hundredths,
      a.is_dnf, a.submitted_at occurred_at,
      row_number() over (
        partition by a.player_id order by a.submitted_at, a.id
      )::integer source_order,
      2::integer source_priority, 'attempt'::text source_type
    from public.attempts a
    left join public.events e on e.id = a.event_id
    join public.players p on p.id = a.player_id
    where a.player_id = (
        select requested.player_id from public.attempts requested
        where requested.id = p_attempt_id
      )
      and a.status = 'approved' and a.deleted_at is null
      and not a.is_ak and not p.is_ak and not p.is_archived
      and (a.event_id is null or e.deleted_at is null)
  ), sequence_sources as (
    select * from current_attempts
    union all
    select h.id, h.player_id, null::uuid, h.time_hundredths, false,
      h.attempt_date::timestamp at time zone 'Europe/Berlin', h.sort_order,
      1::integer, 'historical_attempt'::text
    from public.historical_attempts h
    join public.players p on p.id = h.player_id
    where h.player_id = (
        select requested.player_id from public.attempts requested
        where requested.id = p_attempt_id
      )
      and h.deleted_at is null and not h.is_guest
      and not h.out_of_competition and not p.is_ak and not p.is_archived
  ), sequenced as (
    select sources.*,
      lag(time_hundredths) over (
        partition by player_id
        order by occurred_at, source_priority, source_order, source_id
      ) previous_time_hundredths,
      lag(is_dnf) over (
        partition by player_id
        order by occurred_at, source_priority, source_order, source_id
      ) previous_is_dnf
    from sequence_sources sources
  )
  select coalesce((
    select not sequenced.is_dnf
      and sequenced.time_hundredths is not null
      and not coalesce(sequenced.previous_is_dnf, false)
      and sequenced.previous_time_hundredths = sequenced.time_hundredths
    from sequenced
    where sequenced.source_type = 'attempt'
      and sequenced.source_id = p_attempt_id
  ), false);
$$;

revoke all on function public.matrix_glitch_personal_match(uuid)
  from public, anon, authenticated;

-- Rebuild only one event's filtered regular-player adjacency. This is used
-- after corrections and immediately before event-close ledger synchronization.
create or replace function public.refresh_matrix_glitch_event_evidence(
  p_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.matrix_glitch_event_evidence evidence
  where evidence.event_id = p_event_id;

  insert into public.matrix_glitch_event_evidence (
    player_id, event_id, source_attempt_id, previous_attempt_id,
    time_hundredths, mode
  )
  with eligible as materialized (
    select a.id, a.player_id, a.event_id, a.time_hundredths,
      a.submitted_at,
      lag(a.id) over (order by a.submitted_at, a.id) previous_attempt_id,
      lag(a.time_hundredths) over (
        order by a.submitted_at, a.id
      ) previous_time_hundredths
    from public.attempts a
    join public.players p on p.id = a.player_id
    join public.events e on e.id = a.event_id
    where a.event_id = p_event_id and a.status = 'approved'
      and a.deleted_at is null and not a.is_ak and not a.is_dnf
      and a.time_hundredths is not null
      and not p.is_ak and not p.is_archived and e.deleted_at is null
  )
  select eligible.player_id, eligible.event_id, eligible.id,
    eligible.previous_attempt_id, eligible.time_hundredths,
    case when public.matrix_glitch_personal_match(eligible.id)
      then 'personal_and_global' else 'global' end
  from eligible
  where eligible.previous_attempt_id is not null
    and eligible.previous_time_hundredths = eligible.time_hundredths;
end;
$$;

revoke all on function public.refresh_matrix_glitch_event_evidence(uuid)
  from public, anon, authenticated;

create or replace view public.matrix_glitch_event_badge_awards
with (security_invoker = true)
as
select concat(evidence.player_id, ':matrix-glitch') award_key,
  evidence.player_id, definitions.badge_key, 'attempt'::text source_type,
  evidence.source_attempt_id, null::uuid source_historical_attempt_id,
  evidence.event_id source_event_id, attempts.submitted_at awarded_at,
  jsonb_build_object(
    'timeHundredths', evidence.time_hundredths,
    'mode', evidence.mode,
    'previousAttemptId', evidence.previous_attempt_id
  ) metadata
from public.matrix_glitch_event_evidence evidence
join public.attempts attempts on attempts.id = evidence.source_attempt_id
join public.badge_definitions definitions
  on definitions.badge_key = 'matrix-glitch' and definitions.is_active;

revoke all on public.matrix_glitch_event_badge_awards
  from public, anon, authenticated;

-- Keep the persisted ledger's canonical union authoritative. The additive
-- evidence branch makes global glitches reproducible after the event closes.
create or replace view public.player_badge_award_sync_source
with (security_invoker = true)
as
select * from public.player_badge_awards
union all select * from public.pre_p11_badge_awards
union all select * from public.event_lead_time_badge_awards
union all select * from public.bingo_line_diamond_badge_awards
union all select * from public.p115_badge_expansion_awards
union all select * from public.rivalry_badge_awards
union all select * from public.matrix_glitch_event_badge_awards;

revoke all on public.player_badge_award_sync_source
  from public, anon, authenticated;

create or replace function public.get_live_attempt_badge_unlocks(
  p_attempt_id uuid
)
returns table (
  award_key text,
  badge_key text,
  name text,
  tier public.badge_tier,
  description text,
  category text,
  metadata jsonb,
  awarded_at timestamptz
)
language plpgsql
security definer
set search_path = public
set statement_timeout = '2500ms'
as $$
declare
  requested record;
  valid_time boolean := false;
  valid_attempts integer := 0;
  event_valid_attempts integer := 0;
  sub3_streak integer := 0;
  flawless_streak integer := 0;
  rapid_fire_attempts integer := 0;
  dnf_attempts integer := 0;
  favorite_occurrences integer := 0;
  special_occurrences integer := 0;
  previous_best integer;
  previous_world_record integer;
  reverse_times integer[] := '{}'::integer[];
  bingo_thresholds integer[] := '{}'::integer[];
  personal_glitch boolean := false;
  global_glitch boolean := false;
  global_previous_attempt_id uuid;
  glitch_mode text;
begin
  select a.id, a.player_id, a.event_id, a.time_hundredths, a.is_dnf,
    a.submitted_at, a.status, a.deleted_at, a.is_ak,
    p.is_ak player_is_ak, p.is_archived player_is_archived,
    e.status event_status, e.deleted_at event_deleted_at
  into requested
  from public.attempts a
  join public.players p on p.id = a.player_id
  left join public.events e on e.id = a.event_id
  where a.id = p_attempt_id;

  if not found or requested.player_id is null
    or requested.status <> 'approved' or requested.deleted_at is not null
    or requested.is_ak or requested.player_is_ak
    or requested.player_is_archived
    or (requested.event_id is not null and requested.event_deleted_at is not null)
  then
    return;
  end if;

  valid_time := not requested.is_dnf
    and requested.time_hundredths is not null;

  if valid_time then
    select count(*)::integer
    into valid_attempts
    from (
      select a.id
      from public.attempts a
      left join public.events e on e.id = a.event_id
      where a.player_id = requested.player_id
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_ak and not a.is_dnf and a.time_hundredths is not null
        and (a.event_id is null or e.deleted_at is null)
        and (a.submitted_at, a.id) <= (requested.submitted_at, requested.id)
      union all
      select h.id
      from public.historical_attempts h
      where h.player_id = requested.player_id and h.deleted_at is null
        and not h.is_guest and not h.out_of_competition
        and h.attempt_date::timestamp at time zone 'Europe/Berlin'
          <= requested.submitted_at
    ) qualified;

    select min(qualified.time_hundredths)
    into previous_best
    from (
      select a.time_hundredths
      from public.attempts a
      left join public.events e on e.id = a.event_id
      where a.player_id = requested.player_id and a.id <> requested.id
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_ak and not a.is_dnf and a.time_hundredths is not null
        and (a.event_id is null or e.deleted_at is null)
        and (a.submitted_at, a.id) < (requested.submitted_at, requested.id)
      union all
      select h.time_hundredths
      from public.historical_attempts h
      where h.player_id = requested.player_id and h.deleted_at is null
        and not h.is_guest and not h.out_of_competition
        and h.attempt_date::timestamp at time zone 'Europe/Berlin'
          <= requested.submitted_at
    ) qualified;

    if requested.event_id is not null then
      select count(*)::integer
      into event_valid_attempts
      from public.attempts a
      where a.player_id = requested.player_id
        and a.event_id = requested.event_id
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_ak and not a.is_dnf and a.time_hundredths is not null
        and (a.submitted_at, a.id) <= (requested.submitted_at, requested.id);

      with reverse_order as (
        select a.is_dnf, a.time_hundredths,
          sum(case when a.is_dnf or a.time_hundredths is null
            or a.time_hundredths >= 300 then 1 else 0 end) over (
              order by a.submitted_at desc, a.id desc
            ) breakers
        from public.attempts a
        where a.player_id = requested.player_id
          and a.event_id = requested.event_id
          and a.status = 'approved' and a.deleted_at is null
          and not a.is_ak
          and (a.submitted_at, a.id) <= (requested.submitted_at, requested.id)
      )
      select count(*)::integer into sub3_streak
      from reverse_order
      where breakers = 0 and not is_dnf
        and time_hundredths is not null and time_hundredths < 300;

      select array_agg(recent.time_hundredths order by recent.position)
      into reverse_times
      from (
        select a.time_hundredths,
          row_number() over (order by a.submitted_at desc, a.id desc) position
        from public.attempts a
        where a.player_id = requested.player_id
          and a.event_id = requested.event_id
          and a.status = 'approved' and a.deleted_at is null
          and not a.is_ak
          and (a.submitted_at, a.id) <= (requested.submitted_at, requested.id)
        order by a.submitted_at desc, a.id desc
        limit 5
      ) recent
      where recent.time_hundredths is not null;
    end if;

    with reverse_order as (
      select a.is_dnf,
        sum(case when a.is_dnf then 1 else 0 end) over (
          order by a.submitted_at desc, a.id desc
        ) breakers
      from public.attempts a
      join public.events e on e.id = a.event_id and e.deleted_at is null
      where a.player_id = requested.player_id
        and a.event_id is not null
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_ak
        and (a.submitted_at, a.id) <= (requested.submitted_at, requested.id)
    )
    select count(*)::integer into flawless_streak
    from reverse_order where breakers = 0 and not is_dnf;

    select count(*)::integer
    into rapid_fire_attempts
    from public.attempts a
    left join public.events e on e.id = a.event_id
    where a.player_id = requested.player_id
      and a.status = 'approved' and a.deleted_at is null
      and not a.is_ak and not a.is_dnf and a.time_hundredths is not null
      and (a.event_id is null or e.deleted_at is null)
      and a.submitted_at >= requested.submitted_at - interval '60 minutes'
      and (a.submitted_at, a.id) <= (requested.submitted_at, requested.id);

    select count(*)::integer
    into favorite_occurrences
    from (
      select a.id
      from public.attempts a
      left join public.events e on e.id = a.event_id
      where a.player_id = requested.player_id
        and a.time_hundredths = requested.time_hundredths
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_ak and not a.is_dnf
        and (a.event_id is null or e.deleted_at is null)
        and (a.submitted_at, a.id) <= (requested.submitted_at, requested.id)
      union all
      select h.id
      from public.historical_attempts h
      where h.player_id = requested.player_id
        and h.time_hundredths = requested.time_hundredths
        and h.deleted_at is null and not h.is_guest
        and not h.out_of_competition
        and h.attempt_date::timestamp at time zone 'Europe/Berlin'
          <= requested.submitted_at
    ) matches;

    select count(*)::integer
    into special_occurrences
    from (
      select a.id
      from public.attempts a
      left join public.events e on e.id = a.event_id
      where a.player_id = requested.player_id
        and mod(a.time_hundredths, 100) = mod(requested.time_hundredths, 100)
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_ak and not a.is_dnf
        and (a.event_id is null or e.deleted_at is null)
        and (a.submitted_at, a.id) <= (requested.submitted_at, requested.id)
      union all
      select h.id
      from public.historical_attempts h
      where h.player_id = requested.player_id
        and mod(h.time_hundredths, 100) = mod(requested.time_hundredths, 100)
        and h.deleted_at is null and not h.is_guest
        and not h.out_of_competition
        and h.attempt_date::timestamp at time zone 'Europe/Berlin'
          <= requested.submitted_at
    ) matches;

    with qualified_hits as (
      select mod(a.time_hundredths, 100)::integer ending
      from public.attempts a
      left join public.events e on e.id = a.event_id
      where a.player_id = requested.player_id
        and a.status = 'approved' and a.deleted_at is null
        and not a.is_ak and not a.is_dnf and a.time_hundredths is not null
        and (a.event_id is null or e.deleted_at is null)
        and (a.submitted_at, a.id) <= (requested.submitted_at, requested.id)
      union all
      select mod(h.time_hundredths, 100)::integer
      from public.historical_attempts h
      where h.player_id = requested.player_id and h.deleted_at is null
        and not h.is_guest and not h.out_of_competition
        and h.attempt_date::timestamp at time zone 'Europe/Berlin'
          <= requested.submitted_at
    ), hit_counts as materialized (
      select hits.ending, count(*)::integer hit_count
      from qualified_hits hits group by hits.ending
    ), affected_lines as (
      select distinct cells.line_key
      from public.bingo_line_cells cells
      where cells.ending = mod(requested.time_hundredths, 100)
    )
    select coalesce(array_agg(distinct definitions.threshold), '{}'::integer[])
    into bingo_thresholds
    from public.badge_definitions definitions
    where definitions.family_key = 'bingo' and definitions.is_active
      and definitions.threshold = (
        select counts.hit_count from hit_counts counts
        where counts.ending = mod(requested.time_hundredths, 100)
      )
      and exists (
        select 1 from affected_lines lines
        where not exists (
          select 1
          from public.bingo_line_cells cells
          left join hit_counts counts on counts.ending = cells.ending
          where cells.line_key = lines.line_key
            and coalesce(counts.hit_count, 0) < definitions.threshold
        )
      );

    select min(qualified.time_hundredths)
    into previous_world_record
    from (
      select a.time_hundredths
      from public.attempts a
      left join public.events e on e.id = a.event_id
      join public.players p on p.id = a.player_id
      where a.id <> requested.id and a.status = 'approved'
        and a.deleted_at is null and not a.is_ak and not a.is_dnf
        and a.time_hundredths is not null
        and not p.is_ak and not p.is_archived
        and (a.event_id is null or e.deleted_at is null)
        and (a.submitted_at, a.id) < (requested.submitted_at, requested.id)
      union all
      select h.time_hundredths
      from public.historical_attempts h
      join public.players p on p.id = h.player_id
      where h.deleted_at is null and not h.is_guest
        and not h.out_of_competition and not p.is_ak and not p.is_archived
        and h.attempt_date::timestamp at time zone 'Europe/Berlin'
          <= requested.submitted_at
    ) qualified;

    personal_glitch := public.matrix_glitch_personal_match(requested.id);

    if requested.event_id is not null and requested.event_status = 'active' then
      select previous.id
      into global_previous_attempt_id
      from public.attempts previous
      join public.players previous_player on previous_player.id = previous.player_id
      where previous.event_id = requested.event_id
        and previous.id <> requested.id
        and previous.status = 'approved' and previous.deleted_at is null
        and not previous.is_ak and not previous.is_dnf
        and previous.time_hundredths is not null
        and not previous_player.is_ak and not previous_player.is_archived
        and (previous.submitted_at, previous.id)
          < (requested.submitted_at, requested.id)
      order by previous.submitted_at desc, previous.id desc
      limit 1;

      if global_previous_attempt_id is not null then
        select previous.time_hundredths = requested.time_hundredths
        into global_glitch
        from public.attempts previous
        where previous.id = global_previous_attempt_id;
      end if;
    end if;

    if global_glitch then
      glitch_mode := case when personal_glitch
        then 'personal_and_global' else 'global' end;
      insert into public.matrix_glitch_event_evidence (
        player_id, event_id, source_attempt_id, previous_attempt_id,
        time_hundredths, mode
      ) values (
        requested.player_id, requested.event_id, requested.id,
        global_previous_attempt_id, requested.time_hundredths, glitch_mode
      )
      on conflict (source_attempt_id) do update set
        player_id = excluded.player_id,
        event_id = excluded.event_id,
        previous_attempt_id = excluded.previous_attempt_id,
        time_hundredths = excluded.time_hundredths,
        mode = excluded.mode,
        updated_at = now();
    end if;
  else
    select count(*)::integer into dnf_attempts
    from public.attempts a
    left join public.events e on e.id = a.event_id
    where a.player_id = requested.player_id and a.is_dnf
      and a.status = 'approved' and a.deleted_at is null and not a.is_ak
      and (a.event_id is null or e.deleted_at is null)
      and (a.submitted_at, a.id) <= (requested.submitted_at, requested.id);
  end if;

  return query
  with candidates(candidate_badge_key, candidate_metadata) as (
    select definitions.badge_key,
      jsonb_build_object('timeHundredths', requested.time_hundredths,
        'progress', requested.time_hundredths)
    from public.badge_definitions definitions
    where valid_time and definitions.family_key = 'time-limits'
      and requested.time_hundredths < definitions.threshold
      and (previous_best is null or previous_best >= definitions.threshold)
    union all
    select definitions.badge_key, jsonb_build_object('progress', valid_attempts)
    from public.badge_definitions definitions
    where valid_time and definitions.family_key = 'valid-attempts'
      and definitions.threshold = valid_attempts
    union all
    select definitions.badge_key,
      jsonb_build_object('progress', event_valid_attempts, 'scope', 'event')
    from public.badge_definitions definitions
    where valid_time and requested.event_id is not null
      and definitions.family_key = 'event-attempts'
      and definitions.threshold = event_valid_attempts
    union all
    select definitions.badge_key,
      jsonb_build_object('progress', sub3_streak, 'scope', 'event')
    from public.badge_definitions definitions
    where valid_time and requested.time_hundredths < 300
      and definitions.family_key = 'sub3-streak'
      and definitions.threshold = sub3_streak
    union all
    select definitions.badge_key,
      jsonb_build_object('progress', flawless_streak)
    from public.badge_definitions definitions
    where valid_time and requested.event_id is not null
      and definitions.family_key = 'flawless'
      and definitions.threshold = flawless_streak
    union all
    select definitions.badge_key,
      jsonb_build_object('progress', rapid_fire_attempts, 'windowMinutes', 60)
    from public.badge_definitions definitions
    where valid_time and definitions.family_key = 'rapid-fire'
      and definitions.threshold = rapid_fire_attempts
    union all
    select 'time-stopper',
      jsonb_build_object('timeHundredths', requested.time_hundredths)
    where valid_time and mod(requested.time_hundredths, 100) = 0
      and special_occurrences = 1
    union all
    select 'almost',
      jsonb_build_object('timeHundredths', requested.time_hundredths)
    where valid_time and mod(requested.time_hundredths, 100) = 1
      and special_occurrences = 1
    union all
    select 'false-starter', jsonb_build_object('progress', dnf_attempts)
    where not valid_time and requested.is_dnf and dnf_attempts = 10
    union all
    select 'reverse-gear',
      jsonb_build_object('progress', 5,
        'timeHundredths', requested.time_hundredths)
    where valid_time and cardinality(reverse_times) = 5
      and reverse_times[1] > reverse_times[2]
      and reverse_times[2] > reverse_times[3]
      and reverse_times[3] > reverse_times[4]
      and reverse_times[4] > reverse_times[5]
    union all
    select 'first-official-attempt',
      jsonb_build_object('progress', 1,
        'timeHundredths', requested.time_hundredths)
    where valid_time and valid_attempts = 1
    union all
    select definitions.badge_key,
      jsonb_build_object('timeHundredths', requested.time_hundredths,
        'progress', favorite_occurrences)
    from public.badge_definitions definitions
    where valid_time and definitions.family_key = 'favorite-time'
      and definitions.threshold = favorite_occurrences
    union all
    select definitions.badge_key,
      jsonb_build_object('progress', 1,
        'minimumHitsPerCell', definitions.threshold,
        'timeHundredths', requested.time_hundredths)
    from public.badge_definitions definitions
    where valid_time and definitions.family_key = 'bingo'
      and definitions.threshold = any(bingo_thresholds)
    union all
    select 'official-world-record',
      jsonb_build_object('timeHundredths', requested.time_hundredths)
    where valid_time and (previous_world_record is null
      or requested.time_hundredths < previous_world_record)
    union all
    select 'matrix-glitch',
      jsonb_strip_nulls(jsonb_build_object(
        'timeHundredths', requested.time_hundredths,
        'mode', case when personal_glitch and global_glitch
          then 'personal_and_global'
          when global_glitch then 'global' else 'personal' end,
        'previousAttemptId', global_previous_attempt_id
      ))
    where valid_time and (personal_glitch or global_glitch)
  ), active_candidates as (
    select distinct on (definitions.badge_key)
      definitions.badge_key, definitions.name, definitions.tier,
      definitions.description, definitions.category,
      candidates.candidate_metadata, definitions.sort_order
    from candidates
    join public.badge_definitions definitions
      on definitions.badge_key = candidates.candidate_badge_key
      and definitions.is_active
    where not exists (
      select 1 from public.player_badge_award_ledger ledger
      where ledger.player_id = requested.player_id
        and ledger.badge_key = definitions.badge_key
    )
    order by definitions.badge_key, definitions.sort_order
  )
  select concat(requested.player_id, ':', active.badge_key),
    active.badge_key, active.name, active.tier, active.description,
    active.category, active.candidate_metadata, requested.submitted_at
  from active_candidates active
  order by active.sort_order, active.badge_key;
end;
$$;

revoke all on function public.get_live_attempt_badge_unlocks(uuid)
  from public;
grant execute on function public.get_live_attempt_badge_unlocks(uuid)
  to anon, authenticated;

-- Re-evaluate only affected event sequences before the existing ledger update
-- and delete triggers run. Trigger names sort before attempts_*_refresh_badge_ledger.
create or replace function public.refresh_matrix_glitch_after_attempt_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_event_id uuid;
begin
  for requested_event_id in
    select old_attempts.event_id from old_attempts
      where old_attempts.event_id is not null
    union
    select new_attempts.event_id from new_attempts
      where new_attempts.event_id is not null
  loop
    perform public.refresh_matrix_glitch_event_evidence(requested_event_id);
  end loop;
  return null;
end;
$$;

create or replace function public.refresh_matrix_glitch_after_attempt_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_event_id uuid;
begin
  for requested_event_id in
    select distinct old_attempts.event_id from old_attempts
    where old_attempts.event_id is not null
  loop
    perform public.refresh_matrix_glitch_event_evidence(requested_event_id);
  end loop;
  return null;
end;
$$;

revoke all on function public.refresh_matrix_glitch_after_attempt_update(),
  public.refresh_matrix_glitch_after_attempt_delete()
  from public, anon, authenticated;

create trigger attempts_00_refresh_matrix_glitch_update
after update on public.attempts
referencing old table as old_attempts new table as new_attempts
for each statement
execute function public.refresh_matrix_glitch_after_attempt_update();

create trigger attempts_00_refresh_matrix_glitch_delete
after delete on public.attempts
referencing old table as old_attempts
for each statement
execute function public.refresh_matrix_glitch_after_attempt_delete();

-- Event close remains authoritative. Refresh the one event's global Matrix
-- evidence before the established participant batch ledger synchronization.
create or replace function public.refresh_badge_ledger_after_event_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_player_ids uuid[];
  requested_event_id uuid;
begin
  if tg_op = 'DELETE' then
    requested_event_id := old.id;
  else
    requested_event_id := new.id;
  end if;

  if tg_op = 'UPDATE' and
    (old.name, old.start_date, old.started_at, old.ends_at, old.status,
      old.closed_at, old.deleted_at, old.winner_player_id)
    is not distinct from
    (new.name, new.start_date, new.started_at, new.ends_at, new.status,
      new.closed_at, new.deleted_at, new.winner_player_id) then
    return new;
  end if;

  if tg_op <> 'DELETE' and new.deleted_at is null then
    perform public.refresh_matrix_glitch_event_evidence(requested_event_id);
  end if;

  select array_agg(affected.player_id order by affected.player_id)
  into requested_player_ids
  from (
    select participants.player_id
    from public.event_participants participants
    where participants.event_id = requested_event_id
      and participants.player_id is not null
    union
    select attempts.player_id
    from public.attempts attempts
    where attempts.event_id = requested_event_id
      and attempts.player_id is not null
  ) affected;

  if coalesce(cardinality(requested_player_ids), 0) > 0 then
    perform public.sync_player_badge_award_ledgers(requested_player_ids);
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.refresh_badge_ledger_after_event_change()
  from public, anon, authenticated;
