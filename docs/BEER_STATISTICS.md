# Bierstatistik – isolierter Stats-Tab (072)

## Basis und Populationen
Geprüfte Basis: origin/main c1fe64e (PR 74), Snapshot-Migration 071.
072 ist die nächste freie additive Migration. Keine bisherigen Migrationen
oder allgemeinen Verbrauchs-, Profil-, Compare- oder Badge-Regeln ändern sich.

Nur attempts.beer_brand ist die Markenquelle, nie der Eventstandard.
NULL/Leertext bleibt unbekannt. Keine Backfills, Normalisierung oder Aliase;
exakter gespeicherter Text ist der Gruppenschlüssel.

Konsum: approved, nicht gelöscht, echtes nicht gelöschtes Event, kein DNF,
positive reale Zeit und dokumentierte Marke. Reguläre Spieler, Gäste, AK
(einschließlich Attempt-AK) zählen. Auch archivierte Spieler behalten ihre
dokumentierte konsumierte Menge. Eine gültige Zeile entspricht 0,2 Litern.
Umrechnung nutzt zentral beerLitersForAttempts; keine neue Frontend-Eligibility.
Die globale „Gemeinsam getrunken“-Definition bleibt ausdrücklich unverändert.

Leistung: canonical official_event_attempts aus 060, is_valid_time und
positive Zeit; damit nur permanente, nicht archivierte, nicht-AK-Spieler
und nicht-AK-Attempts. Gäste und DNF sind ausgeschlossen. Keine historischen
Standalone-Zeiten. Derselbe Performance-Bestand versorgt alle Markenwerte
und den persönlichen Gesamt-Ø.

Gäste: vorhandener normalized_name-Schlüssel wie im guest_count aus 069;
player:UUID und guest:normalized_name bleiben getrennt. Keine neue Fuzzy-
oder Namens-Merge-Logik. Gleiche normalisierte Gastnamen über Events zählen
wie bisher als dieselbe Gastidentität; dies kann reale Namensvetter verbinden.

## Scope und Wertungen
NULL = All-Time; Saison = Event-start_date-Jahr ab 2026, entsprechend dem
bestehenden Saisonkontext und season_global_statistics. Auch aktive Events
zählen wie in official_event_attempts. Attemptzeitpunkt bestimmt nicht die
Saison. Sämtliche Mengen, Events, Personen, Rankings und Baselines sind scoped.

Rohdaten ab einem gültigen Versuch. Qualifizierte Marke: mindestens zwei
reguläre Leistungsversuche insgesamt. Qualifiziertes Spieler/Marke-Paar:
mindestens zwei solche Versuche desselben Spielers, keine Mindesteventzahl.

Lieblingsbier: niedrigster ungerundeter Ø, danach mehr Versuche, schnellere
Bestzeit, Markenname (C-Collation). Bester Spieler pro Marke entsprechend,
abschließend UUID. Bestes Bier der Liga: Ø, Anzahl, Bestzeit, Markenname.
Die angezeigten Leistungsplätze sind diese deterministische Produktreihenfolge.
Mengenliste: Anzahl absteigend, Markenname; häufigster Trinker: Anzahl,
Name, stabiler Personenschlüssel.

Gesamt-Ø: ALLE gültigen regulären Eventzeiten des Spielers im Scope, inklusive
NULL/leerem Bier. Effekt = Lieblingsbier-Ø minus Gesamt-Ø. Negative Werte
sind schneller. Das Fun-Ranking zeigt nur echte Verbesserungen (delta < 0),
die Lieblingsbierliste auch neutrale/langsamere Werte. Kein Kausalitätsnachweis.
SQL rechnet ungerundet; die UI formatiert auf 0,01 s und benennt Rundungsgleichstand.

Sortenvielfalt: reguläre Spieler, jede exakte Marke ab einem Versuch.
Reihenfolge: Sortenzahl, dokumentierte Versuche, Spielername, UUID.

