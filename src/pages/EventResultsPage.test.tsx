import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useHistoryProfiles", () => ({
  useEventDetail: () => ({ data: { id: "event-1" }, loading: false, error: "" }),
}));
vi.mock("@/components/events/EventResults", () => ({
  EventResults: () => <div>Ergebnis</div>,
}));

import { EventResultsPage } from "@/pages/EventResultsPage";

describe("EventResultsPage navigation", () => {
  it("links back to the event overview", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/events/event-1"]}>
        <Routes><Route path="/events/:eventId" element={<EventResultsPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(markup).toContain('href="/events"');
    expect(markup).not.toContain("/stats#events");
  });
});
