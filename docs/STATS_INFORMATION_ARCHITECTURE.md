# Stats-Informationsarchitektur

## Ausgangspunkt und Status
- origin/main: bbe98a5cb76b2d7d7929089c3352a11db71da621 (PR66).
- Branch: feat/stats-information-architecture.
- Lokal geändert, nicht committed/gepusht; kein PR/Merge/Browser/Produktivlauf.
- Die vorher vorhandene rivalry_intensity_data_check.sql bleibt unverändert
  und gehört nicht zu diesem Scope.

## Struktur
Übersicht / Performance / Most Wanted / Rivalries / Badges wird zu
Übersicht / Performance / Meilensteine / Rivalries / Badges.

- /stats/milestones enthält die unveränderte Most-Wanted-Matrix und Teamkarten.
  /stats/most-wanted leitet ohne eigenen Read dorthin um.
- Übersicht zeigt WR-Progression prominent aus bereits geladenen Daten,
  kompakte gemeinsame Menge, Spieler/Eventanzahl, Rekord und den bisherigen
  kleinen Rivalry-Summary. Doppelte ausführliche Mengenkarte entfernt.
- Performance behält 062-Rankings, WR-Verlauf, Versuchnummern und Archiv.
  BINGO-/Achievement-Rankings wandern von Badges hierher, über den unveränderten
  separaten 064-RPC. Durchschnitt/DNF bleiben in bestehenden Performance-Metrics;
  deren kanonischer Scope wird nicht an die alten Übersichtskarten angeglichen.
- Badges behält Rarity/Familien/Stufen/Empfänger und bestehenden Admin-Katalog.
  Keine neue Eligibility-/Katalog-Abfrage.
- Rivalry-Funktionalität und Berechnung unverändert.

## Quellen
Gemeinsam getrunken:
- Überblick und neue Teamkarte verwenden global_statistics.valid_attempts
  beziehungsweise season_global_statistics.valid_attempts.
- Gleiche BeerVolumeCard / beerVolume-Helfer: 0,2 L pro gültigem Eventversuch.
- Historische Einzelzeiten zählen weiterhin NICHT für die Menge; Gäste/AK/DNF
  sind ebenfalls ausgeschlossen.

Top-10-Teamzeit:
- Neue additive 202610070065_team_milestones_snapshot.sql.
- get_team_milestones_snapshot(p_season_year integer default null) -> jsonb.
- STABLE SECURITY INVOKER; EXECUTE anon/authenticated, nicht PUBLIC.
- qualified_official_times bzw. season_qualified_official_times mit Saisonfilter.
  Reguläre Spieler: not is_guest, player_id not null; übrige Qualifikation
  (Approval/DNF/AK/Archivierung/Löschung) bleibt in der kanonischen Quelle.
- Minimum je player_id, PB/UUID aufsteigend, LIMIT 10, anschließend Summe.
- Historische Zeiten zählen für PBs, saisonal nach ihrem Datum; Eventzeiten
  nach Eventdatum. Keine doppelte Wertung desselben Spielers.
- Payload: seasonYear, validAttempts, teamTimeHundredths, playerCount,
  targetPlayerCount.
- Teilteam: tatsächliche Summe, X/10 und Hinweis; leer: NULL-Zeit / 0/10.
- Beide Teamkarten besitzen ersetzbare Artwork-Slots mit neutralen Icons.

## Reads und Cache
- Übersicht unverändert: statistics 4 Reads All-Time / 5 Saison plus kleiner
  Rivalry-Summary-RPC; keine neuen MW/Badge/Team-Reads.
- Performance: WR-Historie + 062-RPC + verschobener 064-RPC;
  All-Time zusätzlich History. Keine MW/Rarity/Unified-Abfrage.
- Meilensteine: genau 2 unabhängige Snapshots (063 und 065), kein N+1.
- Badges: 1 Rarity-RPC; zusätzliche Adminreads nur bei Freischaltung wie zuvor.
- Rivalries: unveränderter Hub.
- Gemeinsamer 20s-Cache, Deduplizierung, Scopekeys und Route-Run-Guards bleiben.
  Team-Invalidierung bei players/events/attempts/historical_attempts;
  inaktiv nur Cacheinvalidierung ohne Hintergrundread.
- Unabhängiger Retry für MW, Team und verschobene Rankings.
- UI verhindert Darstellung eines alten Team-/Ranking-Snapshots im neuen Scope.
- Keine Änderungen an Migrationen001–064, RLS, Triggern oder Save-Hotpath.

