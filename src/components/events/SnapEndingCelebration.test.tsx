import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const liveEventMock = vi.hoisted(() => ({
  value: {
    snapEndingCelebration: null as null | {
      attemptId: string;
      playerName: string;
      time: number;
    },
    dismissSnapEndingCelebration: vi.fn(),
  },
}));

vi.mock("@/hooks/useLiveEvent", () => ({
  useLiveEvent: () => liveEventMock.value,
}));

vi.mock("framer-motion", () => ({
  motion: {
    aside: ({ children }: React.ComponentProps<"aside">) => <aside>{children}</aside>,
    div: ({ children }: React.ComponentProps<"div">) => <div>{children}</div>,
  },
  useReducedMotion: () => true,
}));

import { SnapEndingCelebration } from "@/components/events/SnapEndingCelebration";

describe("SnapEndingCelebration", () => {
  beforeEach(() => {
    liveEventMock.value.snapEndingCelebration = null;
  });

  it("stays absent without a qualifying saved attempt", () => {
    expect(renderToStaticMarkup(<SnapEndingCelebration />)).toBe("");
  });

  it("shows the player and exact Schnapszahl before later result surfaces", () => {
    liveEventMock.value.snapEndingCelebration = {
      attemptId: "attempt-333",
      playerName: "Paul",
      time: 3.33,
    };
    const markup = renderToStaticMarkup(<SnapEndingCelebration />);
    expect(markup).toContain("Schnapszahl!");
    expect(markup).toContain("Paul");
    expect(markup).toContain("3,33 s");
    expect(markup).toContain("Prost &amp; weiter");
  });
});
