// Uses the same isolated PGlite database as the PR F checks. No remote DB access.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkPerformancePrF } from "./check-performance-pr-f.mjs";

const migration = name => readFileSync("supabase/migrations/" + name, "utf8");
const previous = migration("202611110080_performance_pr_f.sql");
const next = migration("202611120081_performance_new_metrics_timeout.sql");
const definition = (sql, type, name) => {
  const end = type === "function" ? "\\$\\$;" : ";";
  return sql.match(new RegExp("create (?:or replace )?" + type + " public\\." + name + "\\b[\\s\\S]*?" + end, "i"))[0];
};
const event = "get_performance_event_metrics_v2";
const development = "get_performance_development_metrics_v2";
const dashboard = "get_statistics_performance_dashboard";
const base = dashboard + "_base_probe";
const scopes = [2026, null, 2027, 2025];
const baseline = definition(previous, "function", dashboard)
  .replace(dashboard + "(", base + "(")
  .replace(/select \* from public\.get_performance_event_metrics_v2\(p_season_year,null\)/,
    "select null::text metric_key, null::uuid player_id, null::numeric value, null::numeric hit_count, null::numeric sample_count, null::text detail, null::jsonb evidence where false")
  .replace("public.get_performance_development_metrics_v2(p_season_year,null)", "'[]'::jsonb");

