import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BeerMilestoneProgress, TeamMilestones, TeamMilestoneHistory } from "./TeamMilestones";
import { MilestoneEditor } from "@/components/management/MilestoneManagement";
import { beerMilestones } from "@/constants/teamMilestones";
import type { TeamMilestonesSnapshot } from "@/services/teamMilestonesService";

const snapshot: TeamMilestonesSnapshot = { season:2026, validAttempts:262, teamTimeHundredths:2610, playerCount:10 };
describe("team milestone cards and editorial content", () => {
  it("reuses the same current artwork and progression for the overview beer card", () => {
    const html = renderToStaticMarkup(<BeerMilestoneProgress validAttempts={262} scope="Saison 2026"
      content={{ "beer-dowdeswell-51-1": { infoText: null, imageUrl: "https://example.com/current.webp" } }} />);
    expect(html).toContain("52,4 L");
    expect(html).toContain("Saison 2026");
    expect(html).toContain("https://example.com/current.webp");
    expect(html).toContain("Noch 7,6 L");
    expect(html).not.toContain("Top-10-Teamzeit");
  });
  it("renders matched solid progress bars without old hardcoded explanations", () => {
    const html = renderToStaticMarkup(<TeamMilestones snapshot={snapshot} />);
    for (const text of ["lg:grid-cols-2","52,4 L","26,10 s","15 %","78 %","Noch 7,6 L","Noch 0,14 s schneller","data-artwork-fallback","h-full bg-gold-300"]) expect(html).toContain(text);
    for (const text of ["10/10","Was bedeutet das?","Einordnung","data-interesting-fact","<img"]) expect(html).not.toContain(text);
  });
  it("uses server adjusted team values and unlocks partial teams", () => {
    const partial = {...snapshot, playerCount:1,teamTimeHundredths:4500};
    const html = renderToStaticMarkup(<TeamMilestones snapshot={partial} />);
    expect(html).toContain("45,00 s"); expect(html).not.toContain("1/10");
    expect(renderToStaticMarkup(<TeamMilestoneHistory snapshot={partial} />)).toContain('data-achieved-milestone="team-sand-47"');
    expect(renderToStaticMarkup(<TeamMilestones snapshot={{...snapshot,playerCount:0,teamTimeHundredths:5000}} />)).toContain("50,00 s");
  });
  it("uses optional CMS text/image in both current card and history, never catalogue trivia", () => {
    const content = {"beer-dowdeswell-51-1": {infoText:"Unser eigener Text",imageUrl:"https://example.com/art.webp"}};
    for (const html of [renderToStaticMarkup(<TeamMilestones snapshot={snapshot} content={content} />),renderToStaticMarkup(<TeamMilestoneHistory snapshot={snapshot} content={content} />)]) {
      expect(html).toContain("Unser eigener Text"); expect(html).toContain("https://example.com/art.webp"); expect(html).toContain("object-cover");
    }
    expect(renderToStaticMarkup(<TeamMilestones snapshot={snapshot} content={{"beer-dowdeswell-51-1":{infoText:" ",imageUrl:null}}} />)).not.toContain("Mehr zum Meilenstein");
  });
  it("separates histories and shows only evidenced date, player, event and improvement", () => {
    const value: TeamMilestonesSnapshot = {...snapshot,crossings:[{milestoneId:"team-sand-47",sourceType:"historical_attempt",sourceId:"history-1",occurredDate:"2026-01-01",occurredAt:null,eventId:null,eventName:null,playerId:"p",playerName:"Fixture player",timeHundredths:200,improvementHundredths:300}]};
    const html = renderToStaticMarkup(<TeamMilestoneHistory snapshot={value} />);
    expect(html.indexOf('data-history-kind="beer-volume"')).toBeLessThan(html.indexOf('data-history-kind="team-time"'));
    expect(html).toContain("Historischer Eintrag"); expect(html).toContain("Fixture player"); expect(html).toContain("Teamzeit verbessert um 3,00 s"); expect(html).not.toContain("Event:");
    expect(html).not.toContain("00:00");
  });
  it("automatically supports a catalogue item without a DB row in the admin", () => {
    const html = renderToStaticMarkup(<MilestoneEditor item={beerMilestones[0]} />);
    expect(html).toContain(beerMilestones[0].title); expect(html).toContain("data-artwork-fallback");
    expect(html).toContain("Infotext"); expect(html).toContain("Speichern");
  });
  it("retains explicit artwork overrides and final/empty states", () => {
    expect(renderToStaticMarkup(<TeamMilestones snapshot={snapshot} beerArtwork={<span>Artwork</span>} />)).toContain("Artwork");
    expect(renderToStaticMarkup(<TeamMilestones snapshot={{...snapshot,validAttempts:2000000,teamTimeHundredths:1800}} />)).toContain("Alle aktuellen Meilensteine erreicht");
    expect(renderToStaticMarkup(<TeamMilestoneHistory snapshot={{...snapshot,validAttempts:0,playerCount:0,teamTimeHundredths:5000}} />)).toContain("Noch keine Team-Meilensteine");
  });
});
