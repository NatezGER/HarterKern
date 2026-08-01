import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HallOfFameRankEmblem } from "@/components/common/HallOfFameRankEmblem";
import { PodiumMedal } from "@/components/common/PodiumMedal";

describe("HallOfFameRankEmblem", () => {
  it.each([
    [1, "crown"],
    [2, "silver-laurel"],
    [3, "bronze-laurel"],
  ] as const)("uses the dedicated %s global-rank emblem", (place, emblem) => {
    const markup = renderToStaticMarkup(<HallOfFameRankEmblem place={place} />);
    expect(markup).toContain(`data-hall-of-fame-emblem="${emblem}"`);
    expect(markup).not.toContain("data-podium-medal");
  });

  it("keeps event podium medals as a separate symbol system", () => {
    const eventMedal = renderToStaticMarkup(<PodiumMedal rank={1} />);
    expect(eventMedal).toContain("data-podium-medal=\"1\"");
    expect(eventMedal).not.toContain("data-hall-of-fame-emblem");
  });
});
