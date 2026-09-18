import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useManagementMode", () => ({
  useManagementMode: () => ({ unlocked: true }),
}));

import { DkToolsPage } from "@/pages/DkToolsPage";

describe("permanent Denmark tools context", () => {
  it("renders the championship hero and keeps configuration and LOD controls", () => {
    const markup = renderToStaticMarkup(<DkToolsPage />);
    expect(markup).toContain('data-denmark-context="tools"');
    expect(markup).toContain('data-event-theme="denmark"');
    expect(markup).toContain("Harter Kern · Dänemark");
    expect(markup).toContain("Auslosung starten");
    expect(markup).toContain("Last One Drinkin’ 2026");
    expect(markup).toContain("Scoreboards &amp; Gesamtstand");
    expect(markup).toContain('id="lod-hole-1"');
    expect(markup).toContain('id="lod-finale"');
  });
});
