# Stats Most Wanted Isolation

## Basis und Umfang

Basis: GitHub-main `5da3422` (PR64 gemergt), Arbeitsbranch
`refactor/stats-most-wanted-isolation`. Migrationen 001–062 unverändert.
Keine produktive SQL-Ausführung, keine Timeout-/RLS-/Badge-Änderung.
Kein Commit, Push oder Browserreview.

## Analyse vor Umsetzung

`StatsMostWantedPage -> DataPlatform["most-wanted"] -> getMostWantedSnapshot`:
drei parallele HTTP-Reads auf `most_wanted_endings`,
`most_wanted_progress` und `qualified_official_times`; saisonal auf die
entsprechenden `season_*`-Views mit `season_year`.
Die Matrix liest 100 Endings; Progress expandiert Endings erneut, inklusive
Minimum-Unterabfrage; Endings verwendet qualified_official_times für Ranking
und Counts. Der dritte Read lädt dieselben qualifizierten Zeiten noch einmal
für spätere Treffer und source_order. Der Client gruppierte und sortierte sie.

### Sichtbare Daten

- 100 Matrixfelder 00–99: Label, erreicht, Erstfinder-Avatar/Name.
- Detail: Erstfinder, Gastmarker, erste Zeit, Datum, Uhrzeit nur bei
  has_exact_time, Quellenlabel, Treffer- und Teilnehmeranzahl.
- Alle späteren Treffer: Identität, Name, Avatar, Gastmarker, Zeit;
  unveränderte kanonische Reihenfolge, keine Kürzung auf Top-N.
- Fortschritt, offene Felder, häufigstes Ending samt Trefferzahl.
- Top-5-Hunter zählen nur kanonische Erstfinder, nicht spätere Treffer.
  Bestehendes deutsches localeCompare und ID-Tie-Break bleiben clientseitig
  reine Präsentation. Historische Gäste ohne player_id/guest_id bleiben wie
  vorher ohne Hunter-Zuordnung; ihre Matrix-/Detailtreffer bleiben erhalten.

Zusätzlich transportierte, nicht angezeigte Werte: Progress.percent und
rarestAchievedEndings, first_source_id/event_id, source_order; vor allem
Zeitstempel, Datums-/Exact-Time-Flags und source_priority aller späteren Hits.
Die neuen späteren Treffer lassen ungenutzte Datums-/Zeitstempelfelder und
source_priority weg. source_type/source_order bleiben für den vorhandenen
Legacy-Performance-Adapter typkompatibel. Er wird auf der MW-Route nicht benutzt.
Die vollständige qualified-Rohliste wird weder separat gelesen noch zurückgegeben.
Weil die UI alle späteren Treffer zeigt, wächst deren kompakte Anzeigeliste
weiterhin linear; nur 100 Ersttreffer zurückzugeben wäre ein Funktionsverlust.

### Kanonische Regeln und dünne Nummerierung

Referenzen: Migration017 qualified_official_times/most_wanted_*, Migration026
season_*, Migration015 event_attempt_details.

- Approved, nicht gelöscht, keine DNF, Zeit nicht NULL, kein Attempt-AK.
- Reguläre Spieler nicht AK/archiviert; vorhandene Eventgäste bleiben erlaubt.
- Events dürfen nicht gelöscht sein; kein zusätzlicher Active-/Closed-Filter.
- Historisch: nicht gelöscht/out_of_competition; Gäste oder reguläre,
  nicht archivierte/AK-Spieler. Datum Berlin, keine erfundene genaue Uhrzeit.
- All-Time enthält auch eventlose Attempts; saisonale Attempts nur über
  vorhandenes Event und dessen start_date-Jahr >=2026, historische über
  attempt_date-Jahr >=2026.
- First Hit: occurred_at, source_priority (historisch1, Attempt2),
  source_order, source_id. Ending = mod(time_hundredths,100).
- Teilnehmerzählung: Gäste nach display_name, Spieler nach player_id,
  exakt wie bestehende View (nicht stillschweigend auf guest_id umgestellt).
- Attemptnummer: row_number pro event_id/player_id/guest_id, submitted_at/id,
  ALLE approved, nicht gelöschten Attempts vor DNF/AK-Qualifikation.
  Ohne sichtbares Event ist source_order0.
