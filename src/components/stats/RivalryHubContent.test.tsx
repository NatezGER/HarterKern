import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RivalryHubContent } from "@/components/stats/RivalryHubContent";
import { hubFixture, pairFixture } from "./rivalryHubTestFixtures";
import type { RivalryHubV2 } from "@/types/rivalryHub";
const render = (data: RivalryHubV2) => renderToStaticMarkup(<MemoryRouter><RivalryHubContent data={data} /></MemoryRouter>);
describe("RivalryHubContent", () => {
  it("shows every rivalry, spotlight, explanations and compare navigation", () => {
    const markup = render(hubFixture(Array.from({ length: 7 }, (_, i) => pairFixture(i))));
    for (let i = 0; i < 7; i++) expect(markup).toContain(`Alpha ${i} ↔ Beta ${i}`);
    for (const label of ["Rivalry Spotlight", "Echte Rivalries", "All-Time", "RIVALRY",
      "Was bedeutet Intensity?", "Was bedeutet Rivalry Score?", "H2H A:B"]) expect(markup).toContain(label);
    expect(markup).toContain("/compare?playerA=a-6&amp;playerB=b-6");
    expect(markup).toContain('aria-label="Profilbild von Alpha 6"');
    expect(markup).toContain('aria-label="Profilbild von Beta 6"');
    expect(markup).not.toContain("Tage");
  });
  it("retains sub-threshold duels without duplicating formal pairs in the duel section", () => {
    const markup = render(hubFixture([pairFixture(), pairFixture(6, {
      rivalryStatusAllTime: false, formalRivalryInScope: false, duelOnly: true,
      rivalryEvents: 0, rivalryLength: 0, totalDirectTakeovers: 2,
    })]));
    const duels = markup.split('aria-labelledby="direct-duels"')[1].split("</section>")[0];
    expect(duels).toContain("Alpha 6 ↔ Beta 6");
    expect(duels).toContain("DUELL");
    expect(duels).toContain("Noch kein Rivalry-Event");
    expect(duels).not.toContain("Alpha 0 ↔ Beta 0");
  });
  it("prefers an in-scope formal pair to stronger history and keeps season history explicit", () => {
    const historical = pairFixture(1, { historicalRivalry: true, formalRivalryInScope: false,
      rivalryLength: 0, rivalryEvents: 0, rivalryScore: 400, firstRivalryEventDateScope: null });
    const markup = render(hubFixture([historical, pairFixture(2)], 2027));
    const spotlight = markup.split("</section>")[0];
    expect(spotlight).toContain("Alpha 2 ↔ Beta 2");
    expect(spotlight).not.toContain("Alpha 1 ↔ Beta 1");
    expect(markup).toContain("Saison 2027");
    expect(markup).toContain("Historisch etablierte Rivalry");
    expect(markup).toContain("kein Rivalry-Event im gewählten Scope");
  });
  it("uses labelled historical fallback and preserves NULL/uncapped intensity", () => {
    const markup = render(hubFixture([pairFixture(1, { historicalRivalry: true,
      formalRivalryInScope: false, rivalryLength: 0, comparableH2hEvents: 0, intensityPercent: null }),
      pairFixture(2, { historicalRivalry: true, formalRivalryInScope: false, intensityPercent: 200 })], 2027));
    expect(markup.split("</section>")[0]).toContain("Historisch etablierte Rivalry");
    expect(markup).toMatch(/Intensity<\/dt><dd[^>]*>—/);
    expect(markup).toContain("200 %");
  });
  it("shows honest empty states without manufacturing a spotlight", () => {
    const markup = render(hubFixture([]));
    expect(markup).toContain("Noch keine formale oder historische Rivalry");
    expect(markup).toContain("Keine qualifizierte Rivalry");
    expect(markup).toContain("Keine direkten Duelle");
  });
  it("never presents a zero-takeover ordinary pair as a duel", () => {
    const markup = render(hubFixture([pairFixture(9, { rivalryStatusAllTime: false,
      formalRivalryInScope: false, duelOnly: false, totalDirectTakeovers: 0, rivalryLength: 0 })]));
    expect(markup).not.toContain("Alpha 9 ↔ Beta 9");
    expect(markup).toContain("Keine direkten Duelle");
  });
});
