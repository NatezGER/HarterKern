import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveEventContentOrder } from "@/components/events/LiveEventContentOrder";

describe("LiveEventContentOrder", () => {
  it("prioritizes entry, event header, leaderboard, and Trophy stats in that order", () => {
    const markup = renderToStaticMarkup(<LiveEventContentOrder
      eventHeader={<div>Eventkopf / Live-Status</div>}
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
      "Eventkopf / Live-Status",
      "Live-Rangliste",
      "Trophy-Special-Stats",
      "Live-Führungsstory",
      "Teilnehmerverwaltung",
      "Versuchshistorie",
      "Event beenden",
    ];
    expect(labels.map((label) => markup.indexOf(label)))
      .toEqual([...labels.map((label) => markup.indexOf(label))].sort((a, b) => a - b));
    expect(markup.match(/Versuch hinzufügen/g)).toHaveLength(1);
  });

  it("keeps the same entry-first order for a normal live event", () => {
    const markup = renderToStaticMarkup(<LiveEventContentOrder
      eventHeader={<div>Eventkopf / Live-Status</div>}
      leaderboard={<div>Live-Rangliste</div>}
      attemptEntry={<div>Versuch hinzufügen</div>}
      leadStory={<div>Live-Führungsstory</div>}
      participantManagement={<div>Teilnehmerverwaltung</div>}
      attemptHistory={<div>Versuchshistorie</div>}
      endAction={<div>Event beenden</div>}
    />);
    expect(markup.indexOf("Versuch hinzufügen"))
      .toBeLessThan(markup.indexOf("Eventkopf / Live-Status"));
    expect(markup.indexOf("Eventkopf / Live-Status"))
      .toBeLessThan(markup.indexOf("Live-Rangliste"));
    expect(markup.match(/Versuch hinzufügen/g)).toHaveLength(1);
    expect(markup).not.toContain("Trophy-Special-Stats");
  });
});
