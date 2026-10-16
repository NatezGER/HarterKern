import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ParticipantCard } from "./ParticipantCard";
import type { LiveStanding } from "@/types/liveEvent";
vi.mock("react-router-dom", () => ({ Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }));
const standing: LiveStanding = { player: { id: "p", name: "Langer Spielername",
  kind: "permanent", initials: "P", avatarGradient: "", avatarUrl: null, personalBest: 2, isAk: false },
  rank: 1, bestTime: 3, averageTime: 3, attempts: 4, validAttempts: 4 };
const sweetSpot = { attemptNumber: 5, averageHundredths: 236, samples: 1, nextAttemptNumber: 5 };
const render = (props = {}) => renderToStaticMarkup(<ParticipantCard standing={standing} saved={false} onAdd={() => {}} {...props} />);
describe("participant context slot", () => {
  it("renders incoming Sweet Spot and retains the first-attempt benchmark", () => {
    expect(render({ sweetSpot })).toContain("🔥 Sweet Spot incoming · #5 · Ø 2,36 s");
    expect(render({ firstAttemptBenchmark: 247 })).toContain("Bester 1. Versuch bisher: 2,47 s");
  });
  it("prioritizes Sweet Spot #1 over the benchmark, then falls back to benchmark or empty", () => {
    const both = render({ standing: { ...standing, attempts: 0, validAttempts: 0 },
      sweetSpot: { ...sweetSpot, attemptNumber: 1, nextAttemptNumber: 1 }, firstAttemptBenchmark: 247 });
    expect(both.match(/data-participant-context/g)).toHaveLength(1);
    expect(both).toMatch(/<p data-participant-context[^>]*>🔥 Sweet Spot incoming · #1 · Ø 2,36 s<\/p>/);
    expect(both).not.toContain("Bester 1. Versuch bisher");
    expect(render({ sweetSpot: null, firstAttemptBenchmark: 247 })).toMatch(/<p data-participant-context[^>]*>Bester 1. Versuch bisher: 2,47 s<\/p>/);
    expect(render({ sweetSpot: null, firstAttemptBenchmark: null })).toMatch(/<p data-participant-context[^>]*><\/p>/);
  });
  it("keeps long names and even an integer-limit ordinal in bounded single-line slots", () => {
    const html = render({ standing: { ...standing, player: { ...standing.player, name: "L".repeat(80) } },
      sweetSpot: { ...sweetSpot, attemptNumber: 2147483647, nextAttemptNumber: 2147483647 } });
    expect(html).toMatch(/<article class="panel relative flex min-h-36 min-w-0 flex-col p-3 /);
    expect(html).toContain('class="w-full truncate font-display text-lg font-black uppercase"');
    expect(html).toContain("absolute inset-x-3 bottom-1 h-3 truncate");
    expect(html).toContain("leading-3");
    expect(html).toContain("#2147483647");
    expect(html).not.toContain("<br");
  });
  it("has the same one absolute fixed-height slot in empty, benchmark and Sweet Spot states", () => {
    const all = [render(), render({ sweetSpot }), render({ firstAttemptBenchmark: 247 })];
    for (const html of all) {
      expect(html.match(/data-participant-context/g)).toHaveLength(1);
      expect(html).toContain("absolute inset-x-3 bottom-1 h-3 truncate");
      expect(html).toContain("min-h-36");
      expect(html).toContain("min-h-28");
      expect(html).toContain("size-16");
      expect(html).toContain("text-lg");
    }
    expect(all.map(html => html.match(/<article class="([^"]+)"/)?.[1])).toEqual(Array(3).fill(all[0].match(/<article class="([^"]+)"/)?.[1]));
    expect(render()).not.toContain("Sweet Spot incoming");
  });
  it("does not show a personal context for a guest or AK player", () => {
    for (const player of [{ ...standing.player, kind: "guest" as const }, { ...standing.player, isAk: true }]) {
      expect(render({ standing: { ...standing, player }, sweetSpot, firstAttemptBenchmark: 247 })).not.toContain("Sweet Spot incoming");
    }
  });
});
