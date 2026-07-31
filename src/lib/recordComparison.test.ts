import { describe, expect, it } from "vitest";
import { getRecordAt, selectRecordsForPeriod } from "@/lib/recordComparison";

const records = [
  { id: "old", achievedAt: "2025-01-01", timeHundredths: 300 },
  { id: "new", achievedAt: "2025-03-01", timeHundredths: 280 },
];

describe("world-record comparison", () => {
  it("carries the valid world record into the player's starting date", () => {
    const selected = selectRecordsForPeriod(records, "2025-02-01", "2025-04-01");
    expect(selected[0]).toMatchObject({ id: "old", axisAt: "2025-02-01", carriedFromBefore: true });
    expect(selected.map(({ id }) => id)).toEqual(["old", "new"]);
  });

  it("returns the record valid at an exact historical moment", () => {
    expect(getRecordAt(records, "2025-03-01")?.id).toBe("new");
    expect(getRecordAt(records, "2024-12-31")).toBeNull();
  });
});
