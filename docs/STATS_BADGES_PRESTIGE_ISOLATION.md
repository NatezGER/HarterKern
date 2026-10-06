# Stats Badges & Prestige Isolation

## Basis und Status

Branch: refactor/stats-badges-prestige-isolation, Basis origin/main 8319770
(PR64/65). Produktive Migrationen 001–063 bleiben unverändert. Keine Award-,
Evidence-, Schwellen-, Trigger-, RLS- oder Timeout-Änderung; kein Backfill.
Implementierung lokal; kein Commit, Push, Browserreview oder produktiver SQL-Lauf.

Der Nutzer hat ausdrücklich freigegeben: Das Ledger ist für Badge-Ereignisse
verbindlich. Nachweisbare Erweiterungen gegenüber Legacy sind erwartete
Unterschiede, keine erforderliche Legacy-Parität.

## 1. Alter Requestgraph und Lebenszyklus

StatsBadgesPage:
- DataPlatform required statistics: getPlayers (players + player_statistics,
  saisonal entsprechender Statistikscope), world_record_history/season_*,
  global_statistics; Saison zusätzlich qualified-Bestzeit.
  Zusammen 4 All-Time /5 Saison.
- Optional badge-rarity: get_badge_rarity, bereits ledgerbasiert, 1 Read.
- Unabhängiger useStatisticDashboard(season, statistics.version):
  get_unified_statistics_dashboard, 1 weiterer Read.
- Summe 6/7 fachliche Reads; keine MW-Matrix mehr.
- Mount/Scopewechsel starten den Plan; statisticsVersion aktiviert danach den
  unabhängigen Unified-Hook. Fokus/Visibility nutzen ReadCache-TTL; relevante
  Realtime-Ereignisse invalidierten statistics und rarity und lösten über die
  neue Version zusätzlich Unified aus. In-flight-Dedupe verhinderte nur
  identische Requests, nicht die unterschiedlichen unnötigen Reads.
- Globaler AwardAssetProvider: einmal award_assets, unabhängig vom Stats-Modul.
- AdminBadgeCatalogSlot lädt nur unlocked. Dann aktive Definitionen,
  player_badge_award_achievements und zwei Progress-RPCs
  (get_admin_badge_family_progress/get_rivalry_badge_progress).
  Dieser explizite Admin-Consumer bleibt unverändert; er gehört nicht zum
  öffentlichen Zwei-Read-Ziel.

## 2. Sichtbare Sektionen und ungenutzte Daten

Achievements/BINGO zeigt aus Unified genau:
bingo-fields, rare-hunter, badge-total, badge-bronze, badge-silver,
badge-gold, badge-diamond, badge-positive, badge-consolation.
Die sieben Career-Badge-Metrics nur All-Time; BINGO/Rare Hunter season-aware.
Top5-UI auf serverseitig maximal10 Rankingzeilen bleibt unverändert.
Spielerstammdaten, WR-Historie, Global-Statistiken und alle anderen Unified-
Performance-/Rivalry-/Event-/Rekord-Kennzahlen wurden geladen, aber hier nicht
angezeigt. Registry und Competition-Rank-Semantik bleiben unverändert.

Badge-Seltenheit zeigt bestehende aktive Badge-Definitionen, Stufen,
Empfängerzahl/Nenner/Quote und Empfänger-Disclosure. get_badge_rarity bleibt
unverändert: aktive reguläre Spieler, tatsächlich persistierte Awards,
aktiver Katalog. Profilgalerie get_player_visible_badges bleibt unverändert.

Auf /stats/badges existiert KEIN Prestige-Feed. Er wird auch nicht neu eingebaut.
Der bestehende Dashboard-Consumer erhält den neuen Feed-RPC.

## 3. Legacy-Eligibility und Ledger

player_badge_awards ist eine View, NICHT die persistierte Tabelle.
player_badge_award_ledger ist die autoritative persistierte Quelle.
player_badge_award_sync_source vereinigt Eligibility-Quellen ausschließlich
für den bestehenden Write-/Sync-Pfad. Die neuen Reads rufen sie nicht auf.

