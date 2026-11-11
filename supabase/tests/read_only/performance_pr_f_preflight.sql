-- Read-only staging/preview validation after migration 080.
-- Not executed against production by Codex. Capture the same probes before/after rollout.
begin read only;
set local statement_timeout = '60s';
select p.proname,pg_get_function_identity_arguments(p.oid) arguments,p.prosecdef security_definer,
 p.provolatile volatility,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('get_statistics_performance_dashboard','get_performance_metric_details',
 'get_performance_event_metrics_v2','get_performance_development_metrics_v2','get_performance_sequence_metrics');
select pg_get_viewdef('public.event_lead_windows'::regclass,true);
explain (analyze,buffers) select public.get_statistics_performance_dashboard(2026);
explain (analyze,buffers) select public.get_statistics_performance_dashboard(null);
select octet_length(public.get_statistics_performance_dashboard(2026)::text) payload_bytes;
-- Choose a real ranking row; do not insert fixtures into this database.
with payload as (select public.get_statistics_performance_dashboard(2026) data), candidate as (
 select m->>'key' metric_key,r->>'playerId' player_id
 from payload cross join lateral jsonb_array_elements(data->'metrics') m
 cross join lateral jsonb_array_elements(m->'rankings') r
 where m->>'key'='performance-chaos-takeovers' limit 1
)
select public.get_performance_metric_details(2026,metric_key,player_id::uuid) from candidate;
rollback;
