-- PR 9A: season foundation and 48-hour automatic event ending.

alter table public.events
  drop constraint events_time_order;

alter table public.events
  add constraint events_time_order check (
    ends_at > started_at and ends_at <= started_at + interval '48 hours'
  );

create or replace function public.sync_start_event_v3(
  p_name text,
  p_start_date date,
  p_participants jsonb,
  p_started_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_legacy_source_id text default null,
  p_awards_trophies boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  event_start timestamptz := coalesce(p_started_at, now());
  result jsonb;
begin
  result := public.sync_start_event_v2(
    p_name,
    p_start_date,
    p_participants,
    event_start,
    coalesce(p_ends_at, event_start + interval '48 hours'),
    p_legacy_source_id
  );
  update public.events
  set awards_trophies = coalesce(p_awards_trophies, false)
  where id = (result->>'eventId')::uuid;
  return result;
end;
$$;

revoke all on function public.sync_start_event_v3(
  text, date, jsonb, timestamptz, timestamptz, text, boolean
) from public;
grant execute on function public.sync_start_event_v3(
  text, date, jsonb, timestamptz, timestamptz, text, boolean
) to anon, authenticated;
