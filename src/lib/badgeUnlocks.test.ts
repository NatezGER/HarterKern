import { describe, expect, it } from "vitest";
import { takeUnseenUnlocks } from "@/lib/badgeUnlocks";

describe("badge unlock presentation queue", () => {
  it("queues multiple new awards once and ignores realtime repeats", () => {
    const presented = new Set<string>();
    const unlocks = [{ key: "bronze" }, { key: "silver" }];
    expect(takeUnseenUnlocks(unlocks, presented)).toEqual(unlocks);
    expect(takeUnseenUnlocks(unlocks, presented)).toEqual([]);
  });

  it("still queues a later tier upgrade in the same badge family", () => {
    const presented = new Set(["attempts:bronze"]);
    expect(takeUnseenUnlocks([{ key: "attempts:silver" }], presented))
      .toEqual([{ key: "attempts:silver" }]);
  });
});
