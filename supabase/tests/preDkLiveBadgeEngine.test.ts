import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL(
  "../migrations/202609150050_pre_dk_live_badge_engine.sql",
  import.meta.url,
), "utf8");

function section(start: string, end: string) {
  const startIndex = sql.indexOf(start);
  return sql.slice(startIndex, sql.indexOf(end, startIndex));
}

const evaluator = section(
  "create or replace function public.get_live_attempt_badge_unlocks",
  "revoke all on function public.get_live_attempt_badge_unlocks",
);

describe("Pre-DK live badge engine architecture", () => {
  it("never invokes the global award source or a ledger sync", () => {
    expect(evaluator).not.toContain("player_badge_award_sync_source");
    expect(evaluator).not.toMatch(/sync_(all_)?player_badge_award_ledger/);
    expect(evaluator).toContain("where a.player_id = requested.player_id");
    expect(evaluator).toContain("and a.event_id = requested.event_id");
    expect(evaluator).toContain("set statement_timeout = '2500ms'");
  });

  it("supports exactly the requested live families and active definitions", () => {
    for (const family of ["time-limits", "valid-attempts", "event-attempts",
      "sub3-streak", "flawless", "rapid-fire", "favorite-time", "bingo"]) {
      expect(evaluator).toContain(`definitions.family_key = '${family}'`);
    }
    for (const badge of ["time-stopper", "almost", "false-starter",
      "reverse-gear", "first-official-attempt", "official-world-record",
      "matrix-glitch"]) {
      expect(evaluator).toContain(`'${badge}'`);
    }
    expect(evaluator).toContain("definitions.is_active");
    for (const deferred of ["event-wins", "win-streak", "activity-years",
      "community", "events-played", "podiums", "precision",
      "bingo-completion", "teamwork", "event-lead-time", "rivalry",
      "first-win", "photo-finish", "wooden-bronze-medal"]) {
      expect(evaluator).not.toContain(`'${deferred}'`);
    }
  });

  it("keeps Flawless player-scoped across event boundaries with DNF breakers", () => {
    const flawless = evaluator.slice(
      evaluator.indexOf("with reverse_order as (", evaluator.indexOf("into reverse_times")),
      evaluator.indexOf("select count(*)::integer\n    into rapid_fire_attempts"),
    );
    expect(flawless).toContain("a.player_id = requested.player_id");
    expect(flawless).toContain("a.event_id is not null");
    expect(flawless).not.toContain("a.event_id = requested.event_id");
    expect(flawless).toContain("case when a.is_dnf then 1 else 0 end");
  });

  it("uses an inclusive player-scoped rolling hour and no historical clock", () => {
    const rapid = evaluator.slice(
      evaluator.indexOf("into rapid_fire_attempts"),
      evaluator.indexOf("into favorite_occurrences"),
    );
    expect(rapid).toContain("requested.submitted_at - interval '60 minutes'");
    expect(rapid).toContain("a.player_id = requested.player_id");
    expect(rapid).not.toContain("historical_attempts");
  });

  it("counts Favorite Time only for the exact full time", () => {
    const favorite = evaluator.slice(
      evaluator.indexOf("into favorite_occurrences"),
      evaluator.indexOf("into special_occurrences"),
    );
    expect(favorite).toContain("a.time_hundredths = requested.time_hundredths");
    expect(favorite).toContain("h.time_hundredths = requested.time_hundredths");
    expect(evaluator).toContain("definitions.threshold = favorite_occurrences");
  });

  it("limits BINGO to the affected cell and its canonical lines", () => {
    expect(evaluator).toContain("from public.bingo_line_cells cells");
    expect(evaluator).toContain("cells.ending = mod(requested.time_hundredths, 100)");
    expect(evaluator).toContain("cells.line_key = lines.line_key");
    expect(evaluator).toContain("definitions.threshold = any(bingo_thresholds)");
  });

  it("compares world records with a strict prior minimum", () => {
    expect(evaluator).toContain("into previous_world_record");
    expect(evaluator).toContain("requested.time_hundredths < previous_world_record");
    expect(evaluator).not.toContain("world_record_progression");
  });

  it("implements personal and filtered event-global Matrix modes", () => {
    expect(sql).toContain("partition by player_id");
    expect(sql).toContain("previous_time_hundredths = sequenced.time_hundredths");
    expect(evaluator).toContain("requested.event_status = 'active'");
    expect(evaluator).toContain("then 'personal_and_global'");
    expect(evaluator).toContain("when global_glitch then 'global' else 'personal'");
  });

  it("persists Matrix evidence and refreshes only affected events", () => {
    expect(sql).toContain("create table public.matrix_glitch_event_evidence");
    expect(sql).toContain("unique (source_attempt_id)");
    expect(sql).toContain("refresh_matrix_glitch_event_evidence(requested_event_id)");
    expect(sql).toContain("public.matrix_glitch_event_badge_awards");
    expect(sql).toContain("union all select * from public.matrix_glitch_event_badge_awards");
    expect(sql).toContain("attempts_00_refresh_matrix_glitch_update");
    expect(sql).toContain("attempts_00_refresh_matrix_glitch_delete");
  });

  it("deduplicates against the persisted ledger and adds bounded indexes", () => {
    expect(evaluator).toContain("public.player_badge_award_ledger ledger");
    expect(evaluator).toContain("ledger.player_id = requested.player_id");
    expect(sql).toContain("attempts_live_badge_player_sequence_idx");
    expect(sql).toContain("attempts_live_badge_event_sequence_idx");
  });
});
