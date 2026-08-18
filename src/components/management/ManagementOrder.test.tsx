import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useManagementMode", () => ({
  useManagementMode: () => ({ unlocked: true, unlock: vi.fn(), lock: vi.fn() }),
}));
vi.mock("@/hooks/useLiveEvent", () => ({ useLiveEvent: () => ({ state: { attempts: [], players: [] } }) }));
vi.mock("@/components/management/AttemptEditDialog", () => ({ AttemptEditDialog: () => null }));
vi.mock("@/components/management/EventManagement", () => ({ EventManagement: () => <div>Event bearbeiten</div> }));
vi.mock("@/components/management/PlayerManagement", () => ({ PlayerManagement: () => <div>Spieler bearbeiten</div> }));
vi.mock("@/components/management/AwardAssetManagement", () => ({ AwardAssetManagement: () => <div>Award Graphics</div> }));
vi.mock("@/components/management/HistoricalAttemptManagement", () => ({
  HistoricalAttemptManagement: () => <div>Historisches Formular und Management</div>,
}));

import { HistoricalManagementDisclosure, ManagementPanel } from "@/components/management/ManagementPanel";

describe("management information order", () => {
  it("orders active administration before the collapsed historical area", () => {
    const markup = renderToStaticMarkup(<ManagementPanel />);
    const labels = ["Versuche verwalten", "Event bearbeiten", "Spieler bearbeiten", "Award Graphics", "Historische Versuche"];
    const positions = labels.map((label) => markup.indexOf(label));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("Historisches Formular und Management");
  });

  it("renders the existing historical management only when opened and remains closable", () => {
    const markup = renderToStaticMarkup(<HistoricalManagementDisclosure expanded onToggle={vi.fn()} />);
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("Historisches Formular und Management");
    expect(markup).toContain("Historische Verwaltung schließen");
  });
});
