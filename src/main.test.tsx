import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ render: vi.fn() }));

vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: mocks.render }),
}));
vi.mock("@/App", () => ({ router: { routes: [] } }));

describe("router navigation scheduling", () => {
  it("commits route changes synchronously instead of leaving the previous outlet visible", async () => {
    vi.stubGlobal("document", { getElementById: () => ({}) });

    await import("@/main");

    const strictMode = mocks.render.mock.calls[0]?.[0] as ReactElement<{
      children: ReactElement<{ useTransitions?: boolean }>;
    }>;
    expect(strictMode.props.children.props.useTransitions).toBe(false);
  });
});