Alter Feed: prestige_activity_feed -> visible_player_badges ->
public_player_badges -> player_badge_awards und zusätzliche ältere Award-Views,
mit Event-, BINGO-, Streak-, Progressions-/Rarity-/Next-Badge-Abhängigkeiten.
Der aktuelle Ledger enthält zusätzlich p115-Erweiterungen, Rivalry und globale
Matrix-Glitch-Evidence. Public/Visible-Legacy-Views spiegeln diesen Quellumfang
nicht vollständig wider. Gleicher Matrix-Glitch-Award-Key kann im Ledger einen
früheren globalen statt des Legacy-persönlichen Treffers repräsentieren.

Alte Views bleiben für andere Consumer erhalten; keine Schema-Bereinigung.
Auch player_bingo_statistics bleibt erhalten, wird vom neuen Pfad nicht gelesen.

## 4. Neue Read-Architektur und RPCs

Migration: supabase/migrations/202610060064_stats_badges_prestige_isolation.sql

1. get_statistics_badge_dashboard(p_season_year integer default null) -> jsonb
   - Nur die neun sichtbaren Kennzahlen.
   - Badge-Familienmaximum und Specials aus Ledger + aktiven Definitionen,
     exakt bestehende 057-Ladder-Zählung, positive_special/consolation getrennt.
   - BINGO/Rare Hunter aus EINER gemeinsamen qualifizierten regulären
     Attempt-/History-Endingspopulation. Keine Nummerierung/Eventdekoration,
     keine MW-Matrix. Bestehende Qualifikation/Season und <=3-Popularität.
     Diese zwei sichtbaren Werte sind nicht aus Award-Schwellen rekonstruierbar.
   - Gleiche Durchschnitts-Summaries, Treffer-/Nennerwerte und Ranking-Ties.
2. get_prestige_activity_feed_v2(p_limit integer default 18) -> table
   - Badge-Familienwinner wie get_player_visible_badges aus Ledger.
   - Awardzeit, Source-Event, Namen/Tier aus kanonischen Ledger-/Katalogwerten;
     aktuelle Spielernamen/Avatare und Eventnamen wie bisher.
   - WR aus world_record_history; PB aus player_pb_history mit bisherigem
     WR-Ausschluss; Group Milestones aus group_milestone_progress.
   - Bestehende Texte, Typen, IDs und Prioritäten; Datum/Priorität absteigend.
     activity_id stabilisiert vorher nicht definierte echte Sortierties.
   - Keine Legacy-Feed-Abfrage intern.

Beide Funktionen: SQL STABLE SECURITY INVOKER, anon/authenticated EXECUTE,
bestehende RLS. Keine Award-Schreiboperation. Migration nimmt Ledger und
badge_definitions idempotent in vorhandene supabase_realtime-Publication auf
(DDL, keine Daten-/Policyänderung). Fehlt die Publication, erfolgt kein Anlegen;
das ist im Deployment gesondert zu prüfen.

Neue öffentliche Badge-Route:
navigation(0 Reads) + badge-statistics(1) + badge-rarity(1) = **2 Reads**.
Beide Sektionen unabhängig fehlertolerant; kein statisticsVersion/Unified-Hook.
Keine Performance/MW/Rivalry/Trophy/Medal-Reads. Kein zusätzlicher Feed auf Badges.
Dashboard-Feed ersetzt nur den bisherigen Prestige-Read durch v2; sein zweiter
bestehender most_wanted_activity_feed-Read bleibt für die MW-Aktivitäten bestehen.
Er gehört NICHT zur Badge-Route und wurde nicht stillschweigend entfernt.

## 5. Cache, Fokus, Realtime und Grenzen

