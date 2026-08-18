import { createRef, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LiveEventHeader } from "@/components/events/LiveEventHeader";
import { StartEventPanel } from "@/components/events/StartEventPanel";
import { DnfConfirmationDialog } from "@/components/events/TimeEntrySheet";
import { Button } from "@/components/ui/button";
import { claimAttemptSave } from "@/lib/attemptSaveGuard";

vi.mock("@/hooks/useElapsedTime", () => ({ useElapsedTime: () => "01:23:45" }));
vi.mock("@/hooks/useLiveEvent", () => ({
  useLiveEvent: () => ({ startEvent: vi.fn(), startingEvent: false, submitAttempt: vi.fn() }),
}));

describe("live mobile safety", () => {
  it("keeps the live header compact and free of the end-event action", () => {
    const markup = renderToStaticMarkup(<LiveEventHeader event={{
      id: "event-1", name: "Freitag", date: "2026-08-18", startedAt: "2026-08-18T18:00:00Z",
      endsAt: "2026-08-19T18:00:00Z", createdBy: "admin-1",
      participantIds: ["player-1"], status: "active", awardsTrophies: false,
    }} attempts={4} />);
    expect(markup).toContain("Freitag");
    expect(markup).toContain("4 Eventversuche insgesamt");
    expect(markup).toContain("p-4 sm:p-9");
    expect(markup).not.toContain("Event beenden");
  });

  it("gives the native date input a shrinkable responsive container", () => {
    const markup = renderToStaticMarkup(<StartEventPanel candidates={[]} onStarted={vi.fn()} />);
    expect(markup).toMatch(/type="date"[^>]*class="[^"]*min-w-0[^"]*max-w-full/);
  });

  it("requires explicit DNF confirmation and wires cancel separately", () => {
    const cancel = vi.fn();
    const confirm = vi.fn();
    const dialog = DnfConfirmationDialog({ open: true, saving: false, onCancel: cancel, onConfirm: confirm });
    const buttons = findButtons(dialog);
    expect(renderToStaticMarkup(dialog)).toContain("Wirklich DNF eintragen?");
    expect(buttons).toHaveLength(2);
    buttons[0].props.onClick();
    expect(cancel).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
    buttons[1].props.onClick();
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("prevents a second submit while a save is already claimed", () => {
    const savingRef = createRef<boolean>() as { current: boolean };
    savingRef.current = false;
    expect(claimAttemptSave(savingRef)).toBe(true);
    expect(claimAttemptSave(savingRef)).toBe(false);
  });

  it("disables both DNF confirmation actions while saving", () => {
    const buttons = findButtons(DnfConfirmationDialog({
      open: true, saving: true, onCancel: vi.fn(), onConfirm: vi.fn(),
    }));
    expect(buttons.every(({ props }) => props.disabled)).toBe(true);
  });
});

function findButtons(node: ReactNode): ReactElement<{ disabled?: boolean; onClick: () => void }>[] {
  if (!node || typeof node !== "object" || !("type" in node)) return [];
  const element = node as ReactElement<{ children?: ReactNode }>;
  const own = element.type === Button ? [element as ReactElement<{ disabled?: boolean; onClick: () => void }>] : [];
  const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children];
  return [...own, ...children.flatMap(findButtons)];
}
