import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TrophyCompetitionField } from "@/components/events/StartEventPanel";

vi.mock("@/hooks/useLiveEvent", () => ({ useLiveEvent: vi.fn() }));

describe("TrophyCompetitionField", () => {
  it("stays hidden until trophy mode is enabled", () => {
    expect(renderToStaticMarkup(
      <TrophyCompetitionField visible={false} value="" onChange={vi.fn()} />,
    )).toBe("");
  });

  it("offers the generic mode and Denmark 2026", () => {
    const markup = renderToStaticMarkup(
      <TrophyCompetitionField visible value="denmark:2026" onChange={vi.fn()} />,
    );
    expect(markup).toContain("Allgemeines Trophäen-Event");
    expect(markup).toContain("Dänemark 2026");
    expect(markup).not.toContain("Saisonmeister");
  });
});