- Damit entfallen event_attempt_details, event_podium, event_bests,
  player_pb_progression und world_record_progression im neuen MW-Pfad vollständig.

Der neue RPC erzeugt immer 100 Felder; vorhandene auswählbare Saisons entsprechen
2026 bis aktuellem Jahr. Der Preflight wählt das höchste tatsächlich vorhandene
Jahr innerhalb dieses bisherigen Saisonbereichs; ohne Daten wird übersprungen.

Die historische Progress-View liefert progress_percent = reached_count*100,
nicht reached_count. Das bleibt für exakte Datenparität unverändert.
Die UI verwendet bereits mostWantedProgressPercent(reached,total), also
keine sichtbare Prozentänderung. least_common_hit_count ergänzt den RPC.

## Umsetzung und Requestzahl

Neue additive Migration:
`supabase/migrations/202610060063_stats_most_wanted_isolation.sql`

`public.get_most_wanted_snapshot(p_season_year integer default null) returns jsonb`
SQL STABLE SECURITY INVOKER, EXECUTE anon/authenticated, bestehende RLS.
Eine scope-frühe nummerierte Attemptquelle plus historische Quelle bilden eine
materialisierte qualified-Population. Ranking, Counts, First Hits und kompakte
Detailtreffer nutzen sie gemeinsam; Progress nutzt die fertigen 100 Endings.
Kein Wrapper um die drei alten Views und keine Unified-/Badge-/Rivalry-/Trophy-
oder Performance-RPCs im MW-Read.

Route: **1 fachlicher MW-Request** bei Cold Load statt3. Gleicher Scope im
20s-Erfolgs-TTL:0 neue Requests; expliziter Retry/relevante Invalidierung:1.
Die unveränderte Matrix und bestehende lokale Fehler-/Retry-Darstellung bleiben.

## Cache und Realtime

Kein neuer Cache: bestehender DataGroup-ReadCache mit `most-wanted:all-time`
bzw. `most-wanted:<Jahr>`. Identische laufende Reads teilen dasselbe Promise.
20s Success-TTL, Fehler nicht gespeichert, kurze bestehende Fokus-Fehlerbremse.
Run-Guards verwerfen verspätete Scope-Antworten. AbortSignal-Consumer verhindern
erneute Reads nach dem Unmount; ein schon laufender Shared Read darf auslaufen.
Invalidierungen während eines aktiven Reads werden serialisiert nachgeholt.

Relevante Tabellen: attempts, historical_attempts, players, events, event_guests.
event_participants beeinflusst die kanonische MW-Quelle nicht und löst keinen
MW-Reload mehr aus. Fotos/Pausen/Badge-Änderungen sind keine MW-Quellen.
Bei inaktiver Route wird nur der MW-Cache invalidiert, nicht nachgeladen.
Andere Routengruppen werden dadurch nicht zusätzlich aktiv.

## Alte Quellen und übrige Verbraucher

Alle bestehenden Views bleiben bestehen. SQL-Verbraucher umfassen
MW-Aktivitäten/Meilensteine, persönliche MW-/BINGO-/Badge-/Statistikprojektionen,
get_player_most_wanted_statistics und Performance062.
Der saisonale Global-Statistics-Service liest weiterhin seine Bestzeit aus
season_qualified_official_times. Der Legacy-loadPublicData-Einstieg nutzt
automatisch denselben neuen Snapshot-Service; er ist nicht der Route-Loader.
Keine Schema-Bereinigung in diesem PR.

## Dateien

- src/services/statsService.ts: ein RPC, Abbildung statt globaler Hit-Sortierung.
- src/services/dataGroupService.ts: Requestzahl1, relevante Realtime-Quellen.
- src/hooks/useDataPlatform.tsx: inaktiven MW-Cache invalidieren ohne Reload.
- src/types/database.ts, src/types/pr8.ts, src/types/index.ts: RPC/Payload,
  optionale ungenutzte Hit-Datumsfelder; Trophy-Daten unverändert erlaubt.
- src/services/statsService.mostWanted.test.ts, dataGroupService.test.ts,
  mostWantedSqlIsolation.test.ts: fokussierte Regressionen.
