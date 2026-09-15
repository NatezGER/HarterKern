import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlayerOverlaySelector } from "@/components/progression/PlayerOverlaySelector";
import { toggleOverlayPlayer } from "@/lib/playerOverlaySelection";

const options = [
  { id: "anna", name: "Anna" }, { id: "paul", name: "Paul" },
  { id: "fipsi", name: "Fipsi" },
];

describe("player overlay selection", () => {
  it("adds one and multiple players in canonical option order", () => {
    expect(toggleOverlayPlayer(options, [], "paul")).toEqual(["paul"]);
    expect(toggleOverlayPlayer(options, ["paul"], "anna")).toEqual(["anna", "paul"]);
  });

  it("removes a selected player and honors the selection limit", () => {
    expect(toggleOverlayPlayer(options, ["anna", "paul"], "anna")).toEqual(["paul"]);
    expect(toggleOverlayPlayer(options, ["anna"], "paul", 1)).toEqual(["anna"]);
  });

  it("renders a compact mobile-first selector without selecting everyone", () => {
    const markup = renderToStaticMarkup(<PlayerOverlaySelector options={options}
      selectedIds={[]} onChange={() => undefined} />);
    expect(markup).toContain("Linien anzeigen");
    expect(markup).toContain("max-w-full");
    expect(markup).not.toContain('checked=""');
  });
});
