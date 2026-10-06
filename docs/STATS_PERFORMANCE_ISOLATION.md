# Stats Performance Isolation – lokaler Stand / Preflight

Basis: GitHub-main `f4bd7bec3a933659d3b4800f2a20b8e7023e1a55` (PR #63).
Arbeitsbranch: `refactor/stats-performance-isolation`.
Keine produktive SQL-Ausführung, kein Commit, Push, PR oder Browser-Review.

## 1. Nachgewiesene Request-Herkunft vor der Änderung

Die Zahlen zählen fachliche HTTP-Reads, nicht Auth, Storage-Bilder, Realtime
oder das globale einmalige `award_assets`-Mapping.

| UI / Consumer | Provider / Hook → Service | Reads beim kalten Mount | Scope |
|---|---|---|---|
| WR-Namen / Statistikbasis | DataPlatform → statistics → getPlayers | players + player_statistics bzw. season_player_statistics (2) | All-Time / Saison |
| WR-Verlauf | DataPlatform → statistics → getWorldRecordHistory | world_record_history / season_world_record_history (1) | All-Time / Saison |
| Ligakarten | DataPlatform → statistics → getGlobalStatistics | global_statistics (1) bzw. season_global_statistics + saisonale Bestzeit (2) | All-Time / Saison |
| Historische Versuche, zunächst eingeklappt | DataPlatform → historical → loadHistoricalAttempts | historische Rohdaten (1), vorher auch saisonal | All-Time |
| MostWantedMatrix und Versuchsnummern-Chart | DataPlatform → most-wanted → getMostWantedSnapshot | endings + progress + qualified hits (3) | All-Time / Saison |
| MetricDashboardGrid (5 Gruppen) | StatsPage → useStatisticDashboard → getStatisticDashboard | get_unified_statistics_dashboard (1) | season, event=null |

Summe: **9 All-Time / 10 Saison**. Zusätzlich mögliche Wiederholungen.

Auslöser und Überschneidung:
- Mount und Route-/Saisonwechsel starten den jeweiligen DataPlan.
- Focus/Visibility haben zuvor ohne Mindestalter alle aktiven Gruppen eingeplant.
- Realtime für attempts/historical_attempts/players/events/participants/guests
  trifft die betroffenen aktiven Gruppen, vorher einschließlich Most Wanted.
- Jede erfolgreiche statistics-Ladung erhöht statisticsVersion. Der Hook hatte
  keine RPC-In-flight-Deduplizierung und keinen Erfolgs-Cache.
- Damit können Hook-Mount und eine nachfolgende Versionsänderung denselben RPC
  gleichzeitig ausführen. DataGroup-Dedupe schützte nicht den unabhängigen RPC.
- Der alte DataGroup-Key war group:season; nach Abschluss keine Wiederverwendung.
- Initiale Ladungen waren run-guarded, manuelle/scheduled Refreshes nicht durchgängig.
  Eine verspätete Antwort konnte deshalb den neuen Scope überschreiben.

### Trophy / Medal / Rivalry Hub: Befund statt Vermutung

Performance hat auf dem untersuchten main **keinen direkten Aufruf** dieser RPCs.
Die Route ist ein eigener Outlet; PR #63 deaktiviert Router-Transitions bereits.
Es gibt keinen nachgewiesenen dauerhaft mitgemounteten Event- oder Hub-Consumer.

- Trophy startet in LiveEventPage → useTrophyEventSpecialStats und in
  EventResultsPage → useEventDetail → getEventDetailExtras.
  Der Trophy-Hook ignorierte späte Antworten, brach den HTTP-Read aber nicht ab.
- Medals starten in getEvents und getEventDetail. Beide hatten asynchrone
  Event-Vorabfragen; nach deren Antwort begann die Medal-/Detail-Fan-out auch
  dann, wenn der Consumer inzwischen verlassen worden war.
- Rivalry Hub startet nur in StatsOverviewPage/StatsRivalriesPage. Sein Hook
  bricht schon auf main bei Cleanup ab. Dafür wurde keine neue Ursache erfunden
  und sein gemessener schneller SQL-Pfad nicht geändert.
- Ohne den Initiator-Stack/HAR der beobachteten Produktionssession lässt sich
  deren genaue Abfolge nicht rückwirkend beweisen. Ein Request, der während
  Performance sichtbar ist, kann von der vorherigen Route stammen.

Behoben: Abbruchsignal für Event-Vorabfrage, danach expliziter Abbruch-Guard vor
Fan-out; Signal für Medal-RPCs, Trophy-RPC und Event-Extras; Route-Laufnummern
gelten nun auch für Refresh, Optional- und Realtime-Nachladungen.

## 2. Neue Route- und UI-Grenze

| Performance-Sektion | Gelieferte Felder | Neuer Read |
|---|---|---|
| WR-Verlauf / History | Rekordzeit, Datum, Quelle, Verbesserung, Dauer, Identität | bestehende WR-View (1) |
| Versuchsnummern | Nummer, Samples, gültige Zeiten, gerundetes Mittel | Performance-RPC |
| Spieler-/Eventkarten | regularPlayers, eventCount | Performance-RPC |
| Performance / Konstanz / Volume / Event / Rekorde | alle bisherigen 34 sichtbaren Metric-Keys, Summaries, bis 10 Ränge | Performance-RPC (1) |
| Historische Versuche (All-Time) | unveränderter Archivbestand | historical-Gruppe (1) |

**Neu: 3 All-Time / 2 Saison.** Das unabhängige Ranking-Modul hat weiterhin
Ladezustand und Retry. Ein RPC-Fehler nimmt WR-Verlauf/Archiv nicht weg.
Die WR-View liefert bereits die Identität; ein zusätzlicher globaler
player_statistics-Read ist dafür nicht nötig. Overlays bleiben nutzerinitiiert.

Most Wanted liegt auf **/stats/most-wanted**, in derselben scrollbaren Subnav.
Die bestehende Matrix, First-Hit-/Guest-/Saison-Semantik und drei Reads bleiben
unverändert. Auch die doppelte Matrix auf /stats/badges wurde entfernt, damit
die globale Matrix ausschließlich auf ihrer eigenen Statistikroute lädt.
Persönliches BINGO/Most Wanted und Trophy-Event-Inhalte sind nicht umgebaut.

Nicht mehr auf Performance: statistics-Gruppe, Unified, MW-Endings/-Progress/
Hit-Rohliste, Badge-Rarity, Trophy, Medal, Hub, Prestige oder Eventverwaltung.
qualified_official_times bleibt intern für echte Performance-Werte zulässig;
es wird keine globale Hitliste mehr an diesen Client übertragen.

## 3. Migration 062

`202610050062_statistics_performance_isolation.sql` ergänzt ausschließlich:

`public.get_statistics_performance_dashboard(p_season_year integer default null)`

SQL STABLE, SECURITY INVOKER, bestehende RLS, EXECUTE für anon/authenticated.
Kein Event-Parameter, keine Writes/Trigger/Indices, kein Timeout-Tuning.
Migrationen 001–061 bleiben unverändert.

Relationale Berechnung vor JSON:
- Gemeinsame qualified population für Basiswerte und Chart, reguläre Teilmenge
  für persönliche Rankings; historische Zeiten und Gäste wie zuvor behandelt.
- Baseline-Metriken/Nenner aus v56; sogar dessen Top-ten-Auswahl *vor* dem
  späteren positiven Threshold-Filter und Sample-Sortierung wird beibehalten.
- Nur benötigte Advanced-CTEs (Median/Fünferfenster/Konstanz/First/Near-Repeat/PB/WR).
- Sequenzmetriken aus der bestehenden korrigierten 059-Funktion.
- Leadership aus 060, einschließlich geschlossener Events, Drei-Spieler-Fenster
  und Pausenabzug. Kein paarweiser Rivalry-Scan.
- Kein Aufruf von Unified, v56-JSON oder dem globalen Advanced-Metric-Bundle;
  keine Badge-/BINGO-/Most-Wanted-/Trophy-/Rivalry-Pair-Aggregation.
- Der Chart aggregiert dieselben qualifizierten source_order-Werte wie früher
  aus der MW-Hitbasis; DNF/AK-Lücken in der Nummerierung bleiben erhalten.

## 4. Dedupe / Refresh

Gemeinsamer ReadCache: identischer Key → exakt dasselbe laufende Promise;
Success-TTL **20 Sekunden**, Fehler nicht gecacht. Keys trennen Datenquelle,
Saison, Event und bei Bedarf normalisierte Player-ID-Mengen.

Realtime/Mutation invalidiert betroffene aktive DataGroups und die zugehörigen
schweren Cache-Einträge. Trifft die Invalidierung einen laufenden Read, wird
nach dessen Abschluss seriell frisch gelesen; kein paralleler identischer RPC
und kein dauerhaft gecachtes Vor-Mutations-Ergebnis. Mehrere Versions-Effects
nutzen dasselbe Promise. Auch wiederholte manuelle Refreshes invalidieren vor
der In-flight-Wiederverwendung, damit eine zweite echte Mutation nicht verloren geht.
Die Cache-Nachladung berücksichtigt lebende Consumer: Sind alle zugehörigen
Hooks/Routen inzwischen verlassen, erfolgt kein vorgemerkter Hintergrund-Reload.
Ein weiterer aktiver Consumer behält dagegen dasselbe Promise und bekommt
das frische Ergebnis.

Focus/Visibility: frische oder laufende Gruppen werden übersprungen; ab 20s
darf nachgeladen werden, nach Fehler mindestens 5s Focus-Cooldown.
Der vorhandene 120ms-Debounce bleibt. Expliziter Retry umgeht diesen Focus-Guard.
Kein globales Abschalten von Realtime. Most Wanted wird von Performance aus
weder geladen noch durch seinen aktiven Gruppenplan aktualisiert.

Statistische Eventpausen werden zusätzlich abonniert und nur an performance,
statistics, event-detail/live adressiert. Empfang setzt voraus, dass die
bestehende Supabase-Realtime-Publikation die Tabelle enthält; hier wird keine
Publikation geändert. Explizite Refreshes und Focus nach Stale-Time bleiben
auch ohne dieses Realtime-Signal wirksam.

Scopewechsel: Hook-Ergebnis-Key plus Cleanup; Provider run-guards für jede
Ladungsart. Keine Übernahme alter Saison-/Routeantworten. Ein bereits laufender
Unified-Read kann absichtlich zu Ende laufen und kurzfristig wiederverwendet
werden; er startet keine Folge-RPCs und aktualisiert keinen ungemounteten Hook.

## 5. Lokale Tests und nicht behauptete Nachweise

Finaler lokaler Gate am 06.10.2026:
- fokussierte Tests grün (inklusive der letzten 32 Cache-/Hook-/Service-Checks);
- npm run check:quick: grün, keine ESLint-/TypeScript-Fehler;
- npm run check:full: grün, 150 Testdateien / 747 Tests und Produktionsbuild;
- git diff --check: grün;
- bestehende Migrationen gegen origin/main unverändert.
Die Suite meldet vorhandene React-SSR/useLayoutEffect-Warnungen in statischen
Router-Render-Tests; keine fehlgeschlagenen Tests.

Automatisierte Tests decken ab:
- getrennte Route-Pläne/MW-Route, Performance-Service ausschließlich neue RPC;
- Chart-/Karten-Mapping, Scope, erhaltene Sections und eigenständigen Fehler/Retry;
- Unified-In-flight, TTL, Scopewechsel, Invalidierung während laufendem Read;
- Focus-Prädikat frisch/abgelaufen/in-flight/Fehler-Cooldown;
- Hook-Versionen, active=false-Guard, Scopewechsel und Unmount;
- unterbundene verspätete Medal-/Trophy-Fan-out;
- Subnav inklusive Mobile-Scrollstruktur, aktuelle Route, Saisonansicht;
- SQL-Boundary und synchron eingebettete Migration im Preflight.

SQL-Vergleich unter supabase/tests/read_only prüft Werte, Ränge, Reihenfolge,
Nenner/Details, Chart und Grundzähler gegen die existierenden Quellen ohne Fixtures.
**Nicht lokal ausgeführt:** PostgreSQL/pgTAP nicht installiert; keine produktive
Supabase-Verbindung benutzt. Statische Tests sind kein SQL-Compile-/Runtime-Beweis.

## 6. Supabase SQL Editor – exakte Durchführung

Datei `supabase/tests/read_only/statistics_performance_preflight.sql` vollständig
in EINEN Editor-Run kopieren. Sie enthält exakt die aktuelle Migration 062:

1. BEGIN;
2. komplette CREATE-/GRANT-Definition der neuen Funktion;
3. SET LOCAL ROLE authenticated;
4. EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) nur für den neuen RPC, All-Time sowie
   eine automatisch aus echten Daten gewählte Saison;
