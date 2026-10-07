# Rivalry Hub V2

## Ausgangspunkt und Grenzen

Basis: origin/main ab081fae3ff78014ade6a6857d41685e45bc273d (PR67).
Additive Migration 066; Migrationen 060–065 und ältere bleiben unverändert.
Nur Rivalry-Tab; Compare, Badge-Regeln, Save-Hotpath und andere Stats-Reads unverändert.

## Kanonische Fachlogik

- Direkter Takeover stammt ausschließlich aus der bestehenden 060-Paarlogik.
  Initiale Führung zählt nicht; ein Tie unterbricht direkte Nachfolge.
  Dritte erzeugen keinen Takeover für ein anderes Paar.
- Nur Closed Events aus `rivalry_pair_events`.
- Duell: mindestens ein direkter Takeover im vergleichbaren Scope.
- Rivalry-Event: mindestens drei direkte Takeovers desselben Paars im selben Event.
  Drei Wechsel über mehrere Events reichen nicht.
- **Length = Anzahl qualifizierter Rivalry-Events**, nicht Tage und nicht Serie.
  Dazwischenliegende normale Events unterbrechen nichts.
- Badge-Eligibility bleibt 1/3/5/10 Rivalry-Event-Paarungen je Spieler.
  Wiederholungen desselben Gegners zählen weiterhin mehrfach. Score hat keinen Einfluss.

## Population und Formeln

E = vergleichbare abgeschlossene H2H-Events; T = direkte Takeovers **in denselben Events**.
Vergleichbar bedeutet wie im bestehenden Compare-Eventverlauf: beide regulären,
nicht archivierten Spieler sind Eventteilnehmer und haben jeweils eine gültige
offizielle PB. Quelle: `official_event_attempts` + `event_participants`,
geschlossenes, nicht gelöschtes Event. Die PB wird einmal je Event/Spieler aggregiert.
H2H-Siege und Ties partitionieren E. DNF-only und fehlende Mitgliedschaft fallen
aus E **und** T. Keine N+1-Aufrufe des Player-History-RPCs.

L = kanonische Rivalry-Event-Anzahl im Scope. Ihre vorhandene Qualification wird
nicht nachträglich an die Compare-Mitgliedschaft gebunden. Deshalb kann bei
inkonsistenter Mitgliedschaft L positiv, E aber null sein. Der Snapshot enthält
zusätzlich canonicalCommonEvents/canonicalDirectTakeovers und zeigt die Abweichung
in den Card-Details. Keine Datenkorrektur oder neue Badge-Qualification.

```text
Intensity = round(100 * T / (E * 3))
Score = round(100 * sqrt(T/3)
              * (1 + 0.25 * ln(E))
              * (0.4 + 0.6 * min(1, T/E))
              * (1 + 0.12 * max(0, L-1)))
```

E=0: Intensity NULL. T<=0 oder E<=0: Score 0. Kein Cap bei 100.
PostgreSQL numeric, natürliche ln, ganze Zahlen via round (keine Integerdivision).
Einzige produktive Formel: `calculate_rivalry_metrics_v1(numeric,numeric,numeric)`;
Konstanten in einem CTE. Keine Formelkopie in React.

| Fall | E | T | L | Score | Intensity |
|---|---:|---:|---:|---:|---:|
| A | 1 | 1 | 0 | 58 | 33 % |
| B | 1 | 2 | 0 | 82 | 67 % |
| C | 1 | 3 | 1 | 100 | 100 % |
| D | 4 | 3 | 0 | 114 | 25 % |
| E | 6 | 8 | 1 | 236 | 44 % |
| F | 10 | 3 | 1 | 91 | 10 % |
| G | 5 | 10 | 2 | 287 | 67 % |
| H | 8 | 18 | 4 | 506 | 75 % |

Diese rechnerischen Referenzwerte stehen im pgTAP-Test und Read-only-Preflight.
Die lokale PostgreSQL-Ausführung ist mangels DB nicht bestätigt.

## Scope, Status und Snapshot

`get_rivalry_hub_v2(p_season_year integer default null) returns jsonb`.
NULL = All-Time, sonst Event-start_date-Jahr. Root: seasonYear, summary, pairs.
Metadaten und Formeln serverseitig; SECURITY INVOKER, bestehende RLS unverändert;
EXECUTE für anon/authenticated.

- Score, Intensity, E, T, H2H, Length und Scope-Datumswerte verwenden nur den Scope.
- All-Time-Status, erstes All-Time-Rivalry-Datum und All-Time-Length separat.
- Lifetime-Status ist der aktuelle kanonische Gesamtstand, kein historischer
  As-of-Snapshot des Saisonendes und keine neue persistierte Auszeichnung.
  Korrekturen/Löschungen können ihn wie bisher verändern.
- Historisch etablierte Paare mit mindestens einer kanonischen Begegnung im Scope
  bleiben auch bei L=0/T=0 sichtbar. Das ist die bewusste zusätzliche Kategorie.
  Ohne Begegnung im Scope erscheint kein veraltetes Paar.
- formalRivalryInScope = L>0; historicalRivalry = Lifetime-L>0 und L=0;
  duelOnly = Lifetime-L=0 und T>0. Andere Null-Takeover-Paare werden ausgeschlossen.
