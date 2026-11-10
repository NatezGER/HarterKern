# Performance PR A

Basis: origin/main `9c646ee849cc7674cc6bcafb3d2f908485a61f8c`, einschließlich PR #78.
Alle Änderungen lokal; keine Veröffentlichung, Migration oder produktiven Schreibtests.

## Komposition

Vorher: Performance, Konstanz, Aktivität & Volume, Event & Leadership,
Rekorde & Historie, BINGO und Achievements. Fünf einzelne Zeitgrenzenkarten.

Nachher: I Geschwindigkeit & Bestzeiten, II Konstanz & Zuverlässigkeit,
III Präzision & Zeitkuriositäten, IV Aktivität & Volumen, V Start & Endspurt,
VII Event-Führung & Rivalries, VIII Rekorde & Karriere, IX BINGO & Most Wanted.
VI bleibt bis PR C unsichtbar. Die Reihenfolge liegt ausschließlich in
`performanceSections.ts`; globale Metric-Keys/Compare-Definitionen bleiben erhalten.
One Shot, alte Late-Bloomer-/Clutch-Quoten, Event-Bestzeiten gebrochen und
Achievements werden hier nicht mehr komponiert; BINGO und vier Rekordkarten bleiben.
Die vorhandene Chaos-Magnet-Karte bleibt bis zur neuen Definition in PR B ebenfalls
außerhalb dieser Komposition. Die Statistik-Übersicht und Bierseite sind unverändert.

## Daten und SQL

Migration `202611100076_performance_pr_a.sql` ersetzt ausschließlich
`get_statistics_performance_dashboard(integer)`, dessen letzte Definition in 069
steht. Keine Tabellen, Trigger, Berechtigungen, Schreibfunktionen oder Awards ändern
sich. 001–075 bleiben unverändert.

- Near Repeat: nur im Performance-CTE `<= 10` Hundertstel, weiterhin mindestens
  fünf gültige Nachbarpaare und derselbe Nenner. Registry/Compare bleiben bei 0,05 s.
- DNF: nur die serverseitige Performance-Qualifikation steigt von 5 auf 10.
  Quote, Grundpopulation, Gesamtwert und Badge-Semantik bleiben erhalten.
- 5er-Fenster: gleicher ungerundeter Minimaldurchschnitt, gleiche Rundung und
  Population wie 069. Belegwahl nach Rohdurchschnitt, Eventdatum, Event-ID und
  Endversuchsnummer. Fünf Zeiten/IDs sowie Event/Datum/Nummern im vorhandenen Payload.
  Native details/summary ist per Tastatur und Tap zugänglich, mit Eventlink.
- Unter-X-Karte: fünf vorhandene Rankings, rein lokaler Auswahlzustand; weder
  Neuberechnung noch Request beim Umschalten. SQL-Sortierung und Ränge unverändert.
- Most Wanted: eigener Performance-Key `most-wanted-firsts`, Projektion aus
  `most_wanted_endings` / `season_most_wanted_endings`. Gäste behalten ihre
  Ersttreffer; diese werden nicht nachträglich regulären Spielern zugeschrieben.
  Wettkampfrang über `rank()`, Top 5 in der Karte. Wiederholungen zählen nicht erneut.

## Glitch-Befund

Kein belegter Implementierungsfehler gefunden, deshalb keine Änderung.
Performance nutzt die letzte `get_statistics_sequence_metrics`-Definition aus 059:
direkte eigene gültige Nachbarn im selben Event, DNF/NULL unterbrechen, Ordnung
`submitted_at, id`. Bereits vor dem Sequenzieren ausgeschlossene Zeilen (AK,
gelöscht, nicht approved) bleiben entsprechend der kanonischen Population ausgeschlossen.

Die persönliche Badge-Hilfsfunktion aus 050 kann dagegen historische Zeiten und
eventübergreifende Nachbarn berücksichtigen. Globale Badge-Evidenzen beruhen auf
eventweiten gültigen regulären Nachbarn, auch verschiedener Spieler; DNF wird dort
vor dem globalen Vergleich ausgefiltert. Ein Badge ist deshalb kein Beweis für einen
persönlichen Performance-Glitch. Keine Badge-Evidenzen oder Auszeichnungen geändert.

Die tatsächlichen Datensätze zu „Komm ran Paul“ und „erster Bundesliga-Spieltag“
wurden nicht gelesen. Sichere Diagnose: `supabase/tests/read_only/performance_pr_a_glitch_diagnosis.sql`.
Letzte Abschnitte benötigen bereits vorhandene Leserechte für Badge-Evidenzen bzw.
Ausführungsrechte für den rein lesenden persönlichen Match-Helper.