5. read-only Shape-/Scope-/Parity-/Chart-/Zählerprüfungen;
6. ROLLBACK; als letzte Anweisung.

Keine Datensätze werden angelegt/geändert. Die neue Funktion und Grants werden
ebenfalls zurückgerollt. Nicht als produktive Migration ausführen.
Bei Abbruch/Fehler und noch offener Transaktion separat **ROLLBACK;** ausführen.

Erwartung: OK in allen Vergleichszeilen; SKIP nur für eine nicht vorhandene Saison.
differing_metric_keys = identical; forbidden = none; keine Duplikate/malformed rows.
Die Shapes erlauben leere Rankings, wenn niemand die bestehende Mindestqualifikation
erfüllt. Nicht vorhandene Daten werden nicht als fachlicher Erfolg erfunden.

Die Legacy-Parity-Prüfung ruft absichtlich den bisherigen teuren Unified-RPC auf.
Ein dortiger 57014 ist ein offener Paritätsnachweis, nicht ein Timeout-Beweis für
den neuen RPC. Den New-path-EXPLAIN vorher separat betrachten; keinen Timeout
erhöhen, keine Rechte ändern. Syntax-/Spalten-/Typfehler, FAIL, 42501 und 57014
im *neuen* Pfad sind Release-Blocker.

