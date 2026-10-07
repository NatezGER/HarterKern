import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeamMilestones } from "./TeamMilestones";
import { BeerVolumeCard } from "./BeerVolumeCard";

describe("team milestone cards", () => {
  it.each(["all-time" as const, 2026])("renders %s and the same volume as the overview", season => {
    const markup = renderToStaticMarkup(<TeamMilestones snapshot={{ season, validAttempts: 10, teamTimeHundredths: 2784, playerCount: 10 }} />);
    expect(markup).toContain("27,84 s");
    expect(markup).toContain("10/10 Spieler");
    expect(markup).toContain(season === "all-time" ? "Ewig" : "Saison 2026");
    expect(markup).toContain("2,0 L");
    expect(renderToStaticMarkup(<BeerVolumeCard validAttempts={10} compact />)).toContain("2,0 L");
  });
  it("shows partial sums, empty states and replaceable artwork without fake completion", () => {
    const partial = renderToStaticMarkup(<TeamMilestones snapshot={{ season: 2026, validAttempts: 2, teamTimeHundredths: 555, playerCount: 2 }} beerArtwork={<span>Beer artwork</span>} timeArtwork={<span>Time artwork</span>} />);
    expect(partial).toContain("5,55 s");
    expect(partial).toContain("2/10 Spieler");
    expect(partial).toContain("Unvollständiges Team");
    expect(partial).toContain("Beer artwork");
    expect(partial).toContain("Time artwork");
    const empty = renderToStaticMarkup(<TeamMilestones snapshot={{ season: 2026, validAttempts: 0, teamTimeHundredths: null, playerCount: 0 }} />);
    expect(empty).toContain("0/10 Spieler");
    expect(empty).not.toContain("0,00 s");
    expect(empty).toContain("Noch keine qualifizierten Bestzeiten");
  });
});