- Migration063 und die drei Read-only-SQL-Dateien unter supabase/tests/read_only.
- Diese Dokumentation; aktualisierte Most-Wanted-Modulkarte.

## Verifikation

Fokussierter Lauf: 9 Dateien /62 Tests grün.
check:quick: ESLint/TypeScript grün.
check:full: 151 Testdateien /757 Tests sowie Produktionsbuild grün.
git diff --check: grün; neue Dateien zusätzlich auf Whitespace geprüft.
SQL statisch geprüft: UNION mit 16 Spalten und kompatiblen Typen; sämtliche
CTE-Aliase/Projektionen, Aggregat-Gruppierung, First-Hit-Ordnung und Scopefilter.
Keine lokale PostgreSQL-/pgTAP-Installation: keine behauptete Compile-/Runtime-
oder Produktionsparität. Die statischen SQL-Tests ersetzen diesen Preflight nicht.

## Exakter SQL-Editor-Preflight

1. Gesamten Inhalt von
   `supabase/tests/read_only/statistics_most_wanted_preflight.sql`
   in EINEM SQL-Editor-Run ausführen.
2. Das Skript enthält BEGIN, exakte Migration063, SET LOCAL ROLE authenticated,
   zwei EXPLAIN (ANALYZE, BUFFERS, TIMING OFF), reale-source Parity, ROLLBACK.
3. Beide Execution Time-Werte ablesen: All-Time und höchstes vorhandenes
   unterstütztes Saisonjahr. Saisonlauf enthält die kleine Jahresauswahl.
4. Paritätszeilen müssen OK sein. SKIP nur bei fehlenden Saison-/Gast-/History-
   Daten; jeder FAIL enthält abweichende Endings oder den betroffenen Vergleich.
   Prüft vollständige Matrix-/First-Hit-/Count-/Label-Parität, Progressobjekt,
   spätere Trefferreihenfolge und dünne Attemptnummerierung.
5. Für wiederholte reine Runtime-Messung die vollständige Datei
   `statistics_most_wanted_runtime_check.sql` separat ausführen.
   Keine alten Quellen/Parity im Runtime-Skript. Die separate
   `statistics_most_wanted_parity.sql` setzt einen verfügbaren RPC voraus.
6. Bei SQL-Fehlern: Transaktion abbrechen/ROLLBACK ausführen; nicht committen.
   Das letzte Statement beider vollständigen Skripte ist ROLLBACK.
   Die Migration selbst wurde hier NICHT produktiv angewendet.

Ziel: p95 ideal<150ms, akzeptabel<500ms, >1s Warnsignal. Keine Messwerte erfunden.
Ein einzelner EXPLAIN ist kein p95; mehrere Cold-/Warm-Läufe getrennt sammeln.
Der Paritätslauf expandiert absichtlich die teuren alten Views; zur Bewertung
der neuen Runtime nur die isolierten EXPLAIN-Pläne verwenden.

## Browser-Network-Abnahme (noch offen, nicht ausgeführt)

- /stats/most-wanted Cold/Hard Reload: genau1 get_most_wanted_snapshot;
  keine separaten most_wanted_endings/progress/qualified_official_times-Reads.
- All-Time/Saison: p_season_year NULL/Jahr; korrekte Matrix/Erstfinder/Details.
- Schneller Scopewechsel: keine Übernahme alter Ergebnisse.
- Fokus innerhalb20s: kein neuer MW-Read; danach maximal1.
- Relevante Realtime-Änderung: aktiver MW-Consumer gezielt1 Read,
  inaktiver Consumer keiner; nächster Einstieg frische Daten.
- /stats/performance ohne MW-Request; /stats/badges ohne globale MW-Matrix.
- Requests der bestehenden App-Shell nicht mit MW-Modulrequests verwechseln.
- Desktop/Mobil: unveränderte Matrix, Guest-/History-Details, alle weiteren Hits.

Offene Risiken: tatsächliche SQL-Kompilation/RLS/Parität und Laufzeit müssen in
Supabase bestätigt werden; Detailpayload bleibt wegen aller sichtbaren Hits
O(n). Kein belastbarer p95 und kein manueller Browserreview aus lokalen Tests.
