# Performance PR B

## Nachprüfung der Leadership-Qualifikation

Die bisherige Bezeichnung der Chaos-Schwelle als unverändert kanonische
Leadership-Qualifikation war falsch. Migration 060 leitete die Schwelle aus
den ersten Versuchen dreier regulärer Spieler in `official_event_attempts` ab,
ohne gültige Zeiten zu verlangen (DNF zählt als Teilnahme). Gäste sind dort
ausgeschlossen. Migration 068 ersetzt `event_lead_windows` jedoch: Beginn mit
der ersten gültigen Zeit aus `event_eligible_attempts`, einschließlich Gästen,
ohne Drei-Teilnehmer-Schwelle.

Auf ausdrückliche Auswahl des Nutzers verwendet PR B jetzt direkt
`public.event_lead_windows` aus 068. Die eigene Drei-Teilnehmer-Berechnung wurde
entfernt. Beide vorherigen gültigen regulären Spieler-PBs und ein strikter
Wechsel von dahinter nach davor bleiben Voraussetzung für einen Takeover.
Gäste können das Leadership-Fenster eröffnen, erhalten aber keine Paarpunkte.
Die bestehenden Leadership-, Rivalry-, Badge- und Compare-Definitionen bleiben
unverändert. pgTAP prüft zwei reguläre Spieler plus Gast (bereits vor einem
dritten regulären Spieler) sowie drei reguläre Spieler. PostgreSQL-Ausführung
weiterhin offen.

Nach der Korrektur: 9 gezielte Tests in `performanceLeadershipQualification`,
`performancePrBSql` und `performancePrB` bestanden. `check:quick` (Lint und
TypeScript) sowie `git diff --check` bestanden. Keine vollständige Testsuite
und kein erneuter Produktionsbuild für diese begrenzte Nachprüfung ausgeführt.

## Stand und Ausgangsbasis

