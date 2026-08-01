import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PodiumMedal } from "@/components/common/PodiumMedal";

describe("PodiumMedal", () => {
  it.each([1, 2, 3] as const)("uses the same centered ribbon geometry for place %s", (rank) => {
    const markup = renderToStaticMarkup(<PodiumMedal rank={rank} />);

    expect(markup).toContain(`data-podium-medal="${rank}"`);
    expect(markup).toContain("left-1/2 top-0");
    expect(markup).toContain("left-1/2 grid aspect-square");
    expect(markup).toContain("-translate-x-1/2");
    expect(markup).not.toContain("#");
  });

  it("keeps compact and featured medals on the same geometry", () => {
    const compact = renderToStaticMarkup(<PodiumMedal rank={1} size="sm" />);
    const featured = renderToStaticMarkup(<PodiumMedal rank={1} size="lg" />);

    expect(compact).toContain("h-11 w-10");
    expect(featured).toContain("h-16 w-14 sm:h-24 sm:w-20");
    expect(compact).toContain("w-[78%]");
    expect(featured).toContain("w-[78%]");
  });
});
