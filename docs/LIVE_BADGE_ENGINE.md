# Pre-DK Live-Badge-Engine

## Request- und Fehlerverhalten

Nach einem erfolgreichen Attempt-Write startet der Client genau einen
optionalen Aufruf von `get_live_attempt_badge_unlocks(attempt_id)`. Der RPC
läuft mit 2,5 Sekunden Datenbanklimit; der Client bricht nach 3 Sekunden ab.
Fehler beeinflussen weder den gespeicherten Attempt noch den anschließenden
Refresh. Die vorhandene Celebration-Queue und ihre Session-Deduplizierung
bleiben zuständig für die Darstellung.

Der RPC liest nie `player_badge_award_sync_source` und startet keinen
Ledger-Sync. Event-Close bleibt die vollständige autoritative Synchronisierung.

## Live-Familien und Query-Scope

| Familie | Gelesene Tabellen / kleine Quellen | Scope | Vorhandener/ergänzter Index |
|---|---|---|---|
| `time-limits` | `attempts`, `historical_attempts`, `events`, `badge_definitions`, Ledger | PLAYER | neuer partieller Player-Sequenzindex; vorhandener historischer Player-Index |
| `valid-attempts` | `attempts`, `historical_attempts`, `events`, Definitionen, Ledger | PLAYER | wie oben |
| `event-attempts` | `attempts`, Definitionen, Ledger | PLAYER_EVENT | neuer partieller Event-Sequenzindex |
| `sub3-streak` | letzte `attempts` des Spielers im Event | PLAYER_EVENT | neuer Event-Sequenzindex |
| `flawless` | offizielle Event-`attempts` des Spielers über alle Events | PLAYER | neuer Player-Sequenzindex |
| `rapid-fire` | `attempts` des Spielers im 60-Minuten-Fenster | PLAYER | neuer Player-Sequenzindex |
| `favorite-time` | Attempts und historische Attempts mit exakt derselben Zeit | PLAYER | Player-Indizes; kein globaler Zeit-Group-By |
| `time-stopper`, `almost` | player-scoped aktuelle und historische Zeiten derselben Endung | PLAYER | Player-Indizes |
| `false-starter` | player-scoped DNF-Attempts | PLAYER | neuer Player-Sequenzindex |
| `reverse-gear` | höchstens fünf letzte relevante Attempts im Event | PLAYER_EVENT | neuer Event-Sequenzindex |
| `first-official-attempt` | aktuelle und historische gültige Attempts | PLAYER | nur bei aktiver Definition ausgegeben |
| `bingo` | player-scoped Attempt-Treffer und `bingo_line_cells` | PLAYER / enger Linienfall | Player-Indizes; das kanonische 22-Linien-Raster bleibt unverändert |
| `official-world-record` | qualifizierte aktuelle/historische Zeiten, jeweils nur `MIN` | GLOBALER MIN-SPEZIALFALL | vorhandener partieller Rankingindex und historischer Datenbestand; keine Progressions-View |
| `matrix-glitch` personal | player-scoped aktuelle/historische Sequenz | PLAYER | neuer Player-Sequenzindex |
| `matrix-glitch` global | gefilterter unmittelbarer Vorgänger im Event | PLAYER_EVENT / enger Spezialfall | neuer Event-Sequenzindex und Evidence-Indizes |

`flawless` bleibt ausdrücklich eventübergreifend: Nur `player_id` partitioniert
die fortlaufende Serie; ein DNF, nicht aber ein Eventwechsel, beendet sie.

## Matrix-Evidenz

`matrix_glitch_event_evidence` hält ausschließlich globale Event-Glitches. Der
zweite Attempt ist Award-Empfänger und Source; der unmittelbar vorherige
qualifizierte reguläre Event-Attempt wird als Evidenz referenziert. Live wird
idempotent über `source_attempt_id` geschrieben. Updates und Deletes bauen nur
die betroffenen Eventsequenzen neu auf. Vor dem Event-Close-Ledger-Batch wird
das zu schließende Event ebenfalls neu ausgewertet, damit ein ausgefallener
Live-Aufruf keine kanonische Evidenz verliert.

## Bewusst deferred

Nicht im Attempt-RPC enthalten sind `event-wins`, `win-streak`,
`activity-years`, `community`, `events-played`, `podiums`, `precision`,
`bingo-completion`, `teamwork`, `event-lead-time`, `rivalry`, `first-win`,
`photo-finish` und `wooden-bronze-medal`.

## Statische Planrisiken

Eine lokale PostgreSQL-/Supabase-Runtime steht nicht immer zur Verfügung.
Ohne `EXPLAIN ANALYZE` bleiben drei kontrollierte Risiken:

- Player mit sehr großer All-Time-Historie benötigen für persönliche Matrix-
  Reihenfolge und BINGO weiterhin einen player-scoped Scan.
- World Record liest den globalen Minimalwert, verwendet aber keine
  chronologische Progression und keinen Spieler-Fanout.
- Eine Matrix-Korrektur rekonstruiert das betroffene Event vollständig. Sie
  rekonstruiert niemals andere Events oder die globale Historie.
