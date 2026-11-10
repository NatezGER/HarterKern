# Performance PR C – Form und Leistungsentwicklung

## Stand und Basis

Basis: frisch abgerufenes `origin/main`, Merge von PR #80,
`ea1e4f68f963f072fb833b1dbc4a9e2cb11e8fee`. Der Worktree war sauber; der
bestehende PR-B-Commit blieb erhalten. Neuer lokaler Branch:
`feat/performance-pr-c`. Nummer 078 war frei.

Alle PR-C-Änderungen sind lokal und uncommitted. Kein Push, PR, Merge,
Deployment oder produktiver SQL-Lauf in diesem Auftrag.

## Technischer Preflight und Populationen

Die tatsächlich letzten Definitionen wurden über die Migrationen ermittelt:
`qualified_official_times` aus 017, `season_qualified_official_times` aus 026,
`official_event_attempts` aus 060, Leadership aus 068 und Performance aus 077.

- **Spiralen:** `official_event_attempts`, regulär, approved, nicht gelöscht,
  nicht AK/archiviert. DNF bleibt im Strom und unterbricht. Reihenfolge pro
  Spieler/Event: `submitted_at, attempt_id`. Nicht freigegebene, gelöschte und
  AK-Zeilen sind bereits durch diese kanonische Quelle ausgeschlossen; sie
  werden nicht als zusätzliche Unterbrechungen neu eingeführt. Ungültige
  Zeit/DNF innerhalb der offiziellen Population unterbricht.
- **Übrige Karten:** `qualified_official_times`, nur permanente reguläre Spieler.
  Diese Quelle enthält gültige Event- und historische Einzelzeiten, keine DNF.
  Saisonzuordnung wird aus `season_qualified_official_times` übernommen:
  Eventdatum für Eventzeiten, historisches Datum für historische Zeiten.
- **Chronologie:** `occurred_at, source_priority, source_order, source_id`.
  Importierte historische Einzelzeiten haben `has_exact_time=false` und einen
  technischen Mitternachtswert; dieser ist keine belegte Uhrzeit. Die UI zeigt
  ihr Datum und kennzeichnet die Importreihenfolge. Eigene historische Datensätze
  desselben Tages mit eindeutiger Importreihenfolge folgen diesem kanonischen
  Sortiermodell; UUID ist nur deterministischer letzter Tie-Break.
- **Unsichere Tagesfolgen:** Historische und exakt terminierte Zeiten desselben
  Spielers am selben Tag sind nicht relativ zueinander beweisbar. Doppelte
  historische Importpositionen sind ebenfalls unklar. Für Rekordjäger,
  Beinahe-Legende und Plateau werden Spieler mit solchen Tagen im betrachteten
  Karrierepräfix konservativ ausgeschlossen. Dies kann auch spätere eindeutige
  Belege ausschließen; keine erfundenen PB-Spitzenreiter. Trends verwenden die
  kanonische technische Reihenfolge mit offenem Datumshinweis, keine behauptete
  präzise Tageschronologie.
- **Saison-PB:** Vollständige Karriere bis zum Ende des gewählten Jahres zuerst
  rekonstruieren, danach Treffer/abgeschlossene Jagden/Plateauversuche filtern.
  Keine neue PB am 1. Januar. Zukünftige Zeiten fließen nicht in alte Jahresstände.

Es besteht kein produktiver Datenbankzugriff in diesem Auftrag. Tatsächliche
Spielerzahlen, Zehnerstichproben, CV-Grenzgleichstände und Häufigkeit unklarer
Tagesfolgen wurden nicht behauptet. Sichere Diagnoseabfragen stehen in
`supabase/tests/read_only/performance_pr_c_preflight.sql`.

## Acht Formeln und Keys

Alle Werte werden in PostgreSQL berechnet, keine zweite Berechnung in React.

