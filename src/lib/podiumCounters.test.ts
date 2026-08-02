import { describe, expect, it } from "vitest";
import { getPodiumCounters } from "@/lib/podiumCounters";

describe("podium counters", () => {
  it("uses the central completed-event podium statistics without adding historical attempts", () => {
    expect(getPodiumCounters({ wins: 12, secondPlaces: 8, thirdPlaces: 5 }).map(({ count }) => count)).toEqual([12, 8, 5]);
  });
});
