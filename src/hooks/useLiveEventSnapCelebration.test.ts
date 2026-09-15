import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("useLiveEvent Schnapszahl save contract", () => {
  const source = readFileSync(fileURLToPath(new URL("./useLiveEvent.tsx", import.meta.url)), "utf8");

  it("only schedules the celebration after the remote attempt save succeeded", () => {
    const persisted = source.indexOf("const id = await createRemoteAttempt(input)");
    const scheduled = source.indexOf("setSnapEndingCelebration(snapEndingCelebrationFor");
    expect(persisted).toBeGreaterThan(-1);
    expect(scheduled).toBeGreaterThan(persisted);
  });

  it("has one presentation trigger per saved attempt", () => {
    expect(source.match(/setSnapEndingCelebration\(snapEndingCelebrationFor/g)).toHaveLength(1);
  });

  it("keeps live badge lookup optional after persistence", () => {
    const persisted = source.indexOf("const id = await createRemoteAttempt(input)");
    const lookup = source.indexOf("void getAttemptBadgeUnlocks(id, player.name)");
    const ignoredFailure = source.indexOf(".catch(() => undefined)", lookup);
    const released = source.indexOf("setPendingBadgeLookups", ignoredFailure);
    expect(lookup).toBeGreaterThan(persisted);
    expect(ignoredFailure).toBeGreaterThan(lookup);
    expect(released).toBeGreaterThan(ignoredFailure);
  });
});
