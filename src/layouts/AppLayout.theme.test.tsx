import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const themeState = vi.hoisted(() => ({
  activeEvent: null as null | { awardsTrophies: boolean; trophyCompetitionKey: string },
  page: "dashboard",
}));

vi.mock("@/hooks/useSeason", () => ({
  useSeason: () => ({ season: "all-time" }),
  SeasonProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/hooks/useLiveEvent", () => ({
  useLiveEvent: () => ({ activeEvent: themeState.activeEvent }),
  LiveEventProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-router-dom")>(),
  Outlet: () => <div data-page={themeState.page} />,
  ScrollRestoration: () => null,
}));
vi.mock("@/layouts/Header", () => ({ Header: () => <header className="app-header">Navigation</header> }));
vi.mock("@/layouts/Footer", () => ({ Footer: () => <footer>Footer</footer> }));
vi.mock("@/components/events/LiveEventBanner", () => ({ LiveEventBanner: () => <aside className="denmark-live-banner">Dänemark live</aside> }));
vi.mock("@/components/common/SyncStatusNotice", () => ({ SyncStatusNotice: () => null }));
vi.mock("@/components/events/RecordCelebration", () => ({ RecordCelebration: () => null }));
vi.mock("@/components/events/BadgeUnlockCelebration", () => ({ BadgeUnlockCelebration: () => null }));
vi.mock("@/components/events/PostAttemptResult", () => ({ PostAttemptResult: () => null }));
vi.mock("@/components/events/SnapEndingCelebration", () => ({ SnapEndingCelebration: () => null }));

import { AppFrame } from "@/layouts/AppLayout";

describe("global Denmark live theme", () => {
  it.each(["dashboard", "hall-of-fame", "player-profile", "stats", "events", "live", "settings"])(
    "places %s inside the Denmark shell when the active event qualifies",
    (page) => {
      themeState.page = page;
      themeState.activeEvent = { awardsTrophies: true, trophyCompetitionKey: "denmark" };
      const markup = renderToStaticMarkup(<AppFrame />);
      expect(markup).toContain('data-event-theme="denmark"');
      expect(markup).toContain(`data-page="${page}"`);
      expect(markup).toContain('class="app-header"');
      expect(markup).toContain('class="denmark-live-banner"');
    },
  );

  it("keeps the normal shell for another active event", () => {
    themeState.activeEvent = { awardsTrophies: true, trophyCompetitionKey: "other" };
    expect(renderToStaticMarkup(<AppFrame />)).toContain('data-event-theme="default"');
  });

  it("returns to the normal shell after the event ends", () => {
    themeState.activeEvent = null;
    expect(renderToStaticMarkup(<AppFrame />)).toContain('data-event-theme="default"');
  });
});
