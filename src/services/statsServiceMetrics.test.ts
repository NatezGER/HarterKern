import { describe, expect, it } from "vitest";
import { mapGlobalStatistics, withQualifiedSeasonBest } from "@/services/statsService";

describe("global statistic cards", () => {
  it("uses clear valid-attempt, DNF percentage and average metrics", () => {
    const cards = mapGlobalStatistics({
      regular_players: 8,
      event_count: 4,
      approved_attempts: 21,
      valid_attempts: 20,
      community_valid_attempts: 30,
      guest_count: 3,
      closed_event_count: 2,
      dnf_count: 1,
      world_record_hundredths: 250,
      average_hundredths: 342,
    }, "all-time");
    expect(cards.find(({ id }) => id === "valid")).toMatchObject({ label: "Gültige Eventversuche", value: "20" });
    expect(cards.find(({ id }) => id === "community-valid")?.value).toBe("30");
    expect(cards.find(({ id }) => id === "guests")?.value).toBe("3");
    expect(cards.find(({ id }) => id === "closed-events")?.value).toBe("2");
    expect(cards.find(({ id }) => id === "events")?.value).toBe("4");
    expect(cards.find(({ id }) => id === "dnf")?.value).toBe("1 · 4,8 %");
    expect(cards.find(({ id }) => id === "average")?.value).toBe("3,42 s");
    expect(cards.some(({ change }) => change === "DNF ausgeschlossen")).toBe(false);
  });

  it("replaces only the season record with the qualified best time", () => {
    const eventStatistics = {
      regular_players: 8, event_count: 4, approved_attempts: 21,
      valid_attempts: 20, dnf_count: 1, world_record_hundredths: 250,
      average_hundredths: 342,
    };
    const result = withQualifiedSeasonBest(eventStatistics, 207);
    expect(result.world_record_hundredths).toBe(207);
    expect(result).toMatchObject({
      valid_attempts: 20, dnf_count: 1, approved_attempts: 21,
      event_count: 4, average_hundredths: 342,
    });
  });
});
