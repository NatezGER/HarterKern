import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PlayerRivalries } from "@/components/players/PlayerRivalries";

describe("PlayerRivalries", () => {
  it("shows opponent, rivalry events and direct takeovers", () => {
    const markup = renderToStaticMarkup(<MemoryRouter><PlayerRivalries playerId="a" loading={false} error="" data={[{ rivalPlayerId: "b", rivalName: "Lars", rivalAvatarUrl: null, rivalryEvents: 3, directTakeovers: 7, firstRivalryDate: "2026-01-01", lastRivalryDate: "2026-08-01" }]} /></MemoryRouter>);
    expect(markup).toContain("Lars"); expect(markup).toContain("3 Rivalitäts-Events"); expect(markup).toContain("7 direkte Wechsel");
    expect(markup).toContain('href="/compare?playerA=a&amp;playerB=b"');
    expect(markup).toContain('aria-label="Lars im Player Compare vergleichen"');
  });
  it("has a clean empty state", () => {
    expect(renderToStaticMarkup(<MemoryRouter><PlayerRivalries playerId="a" loading={false} error="" data={[]} /></MemoryRouter>)).toContain("Noch kein abgeschlossenes Rivalitäts-Event");
  });
});