| Karte / Key mit Präfix `performance-` | Exakte Wertung |
| --- | --- |
| Aufwärtsspirale / `upward-spiral` | Größte Anzahl direkter Übergänge zu strikt kleinerer Zeit innerhalb eines Events; Gleichstand, Gegenrichtung und DNF brechen. Vier Zeiten ergeben drei Übergänge. |
| Abwärtsspirale / `downward-spiral` | Derselbe Sequenzstrom, umgekehrte strikte Richtung. Höher ist hier humoristisch negativ. |
| Formanstieg / `form-rise` | Zehn jüngste gültige Scope-Zeiten: Median der älteren fünf minus Median der neueren fünf; nur positiver Wert. |
| Formzerfall / `form-decay` | Dieselben zehn Zeiten und Mediane, neu minus alt; nur positiver Wert. |
| Rekordjäger / `record-hunter` | Maximale Differenz der gültigen Sequenzpositionen zweier aufeinanderfolgender strikter All-Time-PBs. Ausgangs-PB exklusive, neue PB inklusive. Abschluss-PB bestimmt Saison. |
| Beinahe-Legende / `near-legend` | Anzahl Scope-Zeiten mit `1 <= Zeit − vorherige All-Time-PB <= 10` Hundertstel. Aktuelle Zeit ist im Referenzfenster ausdrücklich ausgeschlossen. |
| Plateau / `plateau` | Gültige Scope-Zeiten nach der letzten strikten All-Time-PB des betrachteten Karrierepräfixes. Neue PB setzt auf null; nur positive Werte. |
| Schnellster unter den Konstanten / `fastest-consistent` | Ab zehn gültigen Scope-Zeiten: kanonischer CV, Grenzwert an Position `ceil(N/3)`, alle CV-Gleichstände einschließen. Innerhalb dieser Gruppe ungerundeten Durchschnitt aufsteigend ranken. |

Die beiden Spiralen teilen eine Sequenzgrundlage. Gleiche maximale Länge wählt
als Beleg frühestes Eventdatum, Event-ID, Startposition. Dies verändert keinen Rang.
Die Trends teilen ihre Medianbasis und dürfen Eventgrenzen überschreiten.
Rekordjäger, Beinahe und Plateau teilen ein materialisiertes historisches
PB-Fenster mit `ROWS ... 1 PRECEDING`. Gleiche PB-Zeiten sind keine neuen PBs.

### CV und Präzision

Die bestehende Konstanzkarte aus 077 definiert CV als
`round(stddev_pop(Zeit) / round(avg(Zeit)) * 100, 3)`.
Genau diese bestehende Definition wird für die Drittel-Qualifikation verwendet;
keine Umstellung auf Stichprobenstreuung oder eine andere CV-Formel.
Die Durchschnittszeit für das neue Geschwindigkeitsranking bleibt dagegen
`avg(integer)` als exakte PostgreSQL-Numeric-Zahl. Die neue Darstellung
`precise-time` zeigt bei Bedarf bis zu vier Nachkommastellen in Sekunden.
Rangentscheidungen verwenden die Rohwerte, nicht die gerundeten Anzeigen.
Die beiden Trendmediane haben jeweils fünf Werte; eine gerade Blockgröße ist
in dieser Arbeitsformel nicht vorgesehen. Keine vorzeitige Rundung.

Alle acht Karten nutzen `rank()` ausschließlich nach dem maßgeblichen Wert.
Name und ID bestimmen nur die stabile Anzeigereihenfolge. Kein weiterer
Zehn-Versuchsfilter für Spiralen, Beinahe, Plateau oder abgeschlossene Jagden.

## UI, Datenfluss und Isolation

Bereich II erhält die neue Konstanzkarte. Bereich VI wird mit fünf Karten und
Sprungnavigation aktiviert. VIII behält alle vier bisherigen Rekordkarten und
ergänzt zwei separate Karten. Top 5, Avatare, Spielerlinks, native aufklappbare
Details und vorhandenes Layout bleiben erhalten. Hilfetexte nennen die
Mindeststichproben; fehlende Rankings erhalten keine erfundenen Ersatzwerte.
Es gab im bestehenden `MetricRankingCard` keinen Mehr-anzeigen-Schalter;
seine bestehende `limit`-Schnittstelle wurde nicht verändert.

