import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PersonalBestDetailsToggle } from "@/components/progression/PersonalBestDetailsToggle";

describe("PersonalBestDetailsToggle", () => {
  it("starts with an accessible collapsed mobile state", () => {
    const markup = renderToStaticMarkup(<PersonalBestDetailsToggle expanded={false} controls="personal-best-history" onToggle={vi.fn()} />);
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="personal-best-history"');
    expect(markup).toContain("Einzelne Bestzeiten anzeigen");
  });

  it("renders the accessible close action after toggling", () => {
    const markup = renderToStaticMarkup(<PersonalBestDetailsToggle expanded controls="personal-best-history" onToggle={vi.fn()} />);
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("Einzelne Bestzeiten ausblenden");
  });
});