Nach bewusst separat angewandter 062 können diese Befehle read-only wiederholt werden:

```sql
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT public.get_statistics_performance_dashboard(NULL);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT public.get_statistics_performance_dashboard(season_year)
FROM (SELECT max(season_year) season_year FROM public.season_global_statistics) s
WHERE season_year IS NOT NULL;
ROLLBACK;
```

Keine gemessene DB-Zeit behauptet. Ziel <500ms, ab 1s harte Warnschwelle.
Laufzeiten mehrmals mit realen Daten/gleicher Rolle erfassen (erster vs. warmer
Read getrennt); shared hit/read buffers notieren. Der unveränderte
qualified-/WR-Unterbau und mehrfache Sequenzscans können weiterhin Kosten verursachen.

## 7. Preview-Network-Abnahme (noch nicht ausgeführt)

- Getrennt 360/390/430 und 1280/1440/1920 px testen; keine horizontale Seitenbreite,
  nur die Subnav darf scrollen; Most Wanted erreichbar/aktiv markiert.
- Frischer Tab/harter Reload /stats/performance, All-Time: genau WR + historical +
  get_statistics_performance_dashboard; saisonal nur WR + Performance-RPC.
  award_assets/Auth/Storage/WebSocket separat zählen.
- Keine get_unified_statistics_dashboard, MW-Endings/-Progress, Hitliste,
  Trophy-, Medal-, Rivalry-Hub-, Badge-Rarity- oder Prestige-Requests.