Lokal implementiert auf `feat/performance-pr-b`, ausgehend von `origin/main`
`a1a5b692315f944f7376f0c3c0aeee7c7d6a2858` (einschließlich PR #79).
Keine Commits, kein Push, kein PR, kein Deployment und keine produktive Migration.

## Berechnungen und Verträge

- **Late Bloomer – Endspurt:** Offizielle eigene Eventversuche einschließlich DNF
  werden nach `submitted_at, attempt_id` geordnet. Ab n=5 umfasst das letzte
  Viertel `floor(n/4)` Positionen. Die gültige PB davor muss existieren.
  Eventgewinn = `max(0, PB davor − finale PB)`, Spielerwert = Median sämtlicher
  qualifizierender Eventgewinne einschließlich null Sekunden. Mindestens zwei
  Events. Beispiel: n=8, Positionen 7–8 bilden das Viertel; 3,05 auf 2,75 ergibt
  0,30 s. Zusammen mit einem Event ohne Verbesserung ergibt sich 0,15 s Median.
  DNF zählt als Position, niemals als gültige Zeit. Gleiche Mediane teilen den
  Rang; Erfolgsquote, Eventzahl, Name und ID ordnen nur die Anzeige.
- **Fast Starter:** Der gemeinsame `get_statistics_sequence_metrics` bleibt
  unverändert. Weiterhin Median aus erster gültiger tatsächlicher Versuch-1-Zeit
  minus finaler PB, pro Event mindestens drei eigene Versuche. Ausschließlich
  die Performance-Projektion verlangt jetzt zwei qualifizierende Events.
- **Rivalry-Events:** Kanonische `rivalry_pair_events.is_rivalry_event` mit mindestens
  drei direkten Paar-Takeovers, nur geschlossene Events. `count(distinct event_id)`
  pro Spieler; mehrere Gegner ergeben im selben Event keinen zusätzlichen Punkt.
- **Chaos-Magnet:** Nur geschlossene Events innerhalb des kanonischen
  `event_lead_windows` ab der ersten gültigen Zeit einschließlich Gästen.
  Keine Mindestteilnehmerzahl. Punkte nur zwischen regulären Spielern.
  Beide müssen bereits eine gültige PB besitzen. Der Akteur verbessert seine PB
  strikt von hinter dem Gegner auf vor den Gegner. Erstplatzierungen, Gleichstand
  und dessen bloße Auflösung zählen nicht. Jeder überholte Gegner zählt; echte
  spätere Re-Takeovers zählen erneut. Quellen werden pro auslösendem Versuch
  gruppiert. Gleiche Zeitstempel werden deterministisch nach Versuch-ID geordnet.

All-Time und Saison verwenden denselben Rechenweg; Saison nach Eventdatum.
Endspurt behält die offizielle Eventpopulation einschließlich laufender Events;
Rivalry und Chaos sind ausdrücklich auf abgeschlossene Events begrenzt.

Neue isolierte Keys: `performance-endspurt`, `performance-rivalry-events`,
`performance-chaos-takeovers`. Sie vermeiden eine Bedeutungsänderung bestehender
Badge-, Compare- und Rivalry-Hub-Keys. Gemeinsame Sequenz-, Paar-, Führungs- und
Award-Definitionen werden nicht ersetzt. Sämtliche Migrationen bis 076 bleiben
unverändert. Keine neue Schreibberechtigung; beide Performance-Funktionen sind
stabile SQL-Lesefunktionen mit `security invoker`.

## Oberfläche und Datenfluss

Endspurt steht in Abschnitt V, Rivalry/Chaos in VII; kein neuer Abschnitt VI.
Vorhandene Top-5/Erweitern-Steuerung bleibt erhalten. Die drei Karten bieten
Spielerlinks und aufklappbare Belege mit Eventlinks. Endspurt zeigt Viertelversuche
einschließlich DNF; Rivalry die Gegner; Chaos den auslösenden Versuch und damalige
PBs. Null Sekunden werden ausdrücklich als `0,00 s` angezeigt.

Ein bestehender Performance-RPC pro nicht gecachtem Scope, keine zusätzlichen
Browserabfragen für Details. Bestehendes Caching bleibt unverändert. Die neuen
Belege vergrößern allerdings Antwortgröße und SQL-Arbeit; keine gemessene
Performanceverbesserung behauptet.

## Dateien

Neu:

- `supabase/migrations/202611100077_performance_pr_b.sql`
- `supabase/tests/database/performance_pr_b.sql`
- `src/types/performanceEvidence.ts`
- `src/constants/performanceEventMetrics.ts`
- `src/services/performanceEvidence.ts`
- `src/services/performancePrB.test.ts`
- `src/services/performancePrBSql.test.ts`
- `src/components/stats/PerformanceEventDetails.tsx`
- `src/components/stats/PerformanceEventDetails.test.tsx`
- `docs/PERFORMANCE_PR_B.md`

Geändert:

- `src/components/stats/MetricRankingCard.tsx`
- `src/components/stats/PerformanceRankings.tsx`
- `src/constants/performanceSections.ts`
- `src/services/performanceDashboardService.ts`
- `src/types/statDashboard.ts`
- `src/utils/statMetricFormat.ts`

## Prüfung

Gezielter Vitest-Lauf: **28 Tests in 7 Dateien bestanden**:
PerformanceEventDetails, PerformanceRankings, performancePrB,
performanceDashboardService, performancePrBSql, performancePrASql und
performanceSqlIsolation. Er umfasst Datenzuordnung, Saison/All-Time, Cache,
optionale Belege, Karteneinordnung, Nullgewinn und statische SQL-Verträge.
Ein zunächst gefundener Nullgewinn-Darstellungsfehler wurde korrigiert und erneut
geprüft. Statische SQL-Tests ersetzen keine PostgreSQL-Ausführung.

`npm run check:quick`: bestanden (Lint und TypeScript), einmal ausgeführt.
Produktionsbuild: bestanden, einmal ausgeführt. Warnungen: vier zur Buildzeit
nicht aufgelöste `__VITE_PUBLIC_ASSET__`-Referenzen sowie Hauptchunk über 500 kB
(528,44 kB). Asset-Darstellung muss bei der offenen Browserabnahme geprüft werden.
`git diff --check`: bestanden.

**Vollständige Testsuite für GitHub-CI vorgesehen, lokal bewusst nicht ausgeführt.**

Die pgTAP-Datei enthält ausschließlich wegwerfbare lokale Testdaten mit Rollback:
Viertelgrenzen 4/5/7/8/11/12, DNF, fehlende vorherige PB, Nullgewinn, Mindestevents,
Median/Gleichstandssortierung, Fast-Starter-Formel, unterschiedliche Rivalry-Events,
mehrere Gegner, Leadership-Fenster einschließlich Gästen, Erstplatzierung, Gleichstände, Re-Takeovers,
mehrere Überholungen, AK/gelöscht/pending, Saison und Zeitstempelgleichstand.
Nicht ausgeführt: Keine isolierte PostgreSQL-Umgebung bzw. PostgreSQL-/Docker-
Werkzeuge verfügbar. Syntax, Typauflösung, Triggerinteraktion und tatsächliche
SQL-Ergebnisse sind damit noch nicht zur Laufzeit bestätigt.

## Offene Abnahme und Hinweise für PR C

1. Auf isolierter Datenbank Migrationen bis 077 und pgTAP-Test ausführen;
   niemals die Fixture-Datei auf Produktion ausführen.
2. RPC für All-Time und Saison mit realistischem Datenumfang messen:
   `EXPLAIN (ANALYZE, BUFFERS)` für den Helper, Gesamtlaufzeit und Antwortgröße
   des Dashboard-RPC prüfen. Besonders Paarzustände und JSON-Belege beobachten.
3. Nach gesonderter Freigabe Preview prüfen: Desktop und schmale Mobilansicht,
   Top 5/Erweitern, Details/Tastaturbedienung, Event-/Spielerlinks, lange Namen,
   Nullgewinne, DNF sowie Saisonwechsel. Browserprüfung hier nicht durchgeführt.
4. Vollständige CI vor Merge; Datenbankmigration vor Frontend-Veröffentlichung.
   Freigabe zur Produktion erst nach den offenen SQL- und Preview-Prüfungen.

PR C soll die isolierten Keys und kanonischen gemeinsamen Definitionen erhalten.
Weitere Formkurven, Medaillen, Saisonabschlüsse, Bierfunktionen und allgemeine
UX-Arbeiten bleiben außerhalb dieses Changesets. Keine neue Admin-Architektur
oder Sicherheitsüberarbeitung enthalten.
