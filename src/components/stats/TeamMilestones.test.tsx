import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeamMilestones, TeamMilestoneHistory } from "./TeamMilestones";
import { teamMilestones } from "@/constants/teamMilestones";
import { BeerVolumeCard } from "./BeerVolumeCard";

describe("team milestone cards", () => {
  it("renders matched stage cards, percentages, remaining values and missing artwork safely", () => {
    const markup = renderToStaticMarkup(<TeamMilestones snapshot={{ season:2026,validAttempts:262,teamTimeHundredths:2610,playerCount:10 }} />);
    for (const text of ["lg:grid-cols-2", "Aktuell erreicht", "Nächstes Ziel", "52,4 L", "26,10 s", "15 %", "78 %", "Noch 7,6 L", "Noch 0,14 s schneller", "Was bedeutet das?", "data-artwork-fallback"]) expect(markup).toContain(text);
    expect(markup).not.toContain("<img");
    expect(markup).toContain("team-minesweeper-26-59");
  });
  it("shows only achieved tiers and never unlocks time tiers for partial teams", () => {
    const snapshot = { season:2026,validAttempts:3,teamTimeHundredths:500,playerCount:2 };
    const markup = renderToStaticMarkup(<TeamMilestoneHistory snapshot={snapshot} />);
    expect(markup).toContain('data-achieved-milestone="beer-blood-donation"');
    expect(markup).not.toContain('data-achieved-milestone="beer-mass-1l"');
    expect(markup).not.toContain('data-achieved-milestone="team-');
    expect(renderToStaticMarkup(<TeamMilestones snapshot={snapshot} />)).toContain("Wartet auf vollständiges Team");
  });
  it("renders sourced facts but does not render a fact lacking its source", () => {
    const entry = teamMilestones.find(m=>m.id==="team-ingenuity-39-10")!;
    const snapshot = { season:2026,validAttempts:0,teamTimeHundredths:3900,playerCount:10 };
    expect(renderToStaticMarkup(<TeamMilestones snapshot={snapshot} />)).toContain("data-interesting-fact");
    const original = entry.source;
    // Exercise the runtime guard as well as the compile-time discriminated type.
    Object.assign(entry,{ source:null });
    try { expect(renderToStaticMarkup(<TeamMilestones snapshot={snapshot} />)).not.toContain("data-interesting-fact"); }
    finally { Object.assign(entry,{ source:original }); }
  });
  it("shows final and starting states without invented targets or dates", () => {
    const snapshot = { season:"all-time" as const,validAttempts:2000000,teamTimeHundredths:1800,playerCount:10 };
    const markup = renderToStaticMarkup(<TeamMilestones snapshot={snapshot} />);
    expect(markup).toContain("Alle aktuellen Meilensteine erreicht");
    expect(markup).not.toContain("Noch 0");
    const empty = renderToStaticMarkup(<TeamMilestoneHistory snapshot={{ ...snapshot,validAttempts:0,playerCount:0,teamTimeHundredths:null }} />);
    expect(empty).toContain("Noch keine Team-Meilensteine");
  });
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
