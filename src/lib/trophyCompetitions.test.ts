import { describe, expect, it } from "vitest";
import {
  competitionAfterTrophyToggle,
  findSelectableTrophyCompetition,
  SELECTABLE_TROPHY_EVENT_COMPETITIONS,
  trophyCompetitionName,
} from "@/lib/trophyCompetitions";

describe("trophy event competitions", () => {
  it("offers Denmark 2026 but not season awards for new events", () => {
    expect(SELECTABLE_TROPHY_EVENT_COMPETITIONS).toEqual([
      { key: "denmark", year: 2026, name: "Dänemark 2026" },
    ]);
    expect(findSelectableTrophyCompetition("denmark:2026"))
      .toEqual({ key: "denmark", year: 2026, name: "Dänemark 2026" });
    expect(findSelectableTrophyCompetition("season:2026")).toBeNull();
  });

  it("clears competition metadata when trophy mode is disabled", () => {
    const denmark = findSelectableTrophyCompetition("denmark:2026");
    expect(competitionAfterTrophyToggle(false, denmark)).toBeNull();
    expect(competitionAfterTrophyToggle(true, denmark)).toEqual(denmark);
  });

  it("resolves display names exclusively from structured metadata", () => {
    expect(trophyCompetitionName("denmark", 2026)).toBe("Dänemark 2026");
    expect(trophyCompetitionName("Dänemark Finale", 2026)).toBeNull();
  });
});
