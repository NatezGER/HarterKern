import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveLeadProgression } from "@/components/events/LiveLeadProgression";
import type { EventLeadAttempt } from "@/lib/eventLeadProgression";

const attempts: EventLeadAttempt[] = [
  {
    id: "first",
    playerId: "paul",
    guestId: null,
    name: "Paul",
    avatarUrl: null,
    timeHundredths: 530,
    isDnf: false,
    isAk: false,
    submittedAt: "2026-08-17T10:05:00.000Z",
    attemptNumber: 1,
  },
  {
    id: "slow",
    playerId: "mats",
    guestId: null,
    name: "Mats",
    avatarUrl: null,
    timeHundredths: 600,
    isDnf: false,
    isAk: false,
    submittedAt: "2026-08-17T10:10:00.000Z",
    attemptNumber: 1,
  },
  {
    id: "current",
    playerId: null,
    guestId: "guest",
    name: "Gast",
    avatarUrl: null,
    timeHundredths: 230,
    isDnf: false,
    isAk: false,
    submittedAt: "2026-08-17T10:20:00.000Z",
    attemptNumber: 2,
  },
];

describe("LiveLeadProgression", () => {
  it("renders the complete compact lead list without the large curve", () => {
    const markup = renderToStaticMarkup(
      <LiveLeadProgression attempts={attempts} />,
    );
    expect(markup).toContain("data-live-lead-list");
    expect(markup).toContain('data-lead-points="2"');
    expect(markup).not.toContain("data-live-lead-curve");
    expect(markup).toContain("Paul");
    expect(markup).toContain("Gast");
  });

  it("marks the latest real lead as current and exposes its details", () => {
    const markup = renderToStaticMarkup(
      <LiveLeadProgression
        attempts={attempts}
        highlightAttemptId="current"
      />,
    );
    expect(markup).toContain("Aktueller Leader");
    expect(markup).toContain("Gast");
    expect(markup).toContain("Versuch 2");
    expect(markup).toContain("Aktuell");
  });
});