await checkPerformancePrF(process.argv[2], async db => {
  await db.exec("reset role");
  const query = async (sql, args = []) => (await db.query(sql, args)).rows;
  // Use actual qualification and season views. Podium/PB/WR sources unrelated
  // to chronology are fixture contracts, as are the PR F global aggregates.
  await db.exec("drop view season_qualified_official_times; drop view qualified_official_times;");
  await db.exec(`
    alter table event_guests add column display_name text;
    create table historical_attempts(id uuid primary key, player_id uuid, display_name text,
      is_guest boolean not null default false, time_hundredths integer, attempt_date date,
      sort_order integer, deleted_at timestamptz, out_of_competition boolean not null default false);
    create table event_podium(event_id uuid, player_id uuid, guest_id uuid, rank bigint, best_time_hundredths integer);
    create table player_pb_progression(source_type text, source_id uuid);
    create table world_record_progression(source_type text, attempt_id uuid);
  `);
  for (const [file, name] of [
    ["202607300015_pr7b_history_profiles.sql", "event_attempt_details"],
    ["202608020017_pr8a_badges_trophies_most_wanted.sql", "qualified_official_times"],
    ["202608120026_pr9d_seasonal_most_wanted.sql", "season_qualified_official_times"],
  ]) await db.exec(definition(migration(file), "view", name));
  // Replay the existing event patterns across earlier/current seasons for a
  // repeatable load. Include a Dec 31 event with attempts after midnight.
  await db.exec(`
    create temporary table fixture_events as select * from events;
    create temporary table fixture_attempts as select * from attempts;
    create temporary table fixture_guests as select * from event_guests;
    insert into events
    select md5(e.id::text || copy)::uuid, e.name, date '2025-01-01' + copy * 29,
      e.status, e.deleted_at, e.closed_at, e.ends_at, e.awards_trophies
    from fixture_events e cross join generate_series(1,28) copy;
    insert into event_guests
    select md5(g.id::text || copy)::uuid, md5(g.event_id::text || copy)::uuid, g.display_name
    from fixture_guests g cross join generate_series(1,28) copy;
    insert into attempts
    select md5(a.id::text || copy)::uuid, e.id, a.player_id, md5(a.guest_id::text || copy)::uuid,
      a.submitted_at + (e.start_date - date '2026-01-01') * interval '1 day',
      a.time_hundredths, a.is_dnf, a.is_ak, a.status, a.deleted_at
    from fixture_attempts a cross join generate_series(1,28) copy
    join events e on e.id=md5(a.event_id::text || copy)::uuid;
    update events set start_date='2025-12-31'
    where id='80000000-0000-0000-0000-000000000105';
    insert into historical_attempts(id,player_id,display_name,time_hundredths,attempt_date,sort_order)
    select md5(a.id::text || 'historical')::uuid, a.player_id, p.display_name, a.time_hundredths,
      case when a.player_id='80000000-0000-0000-0000-000000000004'
        then date '2026-01-01' else date '2025-01-01' end,
      row_number() over (order by a.submitted_at,a.id)
    from fixture_attempts a join players p on p.id=a.player_id
    where a.time_hundredths is not null and not a.is_ak
      and a.status='approved' and a.deleted_at is null;
    create index on attempts (event_id, submitted_at desc);
    create index on attempts (player_id, submitted_at desc);
    create schema auth;
    create function auth.uid() returns uuid language sql stable as 'select null::uuid';
    create table admin_roles(user_id uuid primary key);
    grant select on all tables in schema public to anon, authenticated;
  `);
  const security = migration("202607270002_security_and_functions.sql");
  const eventPolicies = migration("202607300013_pr7a_event_foundation.sql");
  const history = migration("202607290012_pr6c_production_data.sql");
  await db.exec(definition(security, "function", "is_admin"));
  for (const [table, policySource] of [
    ["players", security], ["events", eventPolicies], ["attempts", eventPolicies],
    ["event_guests", eventPolicies], ["historical_attempts", history],
  ]) {
    await db.exec("alter table public." + table + " enable row level security");
    await db.exec(policySource.match(new RegExp("create policy " + table + "_public_read\\b[^;]+;", "i"))[0]);
  }
  await db.exec(baseline);
  await db.exec("analyze; set role anon; set statement_timeout='3s';");
  const stats = (await query("select current_user, current_setting('statement_timeout') timeout, count(*) from attempts"))[0];
  console.log("Benchmark fixture:", JSON.stringify(stats));

  async function capture(season) {
    const args = [season];
    const eventRows = await query("select * from " + event + "($1,null) order by metric_key,player_id", args);
    const developmentRows = await query("select " + development + "($1,null) as result", args);
    const dashboardRows = await query("select " + dashboard + "($1) as result", args);
    const details = [];
    for (const { id } of await query("select id from players order by id")) {
      details.push(await query("select * from " + event + "($1,$2) order by metric_key,player_id", [season,id]));
      details.push(await query("select " + development + "($1,$2) as result", [season,id]));
    }
    return { eventRows, developmentRows, dashboardRows, details };
  }

  async function measure(phase) {
    for (const season of [2026, null]) {
      for (const [name, sql] of [
        ["B", "select * from " + event + "($1,null)"],
        ["C", "select " + development + "($1,null)"],
        ["base without B/C", "select " + base + "($1)"],
        ["dashboard", "select " + dashboard + "($1)"],
      ]) {
        const times = [];
        for (let round = 0; round < 6; round++) {
          const start = performance.now();
          await query(sql, [season]);
          if (round > 0) times.push(Math.round(performance.now() - start));
        }
        console.log(JSON.stringify({ phase, season, name, ms: times }));
      }
    }
  }

  async function explain(phase, sql, name) {
    // Inline constant parameters to expose nested SQL nodes hidden by EXPLAIN
    // of a function call. The actual RPC calls are timed separately above.
    const body = definition(sql, "function", name).split("$$")[1]
      .replaceAll("p_season_year", "2026").replaceAll("p_details_player", "null::uuid");
    const [plan] = (await query("explain (analyze,buffers,format json) " + body))[0]["QUERY PLAN"];
    const work = {};
    function visit(node) {
      const label = node["Node Type"] + (node["Relation Name"] ? " " + node["Relation Name"] : "");
      const entry = work[label] ??= { nodes: 0, rows: 0 };
      entry.nodes++;
      entry.rows += node["Actual Rows"] * node["Actual Loops"];
      node.Plans?.forEach(visit);
    }
    visit(plan.Plan);
    console.log(JSON.stringify({ phase, name, explainMs: plan["Execution Time"], work }));
  }

  const before = new Map();
  for (const season of scopes) before.set(season, await capture(season));
  await measure("080");
  for (const name of [event, development]) await explain("080", previous, name);
  console.log("Applying 081 to the fixture database.");
  await db.exec("reset role");
  await db.exec(next);
  await db.exec("set role anon");
  await measure("081");
  for (const name of [event, development]) await explain("081", next, name);
  for (const season of scopes) {
    assert.deepEqual(await capture(season), before.get(season), "RPC and detail parity for " + season);
    console.log("SQL parity passed for scope " + (season ?? "All-Time") + ".");
  }
  console.log("PR G SQL parity passed: whole dashboard, metric helpers and details for all fixture players in four scopes.");
});
