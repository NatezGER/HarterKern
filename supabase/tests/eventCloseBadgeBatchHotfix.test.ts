import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL(
  "../migrations/202609130048_event_close_badge_batch_hotfix.sql",
  import.meta.url,
), "utf8");

function functionBody(name: string, nextMarker: string) {
  const start = sql.indexOf(`function public.${name}(`);
  return sql.slice(start, sql.indexOf(nextMarker, start));
}

describe("event close badge batch hotfix", () => {
  it("evaluates the canonical award source once for a deduplicated player set", () => {
    const batch = functionBody("sync_player_badge_award_ledgers",
      "create or replace function public.sync_player_badge_award_ledger");
    expect(batch).toContain("select distinct requested.player_id");
    expect(batch).toContain("public.player_badge_award_sync_source source");
    expect(batch.match(/player_badge_award_sync_source/g)).toHaveLength(1);
    expect(batch).toContain("join requested_players requested");
    expect(batch).toContain("on conflict (award_key) do update");
    expect(batch).toContain("delete from public.player_badge_award_ledger");
  });

  it("preserves the established single-player synchronization API", () => {
    const single = functionBody("sync_player_badge_award_ledger",
      "create or replace function public.refresh_badge_ledger_after_event_change");
    expect(single).toContain("sync_player_badge_award_ledgers(array[p_player_id])");
  });

  it("collects each event player once and invokes one batched ledger refresh", () => {
    const refresh = functionBody("refresh_badge_ledger_after_event_change",
      "revoke all on function");
    expect(refresh).toContain("union\n    select attempts.player_id");
    expect(refresh).toContain("array_agg(affected.player_id order by affected.player_id)");
    expect(refresh.match(/sync_player_badge_award_ledgers\(requested_player_ids\)/g))
      .toHaveLength(1);
    expect(refresh).not.toContain("sync_player_badge_award_ledger(requested_player_id)");
    expect(sql).not.toMatch(/drop trigger|disable trigger|statement_timeout/i);
  });
});
