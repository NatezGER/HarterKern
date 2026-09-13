import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Header } from "@/layouts/Header";
import { needsExactNavigationMatch } from "@/lib/navigation";

vi.mock("@/components/common/SeasonSelector", () => ({
  SeasonSelector: () => <span>Saison</span>,
}));

function navLink(markup: string, href: string) {
  const match = markup.match(new RegExp(`<a[^>]*href="${href}"[^>]*>`));
  expect(match?.[0]).toBeDefined();
  return match?.[0] ?? "";
}

describe("main navigation active state", () => {
  it("marks only Live on the canonical live route", () => {
    const markup = render("/events/live");
    expect(navLink(markup, "/events/live")).toContain('aria-current="page"');
    expect(navLink(markup, "/events/live")).toContain("season-nav-active");
    expect(navLink(markup, "/events")).not.toContain('aria-current="page"');
    expect(navLink(markup, "/events")).not.toContain("season-nav-active");
  });

  it("marks only Events on the event archive route", () => {
    const markup = render("/events");
    expect(navLink(markup, "/events")).toContain('aria-current="page"');
    expect(navLink(markup, "/events")).toContain("season-nav-active");
    expect(navLink(markup, "/events/live")).not.toContain('aria-current="page"');
  });

  it("keeps event details under Events and live descendants under Live", () => {
    const detailMarkup = render("/events/event-1/results");
    expect(navLink(detailMarkup, "/events")).toContain('aria-current="page"');

    const liveMarkup = render("/events/live/entry");
    expect(navLink(liveMarkup, "/events/live")).toContain('aria-current="page"');
    expect(navLink(liveMarkup, "/events")).not.toContain('aria-current="page"');
    expect(needsExactNavigationMatch("/events", "/events/event-1")).toBe(false);
  });
});

function render(pathname: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[pathname]}><Header /></MemoryRouter>,
  );
}