- Network vor Navigation leeren bzw. Initiator/Zeitstempel prüfen. Bereits zuvor
  gestartete alte Requests nicht der neuen Route zurechnen.
- /stats/most-wanted: genau drei MW-Reads, richtige globale/saisonale Matrix.
  /stats/badges: eigener Unified-Read bleibt; keine globale MW-Matrix.
- Wiederholung innerhalb 20s und kurzer Focus/Visibility-Wechsel: keine neuen
  identischen Reads. Nach >20s genau ein gebündelter Refresh.
- Schnell All-Time → Saison → All-Time sowie Event → Performance wechseln:
  keine falschen alten Werte; abgebrochene Event-/Trophy-/Medal-Anfragen dürfen
  keine Folgeabfragen starten. Keine identischen parallelen Unified-Requests.
- Vorhandenes reales Realtime-Ereignis beobachten (keine Testdaten anlegen):
  auf Performance nur WR/Performance/ggf. Archiv; keine Badge-/Trophy-/MW-Ladung.
- Laufenden Read und reale Änderung überlappen lassen: maximal ein identischer
  Request gleichzeitig; danach frisches Ergebnis, kein Cache des alten Stands.
- RPC-Fehler simulieren: Rekordverlauf/Archiv bleiben, Bereichs-Retry vorhanden.
- Messprotokoll: cold load total, slowest HTTP query, DB EXPLAIN, hard reload,
  Focus, Realtime und Scopewechsel; Browser-Netzzeit ist nicht reine DB-Zeit.

