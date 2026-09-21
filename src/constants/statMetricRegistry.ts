import type { CompareBlockKey, MetricFormat, MetricGroup, StatisticScope } from "@/types/statDashboard";

export interface StatisticMetricDefinition {
  key: string;
  title: string;
  description: string;
  info?: string;
  format: MetricFormat;
  overallFormat?: MetricFormat;
  direction: "asc" | "desc";
  minimumSample: number;
  compareMinimumSample?: number;
  group: MetricGroup;
  scopes: StatisticScope[];
  compareBlock?: CompareBlockKey;
  scoreable?: boolean;
  contextOnly?: boolean;
  compact?: boolean;
}

const all = ["all-time", "season", "special-event"] as StatisticScope[];
const career = ["all-time", "season"] as StatisticScope[];
const allTime = ["all-time"] as StatisticScope[];

export const statisticMetricRegistry: StatisticMetricDefinition[] = [
  { key: "fastest", title: "Schnellste Zeit", description: "Persönliche Bestzeiten", format: "time", direction: "asc", minimumSample: 1, group: "performance", scopes: all, compareBlock: "speed", scoreable: true },
  { key: "average", title: "Bester Durchschnitt", description: "Mindestens 3 gültige Eventversuche", format: "time", direction: "asc", minimumSample: 3, group: "performance", scopes: all, compareBlock: "speed", scoreable: true },
  { key: "median", title: "Bester Median", description: "Mindestens 3 gültige Zeiten", format: "time", direction: "asc", minimumSample: 3, group: "performance", scopes: all, compareBlock: "speed", scoreable: true },
  { key: "fastest-five", title: "Ø der 5 schnellsten", description: "Die fünf schnellsten Zeiten im Scope", format: "time", direction: "asc", minimumSample: 5, group: "performance", scopes: all, compareBlock: "speed", scoreable: true },
  { key: "fastest-three", title: "Ø der 3 schnellsten", description: "Die drei schnellsten Zeiten im Scope", format: "time", direction: "asc", minimumSample: 3, group: "performance", scopes: [], compareBlock: "speed", scoreable: true },
  { key: "best-five-window", title: "Bestes 5er-Fenster", description: "Bester Durchschnitt aus fünf direkt aufeinanderfolgenden gültigen Versuchen im selben Event.", info: "Ein DNF oder ungültiger Versuch unterbricht das Fenster; Eventgrenzen werden nie überschritten.", format: "time", direction: "asc", minimumSample: 5, group: "performance", scopes: all, compareBlock: "speed", scoreable: true },
  ...([ ["sub5", "Unter 5 Sekunden"], ["sub4", "Unter 4 Sekunden"], ["sub3", "Unter 3 Sekunden"], ["sub25", "Unter 2,5 Sekunden"], ["sub2", "Unter 2 Sekunden"] ] as const).map(([key, title]) => ({ key, title, description: "Anteil gültiger offizieller Zeiten", format: "percent" as const, direction: "desc" as const, minimumSample: 1, group: "performance" as const, scopes: all, compareBlock: "speed" as const, contextOnly: true, compact: true })),
  { key: "consistency", title: "Konstanz", description: "Wie gleichmäßig die Zeiten sind – niedriger ist konstanter.", info: "Berechnet als Streuung im Verhältnis zur Durchschnittszeit (Variationskoeffizient).", format: "percent", direction: "asc", minimumSample: 5, group: "consistency", scopes: all, compareBlock: "consistency", scoreable: true },
  { key: "dnf", title: "Niedrigste DNF-Quote", description: "Mindestens 5 Eventversuche", format: "percent", direction: "asc", minimumSample: 5, group: "consistency", scopes: all, compareBlock: "consistency", scoreable: true },
  { key: "streak", title: "Längste Serie unter 3 Sekunden", description: "Eventweise, DNF und Eventende unterbrechen", format: "count", direction: "desc", minimumSample: 1, group: "consistency", scopes: all, compareBlock: "consistency", scoreable: true },
  { key: "near-repeat", title: "Near Repeat", description: "Direkte gültige Nachbarpaare mit höchstens 0,05 s Abstand", format: "percent", direction: "desc", minimumSample: 5, group: "consistency", scopes: all, compareBlock: "consistency", contextOnly: true },
  { key: "matrix-glitch", title: "Glitch in der Matrix", description: "Direkt aufeinanderfolgende gültige Versuche mit exakt derselben Zeit.", info: "Beide Versuche müssen vom selben Spieler und aus demselben Event stammen. DNF, ungültige Versuche und Eventgrenzen unterbrechen die Folge.", format: "count", direction: "desc", minimumSample: 1, group: "consistency", scopes: all, compareBlock: "consistency", scoreable: true },
  { key: "no-dnf-streak", title: "Längste Serie ohne DNF", description: "Direkt aufeinanderfolgende Eventversuche ohne DNF", format: "count", direction: "desc", minimumSample: 1, group: "consistency", scopes: [], compareBlock: "consistency", scoreable: true },
  { key: "valid", title: "Gültige Eventversuche", description: "Reguläre offizielle Eventzeiten", format: "count", direction: "desc", minimumSample: 1, group: "volume", scopes: all, compareBlock: "volume", scoreable: true },
  { key: "event-participations", title: "Eventteilnahmen", description: "Events mit mindestens einem eigenen Attempt", format: "count", direction: "desc", minimumSample: 1, group: "volume", scopes: [] },
  { key: "event-max", title: "Meiste Versuche in einem Event", description: "Persönlicher Event-Höchstwert", format: "count", direction: "desc", minimumSample: 1, group: "volume", scopes: all, compareBlock: "volume", scoreable: true },
  { key: "two-in-sixty-total", title: "2 in 60 – Gesamt", description: "Gültige Doppelschläge innerhalb des kanonischen Zeitfensters", info: "Zwei direkt aufeinanderfolgende gültige Versuche desselben Spielers im selben Event zählen, wenn zwischen ihren Zeitstempeln höchstens 180 Sekunden liegen.", format: "count", direction: "desc", minimumSample: 1, group: "volume", scopes: all, compareBlock: "volume", scoreable: true },
  { key: "two-in-sixty-best-five", title: "2 in 60 – Beste 5", description: "Durchschnitt der fünf schnellsten 2-in-60-Doppelschläge", info: "Für jeden Doppelschlag werden die beiden Versuchzeiten addiert. Gewertet wird der Durchschnitt der fünf niedrigsten Paarzeiten.", format: "time", direction: "asc", minimumSample: 5, compareMinimumSample: 5, group: "volume", scopes: all, compareBlock: "volume", scoreable: true },
  { key: "smooth", title: "Glatte Zeiten", description: "Exakt x,00 Sekunden", format: "count", direction: "desc", minimumSample: 1, group: "volume", scopes: all },
  { key: "common", title: "Häufigste exakte Zeit", description: "Treffer je Spieler für diese Zeit", format: "count", overallFormat: "time", direction: "desc", minimumSample: 1, group: "volume", scopes: all },
  { key: "fastest-first", title: "Bester erster Versuch", description: "Tatsächlicher gültiger Attempt 1", format: "time", direction: "asc", minimumSample: 1, group: "event", scopes: all, compareBlock: "clutch", contextOnly: true },
  { key: "fast-starter", title: "Fast Starter", description: "Median des Abstands von Attempt 1 zur finalen Event-PB", format: "time", direction: "asc", minimumSample: 1, compareMinimumSample: 3, group: "event", scopes: all, compareBlock: "clutch", scoreable: true },
  { key: "late-bloomer", title: "Late Bloomer", description: "Finale PB erstmals nach der Eventhälfte", format: "percent", direction: "desc", minimumSample: 1, compareMinimumSample: 3, group: "event", scopes: all, compareBlock: "clutch", scoreable: true },
  { key: "clutch", title: "Clutch", description: "Eine der letzten zwei Zeiten setzt eine strikt neue finale PB", format: "percent", direction: "desc", minimumSample: 1, compareMinimumSample: 3, group: "event", scopes: all, compareBlock: "clutch", scoreable: true },
  { key: "one-shot", title: "One Shot Wonder", description: "Attempt 1 bleibt persönliche Event-PB", format: "percent", direction: "desc", minimumSample: 1, compareMinimumSample: 3, group: "event", scopes: all, compareBlock: "clutch", scoreable: true },
  { key: "lead-time", title: "Führungszeit", description: "Qualifizierte Event-Führungszeit", format: "duration", direction: "desc", minimumSample: 1, group: "event", scopes: all, compareBlock: "clutch", scoreable: true },
  { key: "event-breaks", title: "Event-Bestzeiten gebrochen", description: "Strikt schnellere Eventzeiten nach der Drei-Spieler-Qualifikation", format: "count", direction: "desc", minimumSample: 1, group: "event", scopes: all, compareBlock: "clutch", scoreable: true },
  { key: "takeovers", title: "Lead Takeovers", description: "Direkte Führungsübernahmen nach der Drei-Spieler-Qualifikation", format: "count", direction: "desc", minimumSample: 1, group: "event", scopes: all, compareBlock: "clutch", scoreable: true },
  { key: "bingo-fields", title: "BINGO-Felder", description: "Unterschiedliche Hundertstel-Endungen", format: "count", direction: "desc", minimumSample: 1, group: "bingo", scopes: all, compareBlock: "bingo", scoreable: true },
  { key: "rare-hunter", title: "Rare Hunter", description: "Seltene BINGO-Endungen, die höchstens 3 Spieler getroffen haben.", info: "Gezählt werden unterschiedliche Hundertstel-Endungen im gewählten Scope. Gäste und AK-Spieler sind ausgeschlossen.", format: "count", direction: "desc", minimumSample: 1, group: "bingo", scopes: career, compareBlock: "bingo", scoreable: true },
  { key: "most-wanted", title: "Most-Wanted Treffer", description: "Unterschiedliche kanonische Hundertstel-Endungen", format: "count", direction: "desc", minimumSample: 1, group: "bingo", scopes: [], compareBlock: "bingo", scoreable: true },
  { key: "season-most-wanted", title: "Saison-Ersttreffer", description: "Kanonische Ersttreffer der gewählten Saison", format: "count", direction: "desc", minimumSample: 1, group: "bingo", scopes: [], compareBlock: "bingo", scoreable: true },
  { key: "rivalry-events", title: "Rivalry-Events", description: "Nur abgeschlossene qualifizierte Events", format: "count", direction: "desc", minimumSample: 1, group: "rivalry", scopes: career },
  { key: "rivalry-takeovers", title: "Rivalry-Takeovers", description: "Direkte Wechsel in bestehenden Rivalry-Paarungen", format: "count", direction: "desc", minimumSample: 1, group: "rivalry", scopes: career },
  { key: "chaos-magnet", title: "Chaos-Magnet", description: "Beteiligung an qualifizierten direkten Führungswechseln", format: "count", direction: "desc", minimumSample: 1, group: "event", scopes: career, compareBlock: "clutch", contextOnly: true },
  { key: "direct-wins", title: "Direkte Event-Siege", description: "Entschiedene gemeinsame abgeschlossene Events", format: "count", direction: "desc", minimumSample: 1, group: "rivalry", scopes: [], compareBlock: "rivalry", scoreable: true },
  { key: "direct-takeovers", title: "Persönliche direkte Takeovers", description: "Kanonische direkte Führungsübernahmen", format: "count", direction: "desc", minimumSample: 1, group: "rivalry", scopes: [], compareBlock: "rivalry", scoreable: true },
  { key: "rivalry-intensity", title: "Rivalry-Intensität", description: "Takeovers je gemeinsamem Event", format: "percent", direction: "desc", minimumSample: 3, group: "rivalry", scopes: [], compareBlock: "rivalry", contextOnly: true },
  { key: "rivalry-span", title: "Rivalry-Dauer", description: "Spanne zwischen erstem und letztem Rivalry-Event", format: "days", direction: "desc", minimumSample: 2, group: "rivalry", scopes: [], compareBlock: "rivalry", contextOnly: true },
  { key: "nemesis", title: "Nemesis", description: "Gegner mit den meisten eigenen Niederlagen", format: "count", direction: "desc", minimumSample: 3, group: "rivalry", scopes: [], compareBlock: "rivalry", contextOnly: true },
  { key: "favorite-opponent", title: "Lieblingsgegner", description: "Gegner mit den meisten eigenen Siegen", format: "count", direction: "desc", minimumSample: 3, group: "rivalry", scopes: [], compareBlock: "rivalry", contextOnly: true },
  { key: "wins", title: "Siege", description: "Gewonnene Events", format: "count", direction: "desc", minimumSample: 1, group: "achievements", scopes: [], compareBlock: "achievements", scoreable: true },
  { key: "podiums", title: "Podiumsplätze", description: "Plätze eins bis drei", format: "count", direction: "desc", minimumSample: 1, group: "achievements", scopes: [], compareBlock: "achievements", scoreable: true },
  ...([ ["badge-total", "Badge-Familien"], ["badge-bronze", "Mindestens Bronze"], ["badge-silver", "Mindestens Silber"], ["badge-gold", "Mindestens Gold"], ["badge-diamond", "Diamond"], ["badge-positive", "Positive Specials"], ["badge-consolation", "Consolation"] ] as const).map(([key, title]) => ({ key, title, description: "Aktive tatsächlich verdiente Badges", format: "count" as const, direction: "desc" as const, minimumSample: 1, group: "achievements" as const, scopes: allTime, compareBlock: "achievements" as const, scoreable: ["badge-total", "badge-positive", "badge-consolation"].includes(key), contextOnly: !["badge-total", "badge-positive", "badge-consolation"].includes(key), compact: true })),
  { key: "pb-jump", title: "Größter PB-Sprung", description: "Größte kanonische persönliche Verbesserung", format: "time", direction: "desc", minimumSample: 2, group: "records", scopes: career, compareBlock: "clutch", contextOnly: true },
  { key: "wr-reign", title: "Längster WR-Reign", description: "Längster kanonischer Haltezeitraum", format: "days", direction: "desc", minimumSample: 1, group: "records", scopes: career },
  { key: "wr-improvements", title: "WR-Verbesserungen", description: "Strikte Verbesserungen nach dem initialen Rekord", format: "count", direction: "desc", minimumSample: 1, group: "records", scopes: career },
  { key: "wr-jump", title: "Größter WR-Sprung", description: "Größte strikte Verbesserung eines bestehenden WR", format: "time", direction: "desc", minimumSample: 1, group: "records", scopes: career },
];

export const statisticMetricByKey = new Map(statisticMetricRegistry.map((metric) => [metric.key, metric]));

export const metricGroupLabels: Record<MetricGroup, string> = {
  performance: "Performance", consistency: "Konstanz", volume: "Aktivität & Volume",
  event: "Event & Leadership", bingo: "BINGO", rivalry: "Rivalry",
  achievements: "Achievements", records: "Rekorde & Historie",
};
