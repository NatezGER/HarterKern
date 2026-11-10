import type { StatisticMetricDefinition } from "./statMetricRegistry";

// Performance-only meanings. Shared Compare/Badge/Rivalry keys remain unchanged.
export const performanceEventMetrics: StatisticMetricDefinition[] = [
  {
    key: "performance-endspurt", title: "Late Bloomer – Endspurt", format: "time-gain", direction: "desc",
    minimumSample: 2, group: "event", scopes: ["all-time", "season"],
    description: "Median des PB-Gewinns im letzten Viertel · mindestens zwei Events",
    info: "Ab fünf eigenen offiziellen Versuchen: Das letzte Viertel umfasst abgerundet n/4 Versuche. DNF zählt als Position. Vorher muss eine gültige PB vorliegen. Alle qualifizierenden Events zählen, auch mit 0,00 s Gewinn. Gleiche Mediane teilen den Rang; Erfolgsquote und Eventanzahl bestimmen nur die Reihenfolge.",
  },
  {
    key: "performance-rivalry-events", title: "Rivalry-Events", format: "count", direction: "desc",
    minimumSample: 1, group: "event", scopes: ["all-time", "season"],
    description: "Unterschiedliche abgeschlossene Events mit qualifizierter Rivalry",
    info: "Mindestens drei direkte Takeovers einer kanonischen Paarung. Mehrere qualifizierte Gegner im selben Event zählen für den Spieler zusammen als ein Event.",
  },
  {
    key: "performance-chaos-takeovers", title: "Chaos-Magnet – Takeovers", format: "count", direction: "desc",
    minimumSample: 1, group: "event", scopes: ["all-time", "season"],
    description: "Aktive paarweise Überholungen auf allen Tabellenplätzen",
    info: "Nur abgeschlossene Events im kanonischen Leadership-Fenster ab der ersten gültigen Zeit, einschließlich Gästen. Keine Mindestteilnehmerzahl. Punkte gibt es nur zwischen regulären Spielern mit vorheriger PB: strikt von dahinter nach davor. Erstplatzierung, Gleichstand und bloßes Auflösen eines Gleichstands zählen nicht. Jeder überholte Gegner zählt einmal pro Versuch.",
  },
];
