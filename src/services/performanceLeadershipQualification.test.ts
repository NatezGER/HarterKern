import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const directory = "supabase/migrations";
function latestView(name: string) {
  const definitions = readdirSync(directory).filter(file => file.endsWith(".sql")).sort()
    .flatMap(file => {
      const sql = readFileSync(`${directory}/${file}`, "utf8");
      const expression = new RegExp(`create (?:or replace )?view public\\.${name}\\b[^;]*;`, "gi");
      return [...sql.matchAll(expression)].map(match => ({ file, sql: match[0] }));
    });
  return definitions.at(-1)!;
}

describe("effective canonical leadership qualification", () => {
  it("keeps official player attempts guest-free", () => {
    const view = latestView("official_event_attempts");
    expect(view.file).toContain("060_");
    expect(view.sql).toContain("a.player_id is not null");
    expect(view.sql).toContain("join public.players p on p.id = a.player_id");
  });
  it("uses the second valid time, not the superseded three-player gate", () => {
    const view = latestView("event_lead_windows");
    expect(view.file).toContain("080_");
    expect(view.sql).toContain("from public.event_eligible_attempts a");
    expect(view.sql).toContain("where is_valid_time");
    expect(view.sql).toContain("where valid_number=2");
    expect(view.sql).not.toMatch(/player_sequence|count\(|=\s*3/);
    expect(latestView("event_eligible_attempts").sql).toContain("g.id is not null or");
  });
});
