import { beforeEach, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import type { LiveAttempt } from "@/types/liveEvent";

// Component-state/callback unit harness; no browser/layout simulation.
const h = vi.hoisted(() => ({
  values: [] as unknown[], cursor: 0, deps: [] as (unknown[] | undefined)[],
  effects: [] as (() => void)[], effectCursor: 0,
  start: vi.fn(), updateAttempt: vi.fn(), updateEvent: vi.fn(),
  events: [{ id: "e", name: "Event", date: "2026-10-16", beerBrand: "Flensburger Pilsener", participantIds: ["p"] }],
}));
vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = h.cursor++;
    if (!(index in h.values)) h.values[index] = initial;
    return [h.values[index], (next: unknown) => {
      h.values[index] = typeof next === "function" ? next(h.values[index]) : next;
    }];
  },
  useMemo: (factory: () => unknown) => factory(),
  useEffect: (effect: () => void, deps: unknown[]) => {
    const index = h.effectCursor++;
    if (!h.deps[index] || deps.some((value, i) => value !== h.deps[index]?.[i])) {
      h.deps[index] = deps; h.effects.push(effect);
    }
  },
}));
vi.mock("@/hooks/useLiveEvent", () => ({
  useLiveEvent: () => ({
    state: { events: h.events, players: [] }, startEvent: h.start, startingEvent: false,
    updateAttempt: h.updateAttempt, updateEvent: h.updateEvent, deleteAttempt: vi.fn(),
  }),
}));
import { AttemptEditDialog } from "./AttemptEditDialog";
import { EventManagement } from "./EventManagement";
import { StartEventPanel } from "@/components/events/StartEventPanel";
type Props = { children?: ReactNode; placeholder?: string; maxLength?: number; value?: string;
  onChange?: (event: { target: { value: string } }) => void; onClick?: () => void };
function nodes(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...nodes(node.props.children)];
}
function render(component: () => ReactNode) {
  h.cursor = 0; h.effectCursor = 0;
  const result = nodes(component());
  h.effects.splice(0).forEach(effect => effect());
  return result;
}
const beer = (tree: ReactElement<Props>[]) => tree.find(node => node.props.placeholder === "z. B. Flensburger Pilsener")!;
const clickSave = (tree: ReactElement<Props>[]) => tree.find(node =>
  Array.isArray(node.props.children) && node.props.children.some(child => typeof child === "string" && /Speichern|Event speichern/.test(child)),
)!.props.onClick!();
const attempt: LiveAttempt = { id: "a", playerId: "p", eventId: "e", result: "time", timeSeconds: 2.5,
  date: "2026-10-16", submittedAt: "2026-10-16T12:00:00Z", outOfCompetition: false, beerBrand: "Flensburger Pilsener" };
beforeEach(() => {
  h.values = []; h.cursor = 0; h.deps = []; h.effects = []; h.effectCursor = 0;
  vi.clearAllMocks(); h.updateAttempt.mockResolvedValue(true); h.updateEvent.mockResolvedValue(true);
});
it("loads the attempt snapshot, limits its length, saves a trimmed override or NULL", () => {
  const component = () => AttemptEditDialog({ attempt, onClose: vi.fn() });
  render(component);
  let tree = render(component);
  expect(beer(tree).props.value).toBe("Flensburger Pilsener");
  expect(beer(tree).props.maxLength).toBe(80);
  beer(tree).props.onChange!({ target: { value: "  Astra Urtyp  " } });
  clickSave(render(component));
  expect(h.updateAttempt).toHaveBeenLastCalledWith("a", expect.objectContaining({ beerBrand: "Astra Urtyp" }));
  tree = render(component);
  beer(tree).props.onChange!({ target: { value: "   " } });
  clickSave(render(component));
  expect(h.updateAttempt).toHaveBeenLastCalledWith("a", expect.objectContaining({ beerBrand: null }));
});
it("loads and edits only the event standard beer", () => {
  render(EventManagement);
  let tree = render(EventManagement);
  expect(beer(tree).props.value).toBe("Flensburger Pilsener");
  expect(beer(tree).props.maxLength).toBe(80);
  beer(tree).props.onChange!({ target: { value: " Astra Urtyp " } });
  clickSave(render(EventManagement));
  expect(h.updateEvent).toHaveBeenLastCalledWith("e", expect.objectContaining({ beerBrand: "Astra Urtyp" }));
  tree = render(EventManagement);
  beer(tree).props.onChange!({ target: { value: "" } });
  clickSave(render(EventManagement));
  expect(h.updateEvent).toHaveBeenLastCalledWith("e", expect.objectContaining({ beerBrand: null }));
  expect(h.updateAttempt).not.toHaveBeenCalled();
});
it("offers an empty optional beer field with an 80-character limit at start", () => {
  const tree = render(() => StartEventPanel({ candidates: [], onStarted: vi.fn() }));
  expect(beer(tree).props.value).toBe("");
  expect(beer(tree).props.maxLength).toBe(80);
});
it("does not pretend to edit beer on legacy standalone attempts", () => {
  const tree = render(() => AttemptEditDialog({ attempt: { ...attempt, eventId: undefined }, onClose: vi.fn() }));
  expect(beer(tree)).toBeUndefined();
});
