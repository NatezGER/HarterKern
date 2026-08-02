import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PersonalBingo } from "@/components/players/PersonalBingo";
import type { PlayerBingo } from "@/types/historyProfiles";

const data: PlayerBingo = {
  fields: Array.from({ length: 100 }, (_, ending) => {
    const hitCount = ending === 77 ? 2 : ending === 55 ? 4 : ending === 11 ? 1 : 0;
    return {
      ending,
      label: String(ending).padStart(2, "0"),
      hitCount,
      tier: hitCount >= 3 ? "gold" as const : hitCount === 2 ? "silver" as const : hitCount === 1 ? "bronze" as const : "open" as const,
      hits: [],
    };
  }),
  summary: {
    collectedEndings: 3,
    bronzeFields: 3,
    silverFields: 2,
    goldFields: 1,
    bronzeLines: 4,
    silverLines: 1,
    goldLines: 0,
    highestBadgeTier: "silver",
  },
};

describe("PersonalBingo", () => {
  it("renders all 100 keyboard-accessible cells without avatars or page overflow", () => {
    const markup = renderToStaticMarkup(<PersonalBingo data={data} />);
    expect(markup.match(/role="gridcell"/g)).toHaveLength(100);
    expect(markup).toContain("Endung 77, Silber, zweimal erreicht");
    expect(markup).toContain("Endung 55, Gold, 4-mal erreicht");
    expect(markup).toContain("Endung 00, Offen, nicht erreicht");
    expect(markup).not.toContain("<img");
    expect(markup).toContain("grid-cols-10");
    expect(markup).toContain("overflow-hidden");
    expect(markup).toContain("motion-reduce:transition-none");
  });

  it("labels cumulative field and line statistics explicitly", () => {
    const markup = renderToStaticMarkup(<PersonalBingo data={data} />);
    expect(markup).toContain("Mind. Bronze");
    expect(markup).toContain("Mind. Silber");
    expect(markup).toContain("Bronze-BINGOs");
    expect(markup).toContain("Linienzahlen bauen kumulativ aufeinander auf");
  });
});
