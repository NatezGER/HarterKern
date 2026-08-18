import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router-dom", () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/history/HistoricalAttemptList", () => ({
  HistoricalAttemptList: () => <div>Einzelne historische Versuche</div>,
}));

import { HistoricalAttemptsDisclosure } from "@/components/history/HistoricalAttemptsDisclosure";

describe("HistoricalAttemptsDisclosure", () => {
  it("does not preview individual historical attempts initially", () => {
    const markup = renderToStaticMarkup(<HistoricalAttemptsDisclosure attempts={[]} expanded={false} onToggle={vi.fn()} />);
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Historische Versuche anzeigen");
    expect(markup).not.toContain("Einzelne historische Versuche");
  });

  it("shows the existing list after deliberate expansion", () => {
    const markup = renderToStaticMarkup(<HistoricalAttemptsDisclosure attempts={[]} expanded onToggle={vi.fn()} />);
    expect(markup).toContain("Einzelne historische Versuche");
    expect(markup).toContain("Historische Versuche ausblenden");
  });
});
