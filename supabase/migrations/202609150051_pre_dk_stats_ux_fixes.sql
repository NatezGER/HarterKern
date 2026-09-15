-- Keep the existing Trophy-event read model intact and correct only its
-- Schnapszahl predicate. The guarded replacement avoids duplicating the large
-- function body while still producing a normal CREATE OR REPLACE definition.

do $migration$
declare
  original_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef(
    'public.get_trophy_event_special_stats(uuid)'::regprocedure
  ) into original_definition;

  corrected_definition := replace(
    original_definition,
    'where mod(ending, 11) = 0',
    'where ending between 11 and 99 and mod(ending, 11) = 0'
  );

  if corrected_definition = original_definition then
    raise exception 'Trophy Schnapszahl predicate was not found';
  end if;

  execute corrected_definition;
end;
$migration$;

comment on function public.get_trophy_event_special_stats(uuid) is
  'One event-scoped read model for Trophy Most Wanted, canonical BINGO and milestones; Schnapszahl endings are 11 through 99 and exclude 00.';