Ein bestehender DataGroup ReadCache, keine konkurrierende Service-Cache-Schicht.
20s Success-TTL, gleiches Promise bei In-flight-Dedupe, Fehler nicht gespeichert.
badge-statistics nach Saison; Rarity/Prestige bewusst All-Time-Schlüssel auch bei
Saisonwechsel. Fokus innerhalb TTL kein neuer Read. Retry invalidiert nur seine
Gruppe. Run-Guards und zusätzlicher Seiten-Scopecheck verhindern alte Antworten.
Inaktive Badge-/Prestige-Gruppen werden invalidiert, nicht nachgeladen; verlassene
Consumer erzeugen keine erneute Dirty-Read-Schleife.

Ledger-/Definitionsänderung: Rankings/Rarity/Feed und Profil-Badges gezielt.
Attempts invalidieren Rarity NICHT mehr pauschal. Nur potentiell qualifizierte
Attempt-/History-Änderungen melden badge-qualified-sources für Rankings/BINGO
und den aktiven Feed. DNF/AK/pending/gelöschte Inserts werden ausgeschlossen.
Bei UPDATE/DELETE enthält RLS den alten Datensatz ggf. nur als PK; dann muss
konservativ invalidiert werden. Das ist keine Behauptung, ein neuer WR/PB sei
bereits bewiesen. BINGO kann sich ohne Award ändern; deshalb bleibt dafür eine
qualifizierte Source-Invalidierung nötig. Kein Eligibility-Read zur Eventprüfung.
Bestehendes Debouncing und Cache-Serialisierung bündeln Echo-/Burst-Ereignisse.

Spieler-/Eventänderungen bleiben für Identität, Eligibility und Saisons relevant.
Kein neuer Hintergrund-Read auf anderen Stats-Routen.

## 6. Tests und SQL-Sanity

Fokussiert: 9 Dateien /50 Tests grün, inklusive echter Service-/Route-Aufrufzählung,
Scope/Ties-Mapping, Cache/TTL/Invalidierung, stale/unmount Guards, UI-Fehlerisolation,
Rarity-UI, Feed-Typen/Reihenfolge, Realtimefilter und statische SQL-Verträge.
SQL statisch geprüft: sechs kompatible Metric-UNION-Spalten (explizite numeric-
NULLs), 15 Feed-Spalten, CTE-/Alias-Sichtbarkeit, Aggregat-/Window-Scope,
keine UUID-Aggregate. Skripte enthalten exakt Migration064 und abschließendes
ROLLBACK. Keine lokale PostgreSQL-/pgTAP-Installation: keine behauptete
DB-Kompilation/Runtime/Produktionsparität.
Vollprüfung erfolgreich: 154 Testdateien / 773 Tests, ESLint, TypeScript und
Produktionsbuild grün. check:quick ebenfalls erfolgreich. Abschließender
git diff --check ohne Befund; bestehende Migrationen001–063 unverändert.

## 7. Exakter manueller Supabase-Preflight

Vollständigen Inhalt von
supabase/tests/read_only/statistics_badges_prestige_preflight.sql
in EINEM SQL-Editor-Run ausführen:
BEGIN -> exakte064 einschließlich temporärer Publication-DDL -> authenticated ->
EXPLAIN All-Time-Rankings, höchste vorhandene Saison, Rarity, Feed ->
Read-only-Parität -> ROLLBACK. Keine erfundenen IDs/Testdaten.

Der separat ausführbare Runtime-Check
supabase/tests/read_only/statistics_badges_prestige_runtime_check.sql
enthält nur Migration/Grants/Publication-DDL, Rolle, die vier neuen/geeigneten
EXPLAIN-Pfade und ROLLBACK; KEIN Unified-/Legacy-Feed-Vergleich.
Zur SQL-Kompilation und Einzel-Runtime zuerst diese kleine Datei verwenden.

Paritätsdatei (auch vollständig im Preflight):
supabase/tests/read_only/statistics_badges_prestige_parity.sql
- Sichtbare Metrics müssen exakt mit der gefilterten produktiven Unified-
  Vergleichsquelle übereinstimmen (nur hier, nie im Laufzeitpfad).
