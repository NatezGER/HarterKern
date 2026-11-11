import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PodiumMedal } from "@/components/common/PodiumMedal";

describe("PodiumMedal", () => {
  it.each([1, 2, 3] as const)("uses the same laurel geometry for place %s", (rank) => {
    const markup = renderToStaticMarkup(<PodiumMedal rank={rank} />);

    expect(markup).toContain(`data-podium-medal="${rank}"`);
    expect(markup).toContain('viewBox="0 0 100 100"');
    expect(markup).toContain("<ellipse");
    expect(markup).toContain(`>${rank}</text>`);
    expect(markup).not.toContain("clip-path");
  });

  it("keeps compact and featured medals on the same geometry", () => {
    const compact = renderToStaticMarkup(<PodiumMedal rank={1} size="sm" />);
    const featured = renderToStaticMarkup(<PodiumMedal rank={1} size="lg" />);

    expect(compact).toContain("h-11 w-10");
    expect(featured).toContain("h-16 w-14 sm:h-24 sm:w-20");
    expect(compact).toContain('viewBox="0 0 100 100"');
    expect(featured).toContain('viewBox="0 0 100 100"');
  });

  it("keeps semantic medal gold independent from the season context", () => {
    const markup = renderToStaticMarkup(<PodiumMedal rank={1} />);
    expect(markup).toContain("#e8bc54");
    expect(markup).not.toContain("context-accent");
  });
});
