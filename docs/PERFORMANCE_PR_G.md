# PR G – Performance-Timeout

Basis: `origin/main` bei `5fa7c75` (Merge von PR #84). Migration 080 ist der produktive Vergleichsstand. PR G enthält Migration 081 und lokale Prüfwerkzeuge.

## Öffentlicher Ausgangsstand

Am 12.11.2026 wurden die RPCs der öffentlichen Supabase-API mit dem anonymen Website-Zugang nacheinander je dreimal aufgerufen. Die Tabelle zeigt HTTP-Rundlaufzeiten inklusive Netzwerk und Antworttransfer. Das serverseitige 3-Sekunden-Limit ist davon zu unterscheiden.

| RPC | Saison 2026 | All-Time |
| --- | --- | --- |
| `get_performance_event_metrics_v2` (PR B) | 304–480 ms, 3/3 erfolgreich | 467–1.398 ms, 3/3 erfolgreich |
| `get_performance_development_metrics_v2` (PR C) | 214–819 ms, 3/3 erfolgreich | 431–766 ms, 3/3 erfolgreich |
| `get_statistics_performance_dashboard` | 1.450 und 1.901 ms erfolgreich, 1 × HTTP 500 / `57014` | 3 × HTTP 500 / `57014` |
| `get_statistics_badge_dashboard` | 309–457 ms, 3/3 erfolgreich | Im All-Time-Medaillenmodus nicht angefragt |

Der Timeout trat auch ohne parallele BINGO-Anfrage auf. Die erfolgreichen Gesamtantworten für 2026 hatten jeweils 104.297 Byte. Die Messung bestätigt den Gesamt-RPC als Ort des Timeouts. Die Einzelzeiten enthalten HTTP-Kosten und lassen sich nicht zu einer Serverzeit addieren.

## Ursache und Änderung

- **PR B:** Migration 080 baut die paarweise Chronologie für Rivalry und Chaos separat auf. Die Rivalry-Quelle führt über `rivalry_pair_events` und `event_pair_summaries`; allein Fenstergrenzen und direkte Takeovers benötigen dort separate Auswertungen von `event_pair_attempt_states`. Chaos benötigt dieselbe Chronologie samt vorheriger PBs. Migration 081 liest die kanonischen Paarzustände einmal für beide Auswertungen und verwendet für Rivalry nur direkte Takeovers zwischen zwei eindeutigen Führenden. Sie behält drei Takeovers pro Paar/Event für Rivalry bei. Chaos verwendet weiterhin die strengere PB-Überholung und das kanonische `event_lead_windows`. Die Versuchsnummern für Detailbelege werden nur für den angefragten Spieler berechnet.
- **PR C:** Migration 080 verbindet `qualified_official_times` über die Versuch-ID mit der Saison-View, die dieselbe Qualifikationsquelle erneut für Event- und historische Versuche auswertet. Migration 081 übernimmt Saisonzuordnung und Grenze ab 2026 aus 026 mit einem schmalen Metadaten-Join. Eventversuche zählen zum Jahr des Eventstarts, historische Versuche zum Jahr des Versuchsdatums. Frühere Karrierezeiten bleiben als PB- und Chronologiekontext enthalten. Plateau-Belegarrays werden nur für Detailaufrufe aufgebaut.
- Migration 081 ersetzt ausschließlich die beiden B/C-Hilfsfunktionen mit unveränderten Signaturen, `STABLE SECURITY INVOKER` und bestehenden Grants. Die Basismetriken, der Dashboard-RPC, die kanonischen Views, Sequenzen und die getrennte BINGO-Abfrage behalten ihren bisherigen Code. Der Requestgraph, der gemeinsame Cache und seine Invalidierung bleiben gleich. Die Hall of Fame veröffentlicht erst nach beiden erfolgreichen Quellen ein Saisonranking. All-Time lädt im Medaillenmodus keine Live-Wertung.

Der lokale Vergleich mit einem Dashboard, das nur für die Messung B und C auslässt, isoliert den zusätzlichen Aufwand. Die anonymen RLS-Policies für Spieler, Events, Versuche, Gäste und historische Zeiten sind im Test aktiv. Der Prüfstand verwendet die produktiven Paar-, Leadership-, Zeitqualifikations- und Saison-Definitionen sowie nachgebildete Eingangsrelationen für Podium, Rekordhistorie und andere Aggregate. Die reale Supabase-Auslastung, HTTP-Verbindung und vollständige Produktionspläne sind dort nicht abgebildet. Welcher Plan oder welche Lastsituation den einzelnen produktiven Abbruch ausgelöst hat, ist ohne serverseitigen Trace offen.

## Lokaler Vorher-/Nachher-Vergleich

PGlite mit 1.537 für `anon` sichtbaren Eventversuchen. Werte in ms als Median und Spannweite aus fünf Aufrufen je Kombination auf demselben Datenstand.

| Scope | Abfrage | 080 | 081 |
| --- | --- | ---: | ---: |
| 2026 | PR B | 300 (296–305) | 124 (123–128) |
| 2026 | PR C | 88 (87–88) | 55 (55–60) |
| 2026 | Basis ohne B/C, Diagnose | 400 (396–428) | 404 (394–409) |
| 2026 | Gesamt-RPC | 778 (778–781) | 570 (569–607) |
| All-Time | PR B | 309 (300–626) | 130 (129–131) |
| All-Time | PR C | 101 (99–107) | 73 (72–73) |
| All-Time | Basis ohne B/C, Diagnose | 491 (489–520) | 490 (486–512) |
| All-Time | Gesamt-RPC | 1.205 (1.203–1.224) | 701 (694–714) |

Der Gesamt-RPC ist im Median 27 % schneller für 2026 und 42 % für All-Time. Der Basis-Vergleich bleibt stabil. Die 2026-Ausführungspläne der Hilfsfunktionen bestätigen die vermiedene Arbeit: PR B hat 7 statt 14 `WindowAgg`-Knoten und 12 statt 19 `Sort`-Knoten. PR C liest im Plan historische Versuche und die Podium-Relation jeweils einmal statt zweimal; seine Chronologiefenster bleiben erhalten. Die lokalen Nachher-Werte liegen deutlich unter 3 s. Die Reserve auf der öffentlichen API mit 081 ist noch in Staging nachzuweisen.

## Prüfungen

- SQL-Vergleich unter `anon` mit `statement_timeout='3s'`, gleichen Daten und fünf gemessenen Aufrufen je RPC und Scope nach einem Aufwärmaufruf. Der Runner gibt zusätzlich die Ausführungspläne der beiden Hilfsfunktionen als aggregierte Knotenzahlen aus.
- Der Vergleich prüft den vollständigen JSON-Payload, die beiden B/C-Hilfsfunktionen und alle Spielerbelege gegen 080 in 2026, All-Time, 2027 und 2025. Die vorhandenen 76 PR-F-SQL-Prüfungen laufen im selben Runner vorab. Die Testdaten spielen bestehende Versuchsmuster über mehrere Events und Jahre erneut ab. Sie enthalten Gäste, DNF, Gleichstände, gleichzeitige Versuche, mehrere Rivalry-Paare, aktive Events, frühere historische Zeiten, gemischte Chronologie und einen Jahreswechsel zwischen Eventdatum und Versuch.
- 67 fokussierte Vitest-Tests in 14 Dateien bestanden, darunter Dashboard, Eligibility, Ranggleichstände, BINGO-Ladeverhalten, Hall-of-Fame-Medaillen und Detailverträge. `npm run check:quick`, Produktionsbuild und `git diff --check` bestanden. Vite meldet Warnungen für Platzhalter öffentlicher Assets und einen Chunk über 500 KB.

SQL lokal reproduzieren: `@electric-sql/pglite@0.5.16` temporär außerhalb des Repositories installieren und `node scripts/check-performance-pr-g.mjs <absoluter-Pfad-zu-pglite/dist/index.js>` aus dem Repository ausführen. Der Runner verwendet eine flüchtige Datenbank.

## Veröffentlichungsreihenfolge

1. In einer isolierten Staging-Datenbank mit produktionsnahem Datenstand und Migration 080 die beiden B/C-Reads und den Gesamt-RPC für 2026 und All-Time messen. Je fünf Aufrufe unter `anon` mit dem echten 3-Sekunden-Limit, sowohl über PostgREST als auch für Pläne im SQL-Client. Dort `SET LOCAL ROLE anon` und `SET LOCAL statement_timeout = '3s'` in einer Read-only-Transaktion verwenden. Serverzeit, HTTP-Rundlaufzeit, Status und Streuung getrennt erfassen. Für verschachtelte Pläne in Staging die Funktionskörper mit festen Parametern erklären oder Nested-Statement-Tracing verwenden.
2. Migration 081 in Staging einspielen und mit denselben Daten und Parametern wiederholen. JSON-Inhalte bzw. Hashes vergleichen und je Scope auch Erstaufruf, Wiederholung und realistische parallele bestehende Routen-Reads prüfen. Release-Kriterium: keine `57014`-Fehler und deutliche Reserve unter 3 s auch in den langsameren Staging-Läufen.
3. Mit dem bestehenden Frontend Performance und Saison-Medaillenspiegel abnehmen. Bei einem Fehler in einer Quelle muss der Medaillenspiegel im Fehlerzustand bleiben; nach erfolgreichem Retry vollständige Platzierungen anzeigen. Saisonwechsel, All-Time-Hinweis und Detailbelege prüfen. Keine zusätzliche Frontend-Version ist technisch für 081 erforderlich.
4. Nach erfolgreicher Staging-Abnahme und separater Freigabe 081 produktiv einspielen. Die gleichen öffentlichen Reads erneut messen. Bei Regression eine neue additive Migration mit den beiden Funktionsdefinitionen aus 080 vorbereiten. Das Rollen-Timeout bleibt bei 3 s.
