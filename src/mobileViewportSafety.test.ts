import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("mobile viewport safety", () => {
  it("lets the document shrink below 320px and constrains every root", () => {
    const css = source("./styles/globals.css");
    expect(css).not.toContain("min-width: 320px");
    expect(css).toMatch(/body\s*\{[^}]*min-width:\s*0/s);
    expect(css).toMatch(/#root\s*\{[^}]*min-width:\s*0/s);
    expect(css).toContain("overflow-x: clip");
  });

  it("enables iOS safe-area layout for the shell and dialogs", () => {
    const html = source("../index.html");
    const css = source("./styles/globals.css");
    const layout = source("./layouts/AppLayout.tsx");
    const modal = source("./components/events/EventModal.tsx");
    expect(html).toContain("viewport-fit=cover");
    expect(css).toContain("env(safe-area-inset-left)");
    expect(css).toContain("env(safe-area-inset-right)");
    expect(layout).toContain("viewport-gutter");
    expect(modal).toContain("safe-dialog-gutter");
    expect(modal).toContain("min-w-0 max-w-full");
  });

  it("keeps the compact DK editor inside its card and tables intentional", () => {
    const dk = source("./components/dk/LastOneDrinkinAdmin.tsx");
    expect(dk).toContain("grid-cols-[minmax(0,1fr)_3.25rem_2.5rem_3.5rem_1.5rem]");
    expect(dk).not.toContain("sticky top-20 z-30 -mx-2");
    expect(dk).toMatch(/overflow-x-auto[^\n]*<table|overflow-x-auto[^\n]*table/s);
  });
});
