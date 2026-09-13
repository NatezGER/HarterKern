import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveEventContentOrder } from "@/components/events/LiveEventContentOrder";

describe("LiveEventContentOrder", () => {
  it("prioritizes attempt entry before leaderboard and Trophy stats", () => {
    const markup = renderToStaticMarkup(<LiveEventContentOrder
      leaderboard={<div>Live-Rangliste</div>}
      specialStats={<div>Trophy-Special-Stats</div>}
      attemptEntry={<div>Versuch hinzufügen</div>}
      leadStory={<div>Live-Führungsstory</div>}
      participantManagement={<div>Teilnehmerverwaltung</div>}
      attemptHistory={<div>Versuchshistorie</div>}
      endAction={<div>Event beenden</div>}
    />);
    const labels = [
      "Versuch hinzufügen",
      "Live-Rangliste",
      "Trophy-Special-Stats",
      "Live-Führungsstory",
      "Teilnehmerverwaltung",
      "Versuchshistorie",
      "Event beenden",
    ];
    expect(labels.map((label) => markup.indexOf(label)))
      .toEqual([...labels.map((label) => markup.indexOf(label))].sort((a, b) => a - b));
    expect(markup).not.toContain("Offizieller Weltrekord");
  });

  it("also prioritizes attempt entry for a normal live event", () => {
    const markup = renderToStaticMarkup(<LiveEventContentOrder
      leaderboard={<div>Live-Rangliste</div>}
      attemptEntry={<div>Versuch hinzufügen</div>}
      leadStory={<div>Live-Führungsstory</div>}
      participantManagement={<div>Teilnehmerverwaltung</div>}
      attemptHistory={<div>Versuchshistorie</div>}
      endAction={<div>Event beenden</div>}
    />);
    expect(markup.indexOf("Versuch hinzufügen"))
      .toBeLessThan(markup.indexOf("Live-Rangliste"));
    expect(markup).not.toContain("Trophy-Special-Stats");
  });
});