Details: vollständige ausgewählte Spiralserie mit Versuch-IDs im Payload,
Nummern/Zeiten, beide Trendfenster mit Datum und Quellen, PB-Anfang/Ende,
Plateauzustand sowie CV-Cutoff und Stichproben. Die Quellen verlinken Events,
sofern vorhanden. Historische Quellen erhalten keine erfundene Eventzuordnung.

Neuer stabiler SQL-Helper `get_performance_development_metrics(integer)`:
`security invoker`, unveränderte RLS, Execute für anon/authenticated.
Migration 078 ersetzt die öffentliche Performance-Hauptfunktion, bettet deren
kompletten 077-Query unverändert ein und hängt die neuen Metriken an. Ein
statischer Regressionstest vergleicht den vollständigen bisherigen Querytext.
Der PR-B-Helper, Chaos-Magnet, Leadership, Badge-/Trophy-Verträge, Compare,
Rivalry-Hub, Bier und Meilensteine bleiben unberührt. Migrationen 001–077
werden nicht verändert.

Weiterhin ein gecachter Performance-RPC pro Scope; keine Anfragen pro Spieler,
keine neuen Subscriptions und keine Cache-/Invalidierungsänderung. Wie bisher
wird der Performance-Payload auch von bestehenden Verbrauchern mitgeladen.
JSON-Detailarrays werden erst für die ersten zehn Rangzeilen pro Karte erzeugt.
Beinahe-Belege sind auf die 20 jüngsten Treffer begrenzt, die Rangzählung bleibt
vollständig. Ein Gesamtwert über ungleiche Spielerkennzahlen wird nicht erfunden.

## Tests und Beispiele

**44 gezielte Vitest-Tests in 12 Dateien bestanden.** Neue Tests prüfen Karten,
Details, Quellenkennzeichnung, Parserfehler, Zeitpräzision, Top 5, Saisoncache,
serverseitige Gleichstände, SQL-Isolation und unveränderte PR-A-/PR-B-Verträge.
Die bestehenden Zeitgrenzenschalter, Fünferbelege, Endspurt/Fast Starter,
Rivalry/Chaos und vier bisherigen Rekordkarten bleiben gezielt abgedeckt.

`supabase/tests/database/performance_pr_c.sql` ist eine isolierte pgTAP-Datei
mit expliziten synthetischen Testdaten und abschließendem Rollback. Nicht auf
Produktion ausführen. Beispiele und Assertions:

- 340 → 320 → 310 → 295: drei Verbesserungen; ebenso drei Verschlechterungen.
- DNF/Gleichstand unterbrechen, Eventserien werden nicht verbunden;
  gleich lange Serien wählen den ersten belegten Event.
- Neun Zeiten reichen nicht; zehn reichen; bei elf entfällt die älteste.
  Fünfermediane 340/305 ergeben +35, 295/340 ergeben 45 Zerfall.
- Historische PB 295, zwölf gültige Wiederholungen, DNF, neue PB 270:
  13 Versuche Jagd, zwölf Zwischenversuche.
- Beinahe: +1 und +10 zählen, +11/gleich/neue PB nicht; damals gültige PB
  statt heutiger PB. Gleichstände teilen den Rang. 21 Treffer, 20 Detailbelege.
- Historische PB 265, 24 erfolglose Zeiten: Plateau 24 zum Saisonende;
  eine PB im Folgejahr ändert diesen alten Stand nicht, All-Time ist null.
- Sieben CV-qualifizierte Spieler: Drittelgrenze drei, vier CV-Gleichstände
  qualifizieren sich; Geschwindigkeit entscheidet danach. Neun Zeiten reichen
  nicht, zehn reichen. Exakter Mittelwert 300,1 Hundertstel bleibt erhalten.
- Ambigue Importpositionen erzeugen keine PB-basierten Rankings.

**PostgreSQL/pgTAP nicht ausgeführt:** Keine isolierte PostgreSQL-, Docker- oder
Supabase-CLI-Umgebung verfügbar. Statische SQL-Verträge sind kein Nachweis der
SQL-Typauflösung, tatsächlichen Ergebnisse oder Triggerinteraktion.