## 8. Geänderte Dateien

- `src/App.tsx`
- `src/components/dashboard/WRProgression.tsx`
- `src/components/stats/StatsNavigation.test.tsx`
- `src/components/stats/StatsNavigation.tsx`
- `src/hooks/useDataPlatform.tsx`
- `src/hooks/useHistoryProfiles.ts`
- `src/hooks/useStatisticDashboard.ts`
- `src/hooks/useTrophyEventSpecialStats.ts`
- `src/pages/StatsBadgesPage.tsx`
- `src/pages/StatsPage.tsx`
- `src/pages/StatsRouting.test.ts`
- `src/pages/StatsStructure.test.tsx`
- `src/services/dataGroupService.test.ts`
- `src/services/dataGroupService.ts`
- `src/services/dataPlatformRepository.test.ts`
- `src/services/dataPlatformRepository.ts`
- `src/services/eventService.test.ts`
- `src/services/eventService.ts`
- `src/services/historyProfileService.test.ts`
- `src/services/historyProfileService.ts`
- `src/services/statDashboardService.test.ts`
- `src/services/statDashboardService.ts`
- `src/services/statsService.ts`
- `src/services/trophyEventStatsService.ts`
- `src/types/database.ts`
- `src/types/index.ts`
- `docs/STATS_PERFORMANCE_ISOLATION.md`
- `src/hooks/usePerformanceDashboard.ts`
- `src/hooks/useStatisticDashboard.test.ts`
- `src/pages/StatsMostWantedPage.tsx`
- `src/services/performanceDashboardService.test.ts`
- `src/services/performanceDashboardService.ts`
- `src/services/performanceSqlIsolation.test.ts`
- `src/services/readCache.test.ts`
- `src/services/readCache.ts`
- `src/services/readSignal.ts`
- `supabase/migrations/202610050062_statistics_performance_isolation.sql`
- `supabase/tests/read_only/statistics_performance_isolation.sql`
- `supabase/tests/read_only/statistics_performance_preflight.sql`
