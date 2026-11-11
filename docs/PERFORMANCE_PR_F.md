# Performance PR F – lokale Umsetzung und Prüfung

Stand: 11.11.2026. Branch `feat/pr-f-performance-review-polish`, angelegt auf dem frisch abgeglichenen `origin/main` **5b9d203** (PR #83 / A–E enthalten).

**Status:** lokal implementiert und technisch geprüft; nicht committed, gepusht, als PR erstellt, deployt oder produktiv migriert. Keine produktiven Daten geändert. Für eine Veröffentlichung bleiben die vollständige Staging-Datenbankprüfung, reale Laufzeitmessungen und visuelle Abnahme offen.

## Ursachen und Datenfluss

Die statische Untersuchung bestätigt unnötige Arbeit im bisherigen Ranking-Pfad:

- `get_statistics_performance_dashboard(integer)` aus 078 bündelte die Basisrankings, sämtliche PR-B-/PR-C-Metriken und deren Belege. Beide Seiten verwendeten denselben Payload.
- 077 aggregierte Rivalry-/Takeover-Beleglisten für alle Spieler vor der Begrenzung des Rankings. 078 baute Belegobjekte im Karriere-Scan und lieferte unter anderem vollständige Spiralfolgen.
- Zurückgestellte Statistiken verursachten weiterhin Sequenz-, Median-, CV- und JSON-Arbeit.
- Die Hall of Fame startete auch für All-Time Performance und BINGO, obwohl diese Medaillenwertung fachlich entfallen soll.

**Nicht belegt:** Ein produktiver Request-Dopplungsfehler oder eine konkrete Datenbank-Timeout-Ursache. Der vorhandene `ReadCache` dedupliziert bereits laufende Reads und serialisiert Invalidierungen. Kein produktives EXPLAIN, Netzwerkprofil oder Laufzeitvergleich wurde ausgeführt. Die Statistikübersicht verwendet denselben Performance-Service für vorhandene Diagrammdaten; diese kompatiblen Payload-Felder bleiben erhalten. Startseite/Dashboard wurden nicht geändert.

### Umsetzung

- Additive Migration **080**; bisherige Migrationen unverändert.
- Die Signatur des Ranking-RPC bleibt gleich. Neue Performance-Helfer berechnen nur die behaltenen Kategorien. Der isolierte Sequenzhelfer erhält die bisherigen Fast-Starter-, Matrix- und 2-in-60-Formeln; der gemeinsame Compare-/Badge-/Trophy-Sequenzhelfer bleibt unverändert.
- Basisrankings enthalten keine PR-B-/PR-C-Beleglisten mehr. JSON-Aggregate haben explizite FILTER für den angeforderten Spieler; ein bloßes CASE außerhalb eines Aggregats wäre dafür nicht ausreichend. Der kleine Bestes-5er-Fenster-Beleg mit genau fünf Versuchen bleibt inline.
- Neuer read-only RPC `get_performance_metric_details(integer,text,uuid)`: erst beim Öffnen eines Details. Er grenzt auf Spieler/Saison ein; Rivalry-/Chaos-Paare werden vor ihren Fensterberechnungen auf die beteiligten Paare eingegrenzt. Die Detailberechnung bleibt eine Berechnung der jeweiligen Metrikfamilie, kein persistierter Snapshot.
- Rivalry-Belege zeigen höchstens fünf jüngste Events. Chaos zeigt höchstens fünf jüngste auslösende Versuche und fünf Gegner pro Versuch. Gesamtwerte werden **vor** dieser Begrenzung ermittelt.
- Bestehender `ReadCache` auch für Details, getrennte Schlüssel pro Saison/Metrik/Spieler. Realtime-/Datengruppen-Invalidierung leert Ranking- und Detailcache. Offene Details laden nach; alte Saisonantworten werden ignoriert. Keine neuen Timer oder Polling-Reads.
- Hall of Fame: Bestzeit/Durchschnitt lösen keine Medaillenreads aus. Saisonmedaillen laden Performance und den bestehenden BINGO-Pfad parallel; All-Time lädt weder diese Performance- noch BINGO-Quelle und zeigt nur einen neutralen Hinweis.

In der isolierten SQL-Fixture sank der serialisierte erste Payload All-Time von **56.879 auf 31.404 Bytes**, Saison von **56.877 auf 31.402 Bytes** (je etwa 45 %). Das belegt die Verkleinerung für diese Fixture, **keinen produktiven Geschwindigkeitsgewinn**. Paargraphen, historische Karrierechronologie und BINGO können weiterhin relevante Datenbankkosten verursachen.

## Fachliche Korrekturen

### Entfernte Performance-Kategorien

Schnellster unter den Konstanten, Late Bloomer/Endspurt, Formanstieg und Formzerfall sind aus Performance-Komposition, Performance-Definitionen und damit der Live-Medaillen-Eligibility entfernt. Der Service filtert alte Payload-Einträge ebenfalls. Die neue Ranking-SQL ruft ihre Berechnungen nicht mehr auf. Historische Migrationen und von anderen Modulen benötigte Legacy-Definitionen bleiben erhalten.

### Eventführung

`event_lead_windows` beginnt mit der **zweiten gültigen Zeit** aus `event_eligible_attempts`. Es müssen keine zwei unterschiedlichen Spieler sein; Gäste zählen nach der bestehenden Eligibility mit. DNF, AK, gelöschte und nicht genehmigte Versuche qualifizieren nicht.

Die bisher beste Zeit aus den ersten beiden Versuchen bildet die Ausgangsführung zum Zeitpunkt des zweiten gültigen Versuchs. Ist der zweite Versuch langsamer oder gleich schnell, führt weiterhin der erste Teilnehmer, aber erst ab diesem Vergleichszeitpunkt. Ist er schneller, ist der zweite Teilnehmer die Ausgangsführung. Dieser Ausgangspunkt erzeugt **keinen künstlichen Takeover/Bestzeitbruch**. Gleichzeitige Versuche werden anhand `(submitted_at, attempt_id)` geordnet.

Die gemeinsame `event_participant_lead_segments_all`-Quelle behält ihre Spalten/Typen und speist die bestehenden Closed-Event-, Teilnehmer-, Event-Bestzeitbruch-, Führungsstatistik- und abhängigen Badge-/Compare-Lesewege. Statistische Pausen und das letzte zulässige Attempt-Ende bleiben erhalten. Die Live-Progression und Live-Führungswechselanimation folgen derselben Schwelle; frühe Post-Attempt-Hinweise heißen Eventbestzeit statt Eventführung. PB/WR/SR-Auszeichnungen werden dadurch nicht umdefiniert.

**Auswirkung:** Rückblickend gelesene Führungszeiten und Führungswechsel ändern sich fachlich gewollt. Abhängige dynamische Badge-Fortschritte können sich ebenfalls ändern. Es findet keine rückwirkende Umschreibung bestehender Badge-/Trophäen-Ledger statt. Deren Verhalten bei späteren regulären Neuberechnungen muss in der vollständigen Staging-Umgebung mit geprüft werden.

### Rivalries und Chaos

Die Performance-Kategorie zählt jetzt **qualifizierte Paarungen pro abgeschlossenem Event**, nicht unterschiedliche Events je Spieler. A–B und A–C im selben Event zählen für A als zwei. Kanonische Paarqualifikation, Mindestzahl von drei direkten Paar-Takeovers und Rivalry-Hub-/Compare-Paarquellen bleiben unverändert. Die anderen untersuchten Paar-Services zählen bereits pro Paar/Event.

Chaos behält seine strikte aktive Überholungsregel: eigene vorherige PB, vorher strikt hinter dem Gegner, anschließend strikt davor. Keine Punkte für Erstplatzierung oder Gleichstandsauflösung. Es verwendet weiter das gemeinsame Leadership-Fenster, nun ab der zweiten gültigen Zeit. Detailkürzungen ändern keine Zähler.

### Matrix / Matrix-Glitch

Die Performance-Formel aus 059 wurde mit den Badge-Definitionen und der vorhandenen PR-A-Diagnose abgeglichen: direkte eigene gültige Nachbarn im selben Event; identische Hundertstel ergeben einen Treffer, DNF/ungültige Versuche unterbrechen. Andere Spieler unterbrechen die persönliche Folge nicht. Historische/persönliche Badge-Sequenzen haben teils andere Definitionen und sind nicht austauschbar.

Kein neuer Formeldefekt wurde anhand des Codes bestätigt. Die unveränderte Formel ist im SQL-Vergleichstest enthalten; ein zusätzlicher Gleichstand–DNF-Fall zählt korrekt einmal. Der konkrete frühere Produktionsfall wurde mangels Datenbankabfrage nicht nachgestellt; `supabase/tests/read_only/performance_pr_a_glitch_diagnosis.sql` bleibt dafür der vorhandene Prüfweg. Keine unbegründete Badge- oder Statistikänderung vorgenommen.

## Darstellung

- Hall of Fame behält die drei Modi und Bestzeit als Standard. Der Medaillenmodus verliert die redundanten Kopftexte; Hilfe, Podium, Rangliste und Belege bleiben. All-Time enthält keine Live-Auswertung oder provisorische Karriere-Summe.
- Abgeschlossene Events: Header, **Podium → freigeschaltete Badges → Führungsprogression → bestehende restliche Inhalte**. DOM- und CSS-Reihenfolge stimmen überein. Trophy-Sonderstatistiken bleiben ausschließlich bei Trophy-Events.
- `EventAttemptList` verwendet die vorhandenen PB-/WR-/EB-Flags mit `RecordEmblem`. Die Live-Versuchsliste verwendet ihre bestehenden PB-/WR-Flags ebenfalls mit Grafiken. Die Event-Attempt-Quelle besitzt kein SR-Flag; es wurde kein künstlicher SR-Indikator erfunden. PostAttemptResult und RecordCelebration hatten die passenden Grafiken bereits und bleiben erhalten.
- Persönliche Bierwertungen stehen im Profil unmittelbar vor Rivalries; sonst keine Profilstrukturänderung.
- Rankingkarten: Info-Symbol an der Überschrift, vorhandene Hover-/Fokus-/Tap-Hilfe, einheitliches „Details ansehen“, reservierter Platz für Zusatzzeilen, dezente Medaillengrafiken nach tatsächlichem Rang einschließlich Gleichständen. Rang bleibt für Screenreader benannt.
- Kein Gesamt-Kasten bei `overallValue = null`; ein echter Nullwert bleibt sichtbar. Entwicklungs-/Rekordjäger-/Beinahe-Legende-Karten erhalten damit keine Leerkachel. Anzeige maximal zwei Dezimalstellen, numerische Sortierwerte bleiben unverändert.
- Live-Ticker: höchstens ein heutiger Moment pro PB/SR/WR/EB aus dem vorhandenen Live-Snapshot. SR wird saisonbezogen ermittelt statt der bisherigen fälschlich als Saisonrekord bezeichneten All-Time-Minimum-Abfrage. Vorhandene Eligibility-/Milestone-Helfer werden verwendet; historische frühere Zeiten begrenzen PB/WR. Gäste dürfen Eventbestzeiten, aber keine Liga-Rekorde auslösen. Kein zusätzlicher Request. Memoisierung vermeidet Neuberechnung beim bloßen Tick der Uhr. Bei reduzierter Bewegung bleibt der Inhalt horizontal erreichbar und wird nicht doppelt angezeigt.

## Tests und Prüfgrenzen

- **212 Tests / 36 gezielte Testdateien bestanden.** Performance A–F, Service-/Cache-/Datengruppen, Hall of Fame/Eligibility, Informationsarchitektur, Saisonwechsel, Detail-Lifecycle, Eventansicht/Progression, Live-Eingabe-Ergebnis/Animation, Ticker, Profile, Embleme und direkte Rivalry-/Compare-Regressionen.
- **76 PostgreSQL-Fixture-Prüfungen bestanden** mit temporär installiertem PGlite **0.5.16**: vorhandene 060-/068-Lead-/Paarquellen und 059-/077-/078-Berechnungen, danach echte Migration 080. Geprüft: Spaltenkompatibilität, Funktionsauflösung, tatsächliche SQL-Berechnung, Ein-/Zwei-Zeiten-Fälle, gleicher Spieler, Gäste, Gleichstände/UUID-Reihenfolge, DNF/AK/pending/deleted, Pausen, aktive vs. geschlossene Events, Rivalry-Mehrfachpaarungen, Detailgrenzen ohne Zählerverlust, Matrix, unveränderte Rankings/Werte der behaltenen Kategorien in beiden Scopes sowie Ausführung als `anon` im Testschema.
- **Grenze dieses SQL-Tests:** minimale synthetische In-Memory-Fixtures; Qualified-Time-/Global-/WR-/BINGO-Eingangsrelationen sind Testverträge, nicht die komplette Supabase-Migrationskette. Produktions-RLS, Auth, Trigger, Datenvolumen und gespeicherte Awards sind damit nicht vollständig geprüft. Keine Verbindung zur produktiven Datenbank.
- Zusätzlich Migration und alle SQL-Sprachfunktionskörper mit PostgreSQL-Parser pglast syntaktisch geprüft; der PL/pgSQL-Detailpfad wurde in PGlite tatsächlich ausgeführt.
- `npm run check:quick`: bestanden (ESLint und TypeScript).
- `npm run build`: bestanden. Vite meldet einen Haupt-Chunk über 500 KB (ca. 553 KB minifiziert); kein ungefragter Bundle-Refactor.
- `git diff --check`: bestanden nach Entfernen einer zusätzlichen Leerzeile am Dateiende.
- Keine vollständige lokale Testsuite ausgeführt. Bestehende SSR-Warnungen von React Router in den Render-Tests sind keine Browserabnahme.

SQL-Test reproduzieren, ohne Projektabhängigkeiten zu ändern: `@electric-sql/pglite@0.5.16` in einem separaten temporären Verzeichnis installieren und `node scripts/check-performance-pr-f.mjs <absoluter-Pfad-zu-pglite/dist/index.js>` aus dem Repository ausführen. Der Runner erstellt ausschließlich eine flüchtige In-Memory-Datenbank und schließt sie abschließend.

## Noch offene Abnahme und Reihenfolge

1. Migration 080 zunächst in eine vollständige isolierte Staging-Datenbank auf Stand 079 einspielen; darunterliegende RLS, Views, Badge-/Realtime-Trigger und bestehende Ledger prüfen. Die Migration selbst enthält keine Datenänderungen/Schreib-RPCs; bestehende Berechtigungsschwächen werden nicht als behoben dargestellt.
2. Den neuen Frontendstand mit dieser Datenbank verbinden. Ohne 080 kann der neue Detail-RPC nicht funktionieren. Der Ranking-RPC bleibt aufrufkompatibel, liefert aber weniger optionale Belege; ein altes Frontend zeigt dann diese Belege nicht an. Die geänderte Führungsdefinition sollte deshalb koordiniert mit dem Frontend veröffentlicht werden.
3. `supabase/tests/read_only/performance_pr_f_preflight.sql` in Staging für Signaturen, echte Payloadgröße und EXPLAIN/Laufzeit verwenden. Vorher-/Nachher-Requests mit identischem Datenstand vergleichen; insbesondere Pair-Graph, BINGO und All-Time-Historie.
4. Vercel-Preview erst nach separater Freigabe/Beauftragung erstellen und visuell abnehmen. Erst danach Veröffentlichung planen. In diesem Auftrag wurde nichts deployt.

### Manuelle Browserabnahme (ausstehend)

Der lokale Vite-Server startete auf `http://127.0.0.1:5173/`. Der explizite Browseraufruf von `/stats/performance` endete im In-App-Browser mit **`net::ERR_CONNECTION_TIMED_OUT`**. Der alternative Zugriff auf das vorhandene Chrome-Fenster wurde mit **„could not determine the current browser URL on Windows with enough confidence to enforce policy“** gestoppt. Es liegt deshalb **kein visueller Nachweis und kein Screenshot der lokalen PR-F-Oberfläche** vor. Diese Steuerungsfehler sind kein Nachweis einer defekten Website.

Nachholen bei 1440, 390 und 375 px:

- Hall of Fame: Bestzeit standardmäßig, Durchschnitt, Saisonmedaillen, Ewig neutral. Im Netzwerk keine Medaillenreads bei Bestzeit/Durchschnitt/Ewig. Zwischen Saisons wechseln, während ein Read läuft; keine alte Wertung anzeigen.
- Performance: entfernte Kategorien fehlen; übrige Werte mit Referenz vergleichen. Kein Detail-RPC beim ersten Laden; erst beim Öffnen, wiederholtes Öffnen aus Cache. Ladefehler/Retry und Invalidierung in Staging testen. Karten, Zahlen, Info-Hover/Tab/Tap und Detailaufklappen auf Überläufe prüfen.
- Events: mit einer gültigen Zeit keine Führung; zweiter langsamer/gleicher/schneller Versuch; zwei Versuche desselben Spielers; Gast; DNF zwischen gültigen Zeiten; gleiche Zeitstempel. Live und geschlossene Darstellung müssen übereinstimmen. Reihenfolge, Rekordbilder und nur Trophy-spezifische Sonderstatistiken prüfen.
- Rivalry A–B plus A–C im selben Event: A erhält zwei; mehr als fünf Chaos-Belege bleiben kompakt und nennen den ungekürzten Gesamtwert.
- Profil: Bierwertungen vor Rivalries. Ticker: heutige aktive Eventmomente, saisonkorrekter SR, keine AK-/Gast-Ligarekorde, Lesbarkeit und horizontale Bedienbarkeit mit reduzierter Bewegung.
- Vor Produktivfreigabe echte Ladezeiten, Scrollverhalten und Interaktionen dokumentieren. Keine produktiven Schreibtests für diese Abnahme verwenden.

## Geänderte Dateien

- `docs/PERFORMANCE_PR_F.md`
- `scripts/check-performance-pr-f.mjs`
- `src/components/events/AttemptHistory.tsx`
- `src/components/events/EventAttemptList.tsx`
- `src/components/events/EventResults.test.tsx`
- `src/components/events/EventResults.tsx`
- `src/components/events/LiveEventBanner.tsx`
- `src/components/events/LiveLeadProgression.tsx`
- `src/components/stats/MetricRankingCard.tsx`
- `src/components/stats/PerformanceDevelopmentDetails.test.tsx`
- `src/components/stats/PerformanceDevelopmentDetails.tsx`
- `src/components/stats/PerformanceEventDetails.test.tsx`
- `src/components/stats/PerformanceEventDetails.tsx`
- `src/components/stats/PerformanceLazyDetails.test.tsx`
- `src/components/stats/PerformanceLazyDetails.tsx`
- `src/components/stats/PerformanceMedalTable.test.tsx`
- `src/components/stats/PerformanceMedalTable.tsx`
- `src/components/stats/PerformancePrF.test.tsx`
- `src/components/stats/PerformanceRankings.tsx`
- `src/constants/performanceDevelopmentMetrics.ts`
- `src/constants/performanceEventMetrics.ts`
- `src/constants/performanceSections.ts`
- `src/constants/statMetricRegistry.ts`
- `src/hooks/useHallOfFameMedals.test.ts`
- `src/hooks/useHallOfFameMedals.ts`
- `src/lib/eventLeadProgression.test.ts`
- `src/lib/eventLeadProgression.ts`
- `src/lib/liveLeaderboardTransition.ts`
- `src/lib/liveTickerMoments.test.ts`
- `src/lib/liveTickerMoments.ts`
- `src/lib/performanceMedals.test.ts`
- `src/lib/postAttemptExperience.test.ts`
- `src/lib/postAttemptExperience.ts`
- `src/pages/PlayerProfilePage.tsx`
- `src/pages/StatsPage.tsx`
- `src/services/dataGroupService.ts`
- `src/services/performanceDashboardService.ts`
- `src/services/performanceDetailService.test.ts`
- `src/services/performanceDetailService.ts`
- `src/services/performanceEvidence.ts`
- `src/services/performanceLeadershipQualification.test.ts`
- `src/services/performanceMedalContracts.test.ts`
- `src/services/performancePrB.test.ts`
- `src/services/performancePrC.test.ts`
- `src/services/performancePrFSql.test.ts`
- `src/types/database.ts`
- `src/utils/statMetricFormat.ts`
- `supabase/migrations/202611110080_performance_pr_f.sql`
- `supabase/tests/read_only/performance_pr_f_preflight.sql`
