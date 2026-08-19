import { describe, expect, it } from "vitest";
import { mapGlobalStatistics } from "@/services/statsService";

describe("global statistic cards", () => {
  it("uses clear valid-attempt, DNF percentage and average metrics", () => {
    const cards = mapGlobalStatistics({
      regular_players: 8,
      event_count: 4,
      approved_attempts: 21,
      valid_attempts: 20,
      dnf_count: 1,
      world_record_hundredths: 250,
      average_hundredths: 342,
    }, "all-time");
    expect(cards.find(({ id }) => id === "valid")).toMatchObject({ label: "Gültige Eventversuche", value: "20" });
    expect(cards.find(({ id }) => id === "dnf")?.value).toBe("1 · 4,8 %");
    expect(cards.find(({ id }) => id === "average")?.value).toBe("3,42 s");
    expect(cards.some(({ change }) => change === "DNF ausgeschlossen")).toBe(false);
  });
});
