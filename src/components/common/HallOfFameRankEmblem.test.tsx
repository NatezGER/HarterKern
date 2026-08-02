import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HallOfFameRankEmblem } from "@/components/common/HallOfFameRankEmblem";
import { PodiumMedal } from "@/components/common/PodiumMedal";

describe("HallOfFameRankEmblem", () => {
  it.each([
    [1, "crown"],
    [2, "rank-number"],
    [3, "rank-number"],
  ] as const)("uses the dedicated %s global-rank emblem", (place, emblem) => {
    const markup = renderToStaticMarkup(<HallOfFameRankEmblem place={place} />);
    expect(markup).toContain(`data-hall-of-fame-emblem="${emblem}"`);
    expect(markup).not.toContain("data-podium-medal");
  });

  it("uses plain silver and bronze rank numbers without laurels or medal artwork", () => {
    const silver = renderToStaticMarkup(<HallOfFameRankEmblem place={2} />);
    const bronze = renderToStaticMarkup(<HallOfFameRankEmblem place={3} />);

    expect(silver).toContain('data-rank-material="silver"');
    expect(bronze).toContain('data-rank-material="bronze"');
    expect(silver).not.toContain("<svg");
    expect(bronze).not.toContain("<svg");
    expect(`${silver}${bronze}`).not.toContain("laurel");
  });

  it("keeps event podium medals as a separate symbol system", () => {
    const eventMedal = renderToStaticMarkup(<PodiumMedal rank={1} />);
    expect(eventMedal).toContain("data-podium-medal=\"1\"");
    expect(eventMedal).not.toContain("data-hall-of-fame-emblem");
  });
});
