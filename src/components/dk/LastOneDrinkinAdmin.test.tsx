import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LastOneDrinkinAdmin } from "@/components/dk/LastOneDrinkinAdmin";

describe("Last One Drinkin Knife editor", () => {
  it("renders the mobile-friendly double-elimination controls without manual Knife points", () => {
    const markup = renderToStaticMarkup(<LastOneDrinkinAdmin />);
    expect(markup).toContain("Winner Bracket");
    expect(markup).toContain("Lower Bracket");
    expect(markup).toContain("Grand Final · kein Reset");
    expect(markup).toContain("Neu auslosen");
    expect(markup).not.toContain("manuelle Punkte");
    expect(markup).not.toContain("Punkte gemäß Turnierverlauf manuell eintragen");
  });
});

