import type { StatisticMetricDefinition } from "./statMetricRegistry";

// Performance-only meanings. Shared Compare/Badge/Rivalry keys remain unchanged.
export const performanceEventMetrics: StatisticMetricDefinition[] = [
  {
    key: "performance-rivalry-events", title: "Rivalry-Paarungen", format: "count", direction: "desc",
    minimumSample: 1, group: "event", scopes: ["all-time", "season"],
    description: "Qualifizierte Rivalry-Paarungen in abgeschlossenen Events",
    info: "Mindestens drei direkte Takeovers einer kanonischen Paarung. Jeder qualifizierte Gegner zählt pro Event separat.",
  },
  {
    key: "performance-chaos-takeovers", title: "Chaos-Magnet – Takeovers", format: "count", direction: "desc",
    minimumSample: 1, group: "event", scopes: ["all-time", "season"],
    description: "Aktive paarweise Überholungen auf allen Tabellenplätzen",
    info: "Nur abgeschlossene Events im kanonischen Leadership-Fenster ab der zweiten gültigen Zeit, einschließlich Gästen. Keine Mindestteilnehmerzahl. Punkte gibt es nur zwischen regulären Spielern mit vorheriger PB: strikt von dahinter nach davor. Erstplatzierung, Gleichstand und bloßes Auflösen eines Gleichstands zählen nicht. Jeder überholte Gegner zählt einmal pro Versuch.",
  },
];