## Architektur / Requests
Route /stats/beer nutzt bestehende StatsNavigation und SeasonProvider.
Optionale DataGroup beer-statistics lädt genau einen security-invoker,
stable, read-only RPC get_beer_statistics_dashboard(integer).
Ein kompakter JSON-Payload: summary, brands, favorites, effects, variety.
Keine Requests pro Spieler/Marke, keine Frontend-Ranking-Engine.

Bestehender DataGroup-Cache: 20 Sekunden, In-flight-Dedupe, Scope-Key,
Run-Guard gegen verspätete Antworten, bereichslokaler Retry.
Realtime für attempts/events/players/event_guests invalidiert alle Scope-Caches;
aktive Route lädt gebündelt nach, inaktive wird nur invalidiert.
Fokus/Sichtbarkeit verwenden bestehende Stale-Prüfung und Debounce.
Auf fremden Routen wird beer-statistics nicht geladen.

Hero: BeerVolumeCard (compact, damit kein falscher „offiziell“-Populationstext)
und MilestoneArtwork nutzen die vorhandenen Mengenschwellen.
Für verfügbare hochgeladene Bilder gibt es bei nichtleerem Dashboard einen
zusätzlichen bestehenden, gecachten getMilestoneContent-Read. Keine Bilder
pro Marke/Spieler. Fehlender Content blockiert die Statistik nicht.
Kalt: 1 Statistik-RPC + 1 optionaler Editorial-Read; keine neue Subscription.

## Kosten und offene Abnahme
Konsumscan nur dokumentierte, gültige scoped Attempts; Performance-Scan über
die dünne kanonische View, kein Ranking-/Ledger-/BINGO-/Rivalry-View-Graph.
Vollständige scoped reguläre Eventzeiten bleiben für den korrekten Gesamt-Ø
notwendig, aber nur für Spieler mit dokumentierten Bieren. Ein früher Semi-Join
auf deren IDs vermeidet Baselines völlig unbeteiligter Spieler. Materialisierte CTEs werden innerhalb dieses RPC wiederverwendet.
Keine vorsorglichen Indizes, kein statement_timeout-Workaround.
Payload wächst mit Marken/Spielern, nicht mit einzelnen Attempts.

SQL-Laufzeit/Queryplan mit realer Datenmenge noch nicht gemessen; PostgreSQL/
pgTAP lokal nicht verfügbar. Keine produktive Ausführung. Vor Deployment
Migration 072 im transaktionalen Supabase-Preflight prüfen, einschließlich
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) für All-Time und vorhandene Saison.
Cold/Reload-Laufzeiten und langsamster Request sind manuell zu erfassen.

## Geänderte Dateien
Neu: src/pages/StatsBeerPage.tsx, src/components/stats/BeerStatisticsContent.tsx,
src/services/beerStatisticsService.ts, src/types/beerStatistics.ts,
src/lib/beerStatisticsFormat.ts, src/pages/StatsBeerPage.test.tsx,
src/services/beerStatisticsService.test.ts,
supabase/migrations/202610160072_beer_statistics.sql,
supabase/tests/database/beer_statistics.sql und dieses Dokument.
Angepasst: src/App.tsx, src/components/stats/StatsNavigation.tsx,
src/components/stats/StatsNavigation.test.tsx, src/pages/StatsRouting.test.ts,
src/hooks/useDataPlatform.tsx, src/services/dataGroupService.ts,
src/types/database.ts und src/types/index.ts.

## Tests / manueller Check
SQL-Fixtures: supabase/tests/database/beer_statistics.sql, nur disposable
lokale DB mit 072/pgTAP; ROLLBACK, niemals produktiv ausführen.
Fokussierte Service-/Route-/UI-Tests sowie bestehende Stats-Tests.

Manuell: 360/390/430 und Desktop, 80-Zeichen-Marken, Empty/Error/Retry,
All-Time/Saisonwechsel, schneller Wechsel mit laufendem Request, Gast/AK/DNF,
fehlende Bierangabe in der Baseline, individueller Snapshot-Override,
Eventstandardwechsel, Realtime und Hard Reload, vorhandene Mengenbilder.
CSS-Struktur ist getestet, echte Browser-Pixelprüfung bleibt offen.