`npm run check:quick`: bestanden (Lint und TypeScript), einmal ausgeführt.
Produktionsbuild: bestanden, einmal ausgeführt (Vite 18,73 s).
`git diff --check`: bestanden; neue Dateien zusätzlich auf nachgestellte
Leerzeichen geprüft. Bekannte Warnungstypen bleiben: vier nicht zur Buildzeit
aufgelöste Public-Asset-Platzhalter und Hauptchunk über 500 kB (537,44 kB,
145,39 kB gzip). Keine Asset-Dateien verändert; Darstellung in Preview prüfen.
**Vollständige Testsuite für GitHub-CI vorgesehen, lokal bewusst nicht ausgeführt.**

## Dateien

Geändert: `src/components/stats/PerformanceRankings.tsx`,
`src/constants/performanceSections.ts`, `src/services/performanceDashboardService.ts`,
`src/types/statDashboard.ts`, `src/utils/statMetricFormat.ts`.

Neu: `src/components/stats/PerformanceDevelopmentDetails.tsx` und zugehöriger Test,
`src/constants/performanceDevelopmentMetrics.ts`,
`src/types/performanceDevelopment.ts`,
`src/services/performanceDevelopmentEvidence.ts`,
`src/services/performancePrC.test.ts`, `src/services/performancePrCSql.test.ts`,
Migration 078, die pgTAP- und Read-only-Dateien sowie dieser Bericht.

## Offene Abnahme und Risiken

1. Migration 078 und pgTAP auf isolierter Datenbank ausführen; frühere
   Performance-SQL-Regressionen dort mitprüfen. Vollständige CI vor Merge.
2. Read-only-Preflight für reale Stichproben/Chronologie verwenden. Insbesondere
   Reichweite des konservativen Ausschlusses ambiger Tage fachlich abnehmen.
3. Queryplan des Helper-Bodys sowie RPC-Zeit kalt/warm, Antwortgröße und
   Speichernutzung messen. Die Karriere wird einmal innerhalb des Helpers
   aufgebaut, die unveränderte Baseline scannt eigene Quellen zusätzlich.
   Kanonische Views können verschachtelte Arbeit verursachen. Große einzelne
   Spiralserien bleiben als vollständiger Beleg potenziell groß. Keine
   Indexänderung ohne Messung und keine behaupteten Laufzeitverbesserungen.
4. Preview separat abnehmen: 375/390/1440 px, alle acht Karten, Tastatur/Details,
   lange Namen/Serien, historische Datumshinweise, leere Stichproben, Spieler-
   und Eventlinks, Saisonwechsel, Fokus/Realtime. Kein Browserlauf durchgeführt.
5. Erst nach diesen Abnahmen veröffentlichen; additive Migration vor Frontend.

## Hinweise für einen späteren Medaillenspiegel

Positive Leistung: Aufwärtsspirale, Formanstieg, schnellster konstanter Spieler.
Humoristische Negativwerte: Abwärtsspirale, Formzerfall, Plateau. Rekordjäger
belohnt Hartnäckigkeit, Beinahe-Legende Häufigkeit knapper Fehlschläge; beides ist
kein direkter Geschwindigkeitsnachweis. Keine dieser Kategorien automatisch
als gleichwertige Medaille behandeln.

Spiralen können schon mit zwei gültigen Nachbarn, Beinahe mit einem Treffer,
Plateau mit einem Folgeversuch und Rekordjäger mit einer einzigen abgeschlossenen
Jagd auftreten. Trends/Konstanz verlangen zehn gültige Zeiten. Alle Rankings
besitzen echte geteilte Wettbewerbsränge. Die acht neuen Karten sind nicht auf
abgeschlossene Events begrenzt: Sie spiegeln den aktuellen offiziellen Stand
bzw. das gewählte Saisonpräfix; Rekordjäger verlangt nur eine abgeschlossene
PB-Suche. Zulassung, Stichprobenschwellen, Negativkategorien und Saison-Freeze
benötigen später eine eigene Entscheidung. Keine Medaillenlogik implementiert.