- Galerie-Awards/Tiers/Zeit und Rarity-Nenner/Quote/Empfängerzahlen gegen Ledger.
- Vollständige neue/alte Feeds vor Limitierung vergleichen.
- WR/PB/Milestones: jede Abweichung FAIL_CANONICAL_NON_BADGE.
- Neue Badges ohne passenden Galerie-/Ledger-Proof: FAIL.
- Fehlender Legacy-Award ohne belegten Familiennachfolger: FAIL.
- Erwartete Ledger-Ergänzungen, Familiennachfolger und Zeitabweichungen explizit
  EXPECTED_*; Matrix Glitch ausdrücklich EXPECTED_MATRIX_GLITCH_LEDGER_VS_LEGACY.
- Nicht automatisch erklärbare weitere Unterschiede: REVIEW, nicht verstecken.
- Separate Ergebniszeilen für award_key_or_payload, timestamp und order;
  Summary zählt erwartete Änderungen, Fehler, Reviews und Matrix-Konflikte.
- Sortierung übernimmt Zeit/Priorität; ID löst vormals undefinierte Ties auf.
- Fehlende Saison: SKIP. Nicht vorhandene Konflikte ergeben Summary-Zähler0.

Die tatsächliche Produktionsbetroffenheit ist OHNE diese Ausgabe unbekannt.
Keine Null-Betroffenheit aus grünen Unit-Tests ableiten. Ergebniszeilen zur
fachlichen Abnahme aufbewahren/teilen; EXPECTED ist keine Datenkorrektur.

Legacy-Vergleiche können selbst timeouten. Das ist ein offenes Legacy-Problem,
nicht automatisch ein neuer RPC-Fehler. Bei SQL-Fehler Transaktion explizit
ROLLBACK beenden; keine Timeouterhöhung. Runtime-Datei separat nutzen.
Ein einzelner EXPLAIN liefert keine p95-Aussage; wiederholte Messungen nötig.
Ziel ideal<100–150ms, akzeptabel<500ms, >1s Warnsignal. Keine Messung erfunden.

## 8. Browser-Network-Abnahme (vor Merge noch offen)

- Badges Cold/Hard Reload All-Time und Saison: genau2 fachliche RPCs.
- Kein Unified, MW, Performance, Rivalry-Hub, Trophy, Medal-Fan-out.
- Nur globales Award-Asset-Mapping zusätzlich; Adminreads nur unlocked.
- Scopewechsel nur Rankings, frische All-Time-Rarity wiederverwenden.
- Fokus innerhalb20s kein neuer Badge-/Prestige-Read.
- Ledgeränderung aktiv gezielt refreshen; inaktiv kein Hintergrundread.
- DNF/AK-Insert kein Rarity-/Badge-Stats-Reload; valide BINGO-Änderung Rankings.
- Schnelle Navigation/Scopewechsel und Fehler/Retry ohne alte Scope-Daten.
- Unveränderte Badge-Tiers/Rarity/Empfänger/BINGO-UI, mobile und Desktop.
- Dashboard: v2-Feed statt Legacy, MW-Aktivitäten weiterhin enthalten.

## Geänderte Dateien

- src/pages/StatsBadgesPage.tsx und .test.tsx
- src/services/badgeDashboardService.ts und .test.ts
- src/services/badgeRealtime.ts
- src/services/badgePrestigeSqlIsolation.test.ts
- src/services/dataGroupService.ts und .test.ts
- src/services/dataPlatformRepository.ts und .test.ts
- src/services/statsService.ts
- src/hooks/useDataPlatform.tsx
- src/types/database.ts, src/types/index.ts
- additive Migration064
- drei statistics_badges_prestige_*.sql unter supabase/tests/read_only
- docs/MODULES.md und diese Dokumentation

Offen: tatsächliche Supabase-Kompilation, Rollen-/Publication-Verhalten, Parität,
Runtime/p95 und Browserreview. Kein automatischer Merge/Produktivlauf.