## Requests und Grenzen

Weiterhin ein gecachter Performance-RPC je Saison/All-Time und der vorhandene
optionale Badge-Read. Kein zusätzlicher HTTP-Request für Hunter/Belege/Schalter.
Bestehende Invalidierung bei Attempts, historischen Zeiten, Spielern und Events
gilt auch für die neuen Daten. Keine neue Subscription.

Most-Wanted-Views verursachen zusätzliche serverseitige Arbeit; kein gemessener
Laufzeitnachweis. Auch die Übersicht nutzt denselben Performance-Payload für ihre
Diagramme und erhält die zusätzlichen Daten, ohne sie anzuzeigen. SQL-Queryplan,
kalter/warmer Lauf, Focus/Realtime und tatsächlicher Route-Ladeaufwand bleiben
auf isolierter Testdatenbank/Preview zu messen. Keine Indexänderung ohne Messung.

PostgreSQL, Docker und Supabase CLI sind lokal nicht verfügbar. pgTAP-Datei
`supabase/tests/database/performance_pr_a.sql` ist vorbereitet, nicht ausgeführt.
Sie prüft Schwellen, DNF 9/10, Fenster/Belege, Gleichstände, Scope, Glitch und
kanonische Hunter-Parität. Bestehende 069-Regressionen ebenfalls erneut ausführen.
Native Bedienbarkeit ist strukturell getestet; integrierte Browserprüfung bei
375/390/1440 px, Auswahlwechsel, Details, Saisonwechsel, leere/fehlerhafte Antworten
und Realtime bleibt offen. Vor Release: isolierte Migration/SQL-Tests, dann Preview
und Abnahme; produktiv Migration vor neuem Frontend, damit Texte und Regeln passen.

## Abhängigkeiten für PR B/C

- Gruppierung ergänzen, ohne die gemeinsame Registry oder Compare umzudefinieren.
- Shared Sequence Helper wird weiterhin von Compare/Trophy genutzt; neue Semantik
  dort nicht ungeprüft ändern. Fast Starter behält seine jetzige Stichprobe.
- Best-Five-Belege und unveränderte Werte gemeinsam weiterführen.
- Keine Medaillenaggregation aus der umschaltbaren Zeitgrenzenkarte ableiten.
- Hunter-Ersttreffer sind weder BINGO-Felder noch Rare Hunter.

## Dateien

- `src/pages/StatsPage.tsx`
- `src/components/stats/PerformanceRankings.tsx`
- `src/components/stats/MetricRankingCard.tsx`
- `src/components/stats/BadgeRankingSections.tsx`
- `src/constants/performanceSections.ts`
- `src/types/statDashboard.ts`
- `src/services/performanceDashboardService.ts`
- `src/services/statDashboardService.ts`
- `src/components/stats/PerformanceRankings.test.tsx`
- `src/components/stats/BadgeRankingSections.test.tsx`
- `src/services/performanceDashboardService.test.ts`
- `src/services/performancePrASql.test.ts`
- `src/pages/StatsChartPlacement.test.ts`
- `supabase/migrations/202611100076_performance_pr_a.sql`
- `supabase/tests/database/performance_pr_a.sql`
- `supabase/tests/read_only/performance_pr_a_glitch_diagnosis.sql`
- `docs/PERFORMANCE_PR_A.md`

## Lokale Prüfergebnisse (10.11.2026)

- Fokussiert: 33 Tests in 8 Dateien bestanden.
- Vollständige Suite: 942 Tests in 185 Dateien bestanden.
- `npm run check:quick`: Lint und TypeScript bestanden.
- Produktionsbuild bestanden (16,75 s); `git diff --check` bestanden.
- Ein alter Diagramm-Strukturtest wurde auf die neue Kartenkomposition angepasst;
  die Assertions zur exklusiven Diagrammplatzierung auf der Übersicht bleiben erhalten.
- Bereits in den V3.1-Buildprotokollen enthaltene Hinweise zu vier Public-Asset-
  Platzhaltern und zum Hauptchunk über 500 kB bestehen weiter. Keine Assets verändert.
- SQL/pgTAP nicht ausgeführt; keine produktiven Daten gelesen oder geschrieben.
- Kein integrierter Browserlauf oder Deployment in dieser Arbeitsphase.
