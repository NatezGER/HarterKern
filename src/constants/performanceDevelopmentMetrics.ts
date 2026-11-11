import type { StatisticMetricDefinition } from "./statMetricRegistry";

const pb = " Historische All-Time-PB vor dem jeweiligen Versuch; keine Rücksetzung am Jahresanfang. Unklare Tagesfolgen werden ausgeschlossen.";
export const performanceDevelopmentMetrics: StatisticMetricDefinition[] = [
  { key: "performance-upward-spiral", title: "Aufwärtsspirale", group: "performance", format: "count", direction: "desc", minimumSample: 2,
    description: "Längste direkte Serie strikter Verbesserungen innerhalb eines Events",
    info: "Vier schnellere Zeiten in Folge ergeben drei Verbesserungen. Gleichstand, langsamere Zeit, DNF oder ungültige Zeit unterbrechen. Nur offizielle eigene Versuche; Eventgrenzen werden nie verbunden." },
  { key: "performance-downward-spiral", title: "Abwärtsspirale", group: "performance", format: "count", direction: "desc", minimumSample: 2,
    description: "Längste direkte Serie strikter Verschlechterungen · humoristische Negativwertung",
    info: "Gezählt werden Übergänge zu strikt langsameren Zeiten im selben Event. Gleichstand, schnellere Zeit, DNF oder ungültige Zeit unterbrechen; keine Verbindung über Eventgrenzen." },
  { key: "performance-plateau", title: "Persönliches Plateau", group: "performance", format: "count", direction: "desc", minimumSample: 2,
    description: "Noch laufende gültige Versuche seit der letzten strikten PB",
    info: "Identische PB zählt weiter, neue PB setzt auf null; nur positive Werte in der Rangliste. Saison: nur Versuche dieser Saison seit der letzten All-Time-PB bis Saisonende. Spätere PBs ändern alte Saisons nicht." + pb },
  { key: "performance-record-hunter", title: "Rekordjäger", group: "records", format: "count", direction: "desc", minimumSample: 2,
    description: "Längste abgeschlossene PB-Suche · belohnt Hartnäckigkeit",
    info: "Gültige Versuche zwischen zwei strikten All-Time-PBs: neue PB inklusive, Ausgangs-PB exklusive. DNF zählt nicht. Die abschließende PB bestimmt die Saison; laufende Jagden zählen nicht." + pb },
  { key: "performance-near-legend", title: "Beinahe-Legende", group: "records", format: "count", direction: "desc", minimumSample: 1,
    description: "0,01 bis einschließlich 0,10 Sekunden hinter der damals gültigen PB",
    info: "Identische Zeiten und neue PBs sind keine Treffer. Saisonfilter begrenzt Treffer, nicht die frühere Referenz-PB. Details zeigen maximal 20 jüngste Treffer." + pb },
].map(metric => ({ ...metric, scopes: ["all-time", "season"] })) as StatisticMetricDefinition[];