- Reihenfolge: Score DESC, Length DESC, T DESC, E DESC, UUID low/high ASC.
- Summary zählt Rivalry-Event-**Paarungen**, nicht verschiedene Event-IDs.
- Neuer Hook hat synchronen Scope-Guard, Cleanup-Guard und scopebezogenen Retry.
  Der vorhandene ReadCache dedupliziert, hält erfolgreiche Snapshots 20 Sekunden
  und trennt Scope-Keys. Fehler werden nicht als Erfolg gecacht. Kein neuer
  Realtime-/Focus-Refresh: Aktualisierung bei Mount, Scopewechsel und Retry.
  Ein abgemeldeter Consumer ignoriert das Ergebnis; er bricht eine von anderen
  Consumern gemeinsam genutzte HTTP-Anfrage nicht ab.

## UI und bestehende Informationen

Spotlight nimmt das höchstplatzierte formal qualifizierte Paar **im Scope**.
Nur ohne solches Paar folgt ein klar beschriftetes historisches Fallback
(nach aktuellem Scope-Score, nicht Lifetime-Score).

Darunter echte/historische Rivalries und getrennte Duelle; beide mit Avataren,
Score, Intensity, Rivalry-Events, E, T, H2H und Ties. Suchfilter, Compare-Links,
Sortierung und progressive Ausgabe in 20er-Schritten bleiben erhalten.
Spieler-Top10 nach Rivalry-Event-Paarungen bleibt als aufklappbarer Bereich.
Datumswerte/kanonische Takeovers bleiben in Card-Details. Die bisherigen separaten
Strongest-/Longest-Toplisten gehen in Spotlight und Sortieroptionen auf.
Die alte Tageslänge entfällt ausdrücklich zugunsten der beauftragten Eventanzahl.
Info-Erklärungen sind native, tastaturbedienbare Details-Elemente.

Übersichtsteaser nutzt unverändert den bisherigen V1-Summary-RPC. Dessen rohe
kanonische Takeover-Summe kann bei nicht vergleichbaren Events von V2-T abweichen.
Die neue Ansicht benennt T deshalb ausdrücklich als Takeovers vergleichbarer Events.

## Performance und Prüfung

Ein RPC pro Hub-Scope, keine Unified-/Badge-/Most-Wanted-/Performance-Fanouts.
Kanonische Pair-Facts werden einmal für Scope und Lifetime geteilt; benötigte
gültige PBs in einem zweiten gruppierten Read. Unbenutzte Lead-Time-Spalten
werden nicht angefordert. **Die kanonische Gesamtquelle bleibt für den
Lifetime-Status nötig**: keine Behauptung eines frühen Saisonfilters für die
gesamte Pair-Engine und keine garantierte Kostenverbesserung ohne EXPLAIN.

Nach Anwendung von 066:
`supabase/tests/read_only/rivalry_hub_v2_preflight.sql` im SQL Editor ausführen.
READ ONLY + authenticated + abschließendes ROLLBACK, keine Fixtures, keine
Timeout-Änderung. Formelchecks A–H, Snapshot-Invarianten, tatsächliche Rangfolge
mit Namen sowie EXPLAIN (ANALYZE, BUFFERS) für All-Time und 2026.
Fehlende geschlossene 2026-Events werden als SKIP ausgewiesen.
Execution Time der beiden letzten Pläne vergleichen; bei SQL-Funktionskapselung
kann EXPLAIN nur den äußeren Result-Knoten zeigen (keine erfundene Innenplananalyse).

DB-Tests nur lokal in einer migrierten Testdatenbank:
`supabase/tests/database/rivalry_hub_v2.sql` (Rollback-Fixtures) und unverändert
`event_timing_pairwise_rivalries.sql`. Der aktive Fixture-Fall wird übersprungen,
wenn das Schema bereits sein einziges aktives Event enthält; keine Seed-Mutation.

Fokussierte Vitest-Pfade:
- src/components/stats/RivalryHubContent.test.tsx
- src/components/stats/RivalryHubContent.benchmark.test.tsx
- src/services/rivalryHubV2Service.test.ts
- src/services/rivalryHubV2Sql.test.ts (statische Verträge, kein SQL-Compile-Test)
- src/hooks/useRivalryHubV2.test.ts (kontrollierte Hook-Primitiven, kein Browser)
- bestehende ReadCache-, RivalryService-, StatsRouting-/Navigation-/Structure-
  und PlayerCompare-Tests

Lokale Gates: check:quick, fokussierte Tests, build, git diff --check.
DB-Kompilierung, reale Rangfolge, Runtime und visuelle Browserprüfung bleiben
offen, solange dafür keine Umgebung/Ergebnisse verfügbar sind.

Stand 2026-10-07: 53 fokussierte Vitest-Tests in 13 Dateien erfolgreich;
check:quick, build und diff-check erfolgreich. Der Build meldet vier nicht
aufgelöste Vite-Public-Asset-Platzhalter; Asset-/Theme-Styles sind unverändert.
Kein PostgreSQL/pgTAP/Docker lokal verfügbar, deshalb keine DB-Testausführung.
Migration nicht angewendet, kein Browserlauf, kein Commit/Push/PR.
