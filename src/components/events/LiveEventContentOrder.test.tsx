import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveEventContentOrder } from "@/components/events/LiveEventContentOrder";

describe("LiveEventContentOrder", () => {
  it("keeps attempt entry directly below the leaderboard and omits a WR block", () => {
    const markup = renderToStaticMarkup(<LiveEventContentOrder
      leaderboard={<div>Live-Rangliste</div>}
      attemptEntry={<div>Versuch hinzufügen</div>}
      leadStory={<div>Live-Führungsstory</div>}
      participantManagement={<div>Teilnehmerverwaltung</div>}
      attemptHistory={<div>Versuchshistorie</div>}
    />);
    const labels = [
      "Live-Rangliste",
      "Versuch hinzufügen",
      "Live-Führungsstory",
      "Teilnehmerverwaltung",
      "Versuchshistorie",
    ];
    expect(labels.map((label) => markup.indexOf(label)))
      .toEqual([...labels.map((label) => markup.indexOf(label))].sort((a, b) => a - b));
    expect(markup).not.toContain("Offizieller Weltrekord");
  });
});
