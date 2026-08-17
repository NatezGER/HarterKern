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
  it("renders one responsive step curve from the complete central progression", () => {
    const markup = renderToStaticMarkup(
      <LiveLeadProgression
        attempts={attempts}
        eventStartedAt="2026-08-17T10:00:00.000Z"
      />,
    );
    expect(markup).toContain("data-live-lead-curve");
    expect(markup).toContain('data-lead-points="2"');
    expect(markup).toMatch(/d="M [^"]+ H [^"]+ V [^"]+ H 93"/);
    expect(markup.match(/data-live-lead-curve/g)).toHaveLength(1);
  });

  it("marks the latest real lead as current and exposes its details", () => {
    const markup = renderToStaticMarkup(
      <LiveLeadProgression
        attempts={attempts}
        eventStartedAt="2026-08-17T10:00:00.000Z"
        highlightAttemptId="current"
      />,
    );
    expect(markup).toContain("Aktueller Leader");
    expect(markup).toContain("Gast");
    expect(markup).toContain("Versuch 2");
    expect(markup).toContain("data-live-lead-detail");
  });
});