## Event-QoL
- Archiv verwendet event.validAttempts statt event.attempts.
- Resultat-Podium und Bestenliste verwenden entry.validAttempts.
- Eventgesamtwert ist ausdrücklich als „Gültige Versuche“ beschriftet.
- Live-Teilnehmerkarte und Eingabeblatt verwenden LiveStanding.validAttempts:
  dieselbe isEventEligibleLiveAttempt-Regel wie die Bestzeit, plus gültiges
  time-Ergebnis. Gäste bleiben eventqualifiziert, AK nicht.
- Rohzähler attempts, Alle-Versuche-Listen und Versuchsnummern unverändert.
- Hall of Fame unverändert.
- CurrentEventCard bewusst unverändert: zeigt bestätigte Gesamteinreichungen
  UND separat gültige Zeiten UND DNF; das ist eine explizite Aufschlüsselung.

## Verifikation
- 18 fokussierte Testdateien / 114 Tests erfolgreich.
- check:quick (Lint/TypeScript) erfolgreich.
- Build erfolgreich; Warnungen zu ungelösten __VITE_PUBLIC_ASSET__-Platzhaltern.
- git diff --check ohne Befund.
- pgTAP: 9 Assertions in team_milestones_snapshot.sql vorbereitet, NICHT
  ausgeführt (kein lokales PostgreSQL/pgTAP/Docker).
  Nur lokale Wegwerf-Testdatenbank! Fixtures testen 12 Spieler -> 10 PBs,
  Duplicate, DNF, AK-Spieler/Attempt, Eventgast, historischen Gast,
  historische Saison-PB, Teilteam, leeren Scope und All-Time-Parität.
- Keine Produktionsdaten verändert.

## Offene Abnahme / Risiken
- Tatsächliche SQL-Kompilation und Runtime von 065 sind noch nicht geprüft.
  Die kanonischen Views können trotz kleinem Payload Kosten verursachen;
  ein manueller Supabase-Preflight mit EXPLAIN bleibt nötig.
- Browser/Network nicht durchgeführt: 360/390/430 und Desktop, Tabscrolling,
  Assets, Saisonwechsel, Fehler/Retry, MW-Details und harte Navigation prüfen.
- Keine belegte HTTP-/p95-Messung, keine Timeouterhöhung.
- Teilsummen sind nicht sportlich mit vollständigen Zehnerteams vergleichbar:
  deutlicher Hinweis, kein Ranking.
- Kein neuer Rivalry-Score, keine Length-/Badge-Regel.

## Geänderte Dateien
- docs/MODULES.md
- src/App.tsx
- src/components/common/MobileAvatarContexts.test.tsx
- src/components/events/EventArchiveList.test.tsx
- src/components/events/EventArchiveList.tsx
- src/components/events/EventResults.test.tsx
- src/components/events/EventResults.tsx
- src/components/events/ParticipantCard.tsx
- src/components/events/TimeEntrySheet.tsx
- src/components/stats/BeerVolumeCard.tsx
- src/components/stats/StatsNavigation.test.tsx
- src/components/stats/StatsNavigation.tsx
- src/hooks/useDataPlatform.tsx
- src/lib/liveEventCalculations.test.ts
- src/lib/liveEventCalculations.ts
- src/pages/StatsBadgesPage.test.tsx
- src/pages/StatsBadgesPage.tsx
- src/pages/StatsMostWantedPage.tsx
- src/pages/StatsOverviewPage.tsx
- src/pages/StatsPage.tsx
- src/pages/StatsRouting.test.ts
- src/pages/StatsStructure.test.tsx
- src/services/badgeDashboardService.test.ts
- src/services/badgePrestigeSqlIsolation.test.ts
- src/services/dataGroupService.test.ts
- src/services/dataGroupService.ts
- src/services/statsService.mostWanted.test.ts
- src/types/database.ts
- src/types/index.ts
- src/types/liveEvent.ts
- src/components/stats/BadgeRankingSections.tsx
- src/components/stats/TeamMilestones.test.tsx
- src/components/stats/TeamMilestones.tsx
- src/services/teamMilestonesService.test.ts
- src/services/teamMilestonesService.ts
- supabase/migrations/202610070065_team_milestones_snapshot.sql
- supabase/tests/database/team_milestones_snapshot.sql
- docs/STATS_INFORMATION_ARCHITECTURE.md
