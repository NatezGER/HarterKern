# Modulkarte

Die Karte nennt nur direkt bestätigte Einstiege und Abhängigkeiten. Allgemeine
UI-Helfer, Typen und Formatierungsfunktionen sind nicht vollständig aufgelistet.

## 1. App-Shell und Navigation

- **Zweck:** Routing, Layout, Provider, Header und globale Statusanzeigen.
- **Einstiege:** `src/App.tsx`, `src/main.tsx`, `src/layouts/AppLayout.tsx`.
- **Hooks/Services:** `useDataPlatform`, `useLiveEvent`, `useAdminSession`,
  `useManagementMode`; über die Provider `dataGroupService` und
  `dataPlatformRepository`.
- **Views/RPCs:** keine eigenen; lädt die jeweils aktive Routengruppe.
- **Tests:** noch nicht dokumentiert.
- **Direkte Abhängigkeiten:** Datenplattform, Realtime und aktive Page.
- **Nicht enthalten:** fachliche Inhalte der einzelnen Routen.

## 2. Dashboard

- **Zweck:** Startseitenüberblick mit Rekord, Tagesbesten, Hall-of-Fame-Vorschau,
  Events und optionalem Prestige-Feed.
- **Einstieg:** `src/pages/DashboardPage.tsx`.
- **Hooks/Services:** `useEffectivePublicData`, `dataGroupService`, `statsService`,
  `eventService`, `playerService`.
- **Views/RPCs:** `players`, `player_statistics`, `public_hall_of_fame`,
  `world_record_history`, `event_winners`, `events`, `event_statistics`,
  optional `prestige_activity_feed` und `most_wanted_activity_feed`.
- **Tests:** `npm test -- src/services/dataGroupService.test.ts`.
- **Direkte Abhängigkeiten:** Hall of Fame, Events, Prestige-Aktivitäten.
- **Nicht enthalten:** vollständige Statistik- und Verwaltungsoberflächen.

## 3. Hall of Fame

- **Zweck:** Rangliste, Podium, Suche und Filter.
- **Einstieg:** `src/pages/LeaderboardPage.tsx`.
- **Hooks/Services:** `useLeaderboard`, `useEffectivePublicData`,
  `dataGroupService`, `playerService`, `statsService`.
- **Views/RPCs:** `players`, `player_statistics`, `public_hall_of_fame`.
- **Tests:** `npm test -- src/services/dataGroupService.test.ts`.
- **Direkte Abhängigkeiten:** Spieler-Stammdaten und abgeleitete Rangfolge.
- **Nicht enthalten:** Prestige-Feed, Most Wanted, BINGO und Live-Rohdaten.

## 4. Spielerübersicht

- **Zweck:** Übersicht der regulären Spielerprofile.
- **Einstieg:** `src/pages/PlayersPage.tsx`.
- **Hooks/Services:** `useEffectivePublicData`, `dataGroupService`,
  `playerService`.
- **Views/RPCs:** `players`, `player_statistics`.
- **Tests:** `npm test -- src/services/dataGroupService.test.ts`.
- **Direkte Abhängigkeiten:** Spieler-Stammdaten und Spielerstatistiken.
- **Nicht enthalten:** Detailprofil, BINGO und Live-Verwaltung.

## 5. Spielerprofil

- **Zweck:** Identität, Leistungsdaten, Historie, Fortschritt, Badges, Trophäen
  und separat geladenes persönliches BINGO.
- **Einstieg:** `src/pages/PlayerProfilePage.tsx`.
- **Hooks/Services:** `usePlayerProfileDetail`, `useEffectivePublicData`,
  `historyProfileService`, `dataGroupService`, `playerService`, `statsService`.
- **Views/RPCs:** `players`, `player_statistics`, `public_hall_of_fame`,
  `get_player_event_history`, `get_player_visible_badges`,
  `get_player_attempt_number_statistics`, `get_player_qualified_times`, `player_pb_history`,
  `player_prestige_statistics`, `player_trophies`; separat
  `get_player_bingo`; dessen gemeinsame player-scoped Basis bleibt fachlich aus
  `player_bingo_hits`, den zentralen Badge-Schwellen und dem kanonischen
  `bingo_line_cells`-Raster abgeleitet.
- **Tests:** `npm test -- src/components/players/PersonalBingo.test.tsx
  src/components/progression/ProgressionTimeline.test.tsx
  src/components/progression/PersonalBestDetailsToggle.test.tsx`.
- **Direkte Abhängigkeiten:** Spielerübersicht, Prestige/Badges/Trophäen, BINGO.
- **Nicht enthalten:** globale Statistikmodule und Live-Verwaltung.
- **Zeitquoten:** Eine zusätzliche spielerbezogene, season-aware Abfrage auf den
  Basistabellen liefert über `get_player_qualified_times` die kumulativen
  Unter-5-/Unter-4-/Unter-3-Anteile; keine globale Abfrage und kein N+1.
- **Eventführung:** Ein player-scoped RPC liefert All-Time oder saisonal
  kumulierte offizielle Führungssekunden und strikt gebrochene Eventbestzeiten.

## 5a. Spielervergleich

- **Zweck:** Direkter, season-aware 1-gegen-1-Vergleich regulärer Spieler mit
  eventbasiertem Head to Head.
- **Einstieg:** `src/pages/PlayerComparePage.tsx`, Route `/compare` mit
  `playerA`- und `playerB`-Queryparametern; zusätzlich dezente Aktion im
  Spielerprofil.
- **Hooks/Services:** `usePlayerCompare`, `playerCompareService` sowie der davon
  unabhängige Deep-Block `usePlayerDeepCompare` / `playerDeepCompareService`;
  vorhandene gecachte Sections aus `playerProfileService`, Players-Datengruppe.
- **Finale Reihenfolge:** Hero/Selektoren, Hauptstatistiken, gemeinsame
  PB-Entwicklung, Nach Versuchsnummer, Head to Head/Rivalry, Speed & Peak,
  Konstanz & Serien, Event- & Leistungswerte und experimentelle
  Vergleichszusammenfassung.
- **Views/RPCs und Aggregate:** Pro ausgewähltem Spieler werden vorhandener
  Profil-Core, optionales Saisonprofil und die bereits von P11A verwendeten
  `qualified_official_times` beziehungsweise `season_qualified_official_times`
  wiederverwendet. Daraus entstehen clientseitig Median, Zeitquoten inklusive
  Unter 2,5/2,0, Top-3/Top-5-Mittel, Standardabweichung und PB-Abstände. Der
  vorhandene Eventführungs-RPC liefert allgemeine Führungszeit und gebrochene
  Eventbestzeiten. Es gibt keine separaten Reads pro Kennzahl.
- **Sequenzdaten:** Genau ein gebündelter, chronologischer Read auf `attempts`
  mit eingebettetem `events` lädt beide Spieler, nur freigegebene reguläre
  Versuche aus abgeschlossenen, nicht gelöschten Events und filtert die Saison
  am Eventdatum. Er wird ausschließlich für Reihenfolgenwerte verwendet:
  längste Unter-3-Serie, längste DNF-freie Serie, schnellster erster Versuch,
  Versuch-Nummer-Mittel sowie direkte Rivalitätszeit und Führungswechsel.
- **PB-Progression:** Je Spieler genau ein bestehender persönlicher Read:
  All-Time `player_pb_history`, saisonal `get_player_season_pb_history`. Es
  werden keine globalen WR-Verläufe für den Vergleich geladen.
- **Route Load:** Die P11A/P11B-Basis liegt bei maximal 15 All-Time- und 19
  Saison-Requests. P11C ergänzt einen gemeinsamen Sequenz-Read und zwei
  persönliche Progressions-Reads. Damit liegen die Maxima bei 18 (All-Time)
  beziehungsweise 22 (Saison), ohne N+1 sowie ohne Badge- oder Prestige-Reads.
- **Fehlerisolation:** P11A-Core/Speed und P11B-H2H laden unabhängig von P11C.
  Innerhalb von P11C haben Sequenzdaten und Progression eigene Lade- und
  Fehlerzustände; die beiden Progressions-Reads werden tolerant zusammengeführt,
  sodass eine vorhandene Spielerserie trotz Ausfall der anderen sichtbar bleibt.
- **Datenbankentscheidung:** Keine Migration. Die finale, reduzierte Metrikmenge
  wird vollständig von bestehenden qualifizierten Reads/RPCs sowie einem
  gebündelten Read auf den vorhandenen Basistabellen abgedeckt. Es werden keine
  veraltbaren, abgeleiteten Spalten gespeichert.
- **Tests:** `npm test -- src/lib/playerCompare.test.ts
  src/lib/playerCompareDeep.test.ts src/services/playerCompareService.test.ts
  src/services/playerDeepCompareService.test.ts src/pages/PlayerComparePage.test.tsx
  src/services/historyProfileService.test.ts src/components/compare/DeepCompareSections.test.tsx
  src/components/progression/ProgressionTimeline.test.tsx src/services/dataGroupService.test.ts`.
- **Direkte Abhängigkeiten:** Spieler-Stammdaten, Spielerprofil-Core,
  Saisonkontext und Zeitquoten.
- **H2H-Semantik:** Nur abgeschlossene gemeinsame Events mit je mindestens
  einer qualifizierten gültigen Eventbestzeit zählen. Ties beenden Serien und
  werden nicht in den großen A:B-Score eingerechnet. Direkte Führungszeit zählt
  erst, sobald beide Spieler im jeweiligen Event eine vergleichbare gültige Zeit
  besitzen, und endet spätestens mit Eventschluss. Eine direkte Führungsübernahme
  zählt nur beim Wechsel vom bislang führenden Gegner zum Einreicher; erster
  vergleichbarer Vorsprung und Gleichstände zählen nicht als Übernahme.
- **Deep-Sections:** Gemeinsame PB-Progression, season-aware Attempt Numbers,
  Speed & Peak, Konstanz & Serien, Event- & Leistungswerte und eine leicht
  entfernbare, ausdrücklich experimentelle Lead-Zusammenfassung ohne Score,
  Gewichtung oder Gewinnertext. Profil-Auszeichnungen und zusätzliche
  spielerprofilfremde Kennzahlen sind nicht Teil des Vergleichs.
- **Nicht enthalten:** Drei-Spieler-Vergleich, neue Prestigeformel oder ein
  offizieller Gesamtsieger.

## 6. Live-Event und Eventverwaltung

- **Zweck:** Eventstart, Teilnehmer, Zeit/DNF-Erfassung, Eventabschluss sowie
  Verwaltung von Spielern, Events und Versuchen.
- **Einstiege:** `src/pages/LiveEventPage.tsx`, `src/pages/SettingsPage.tsx`,
  `src/components/management/ManagementPanel.tsx`.
- **Hooks/Services:** `useLiveEvent`, `usePublicData`, `useManagementMode`,
  `dataPlatformRepository`, `historyProfileService`.
- **Views/RPCs:** `players`, `events`, `event_participants`, `event_guests`,
  `attempts`, `historical_attempts`; bestätigte `sync_*`-RPCs für Event-,
  Teilnehmer-, Spieler- und Versuchsmutationen.
- **Tests:** `npm test -- src/services/dataPlatformRepository.test.ts
  src/services/eventLifecycleRepository.test.ts
  src/components/events/NumericTimePad.test.ts`.
- **Direkte Abhängigkeiten:** Datenplattform, Realtime, Badge-Unlock-Anzeige.
- **Post-Attempt:** Ergebnis, Rekord und Badge-Queue werden aus dem bereits
  gespeicherten Versuch und dem Live-Vorzustand präsentiert. Es entstehen
  keine zusätzlichen Pflichtrequests; Badge-Lookup und Refresh bleiben
  nachgelagerte, nicht blockierende Präsentations-/Synchronisationsschritte.
- **Nicht enthalten:** Eventarchiv-Auswertung und globale Statistiken.

## 7. Eventarchiv und Eventdetail

- **Zweck:** Weiterleitung zur Statistikübersicht, historische Versuche und
  Detail-/Ergebnisseiten abgeschlossener Events.
- **Einstiege:** `src/pages/EventsPage.tsx`, `src/pages/EventResultsPage.tsx`,
  `src/pages/HistoricalAttemptsPage.tsx`.
- **Hooks/Services:** `useEventDetail`, `useDataPlatform`,
  `historyProfileService`, `historicalAttemptRepository`.
- **Views/RPCs:** `historical_attempts`, `events`, `event_statistics`,
  `event_podium`, `event_attempt_details`, `event_participant_statistics`,
  `event_badge_unlocks`, `event_photos`, `event_attempt_number_statistics`,
  `player_trophies`; historische `sync_*`-RPCs.
- **Eventdetail:** Eventfotos werden nicht mehr geladen oder gerendert. Ein
  gebündelter Lead-Read ergänzt pro permanentem Spieler Führungssekunden und
  gebrochene Eventbestzeiten.
- **Tests:** `npm test -- src/services/historicalAttemptRepository.test.ts`.
- **Direkte Abhängigkeiten:** Statistikroute, Badges/Trophäen, Storage-Fotos.
- **Nicht enthalten:** Live-Erfassung und Spieler-BINGO.
- **Archivroute:** `/events` lädt als eigene season-aware Datengruppe nur die
  vorhandenen Eventmodelle (7 gebündelte Requests) und rendert keinen
  Statistik-Redirect mehr.

## 8. Statistiken

- **Zweck:** globale Kennzahlen, Rekordverlauf und historische Versuche mit
  unabhängig geladenen Zusatzmodulen.
- **Einstieg:** `src/pages/StatsPage.tsx`.
- **Hooks/Services:** `useEffectivePublicData`, `useDataPlatform`,
  `dataGroupService`, `statsService`, `attemptService`, `eventService`.
- **Views/RPCs:** `global_statistics`, `world_record_history`,
  `event_lead_player_statistics`, `event_player_best_progression`,
  `event_attempt_details`, `events`, `event_statistics`, `event_participants`,
  `event_guests`, `event_podium`; optionale Views stehen in Modulen 9 und 10.
- **Tests:** `npm test -- src/services/dataGroupService.test.ts`.
- **Direkte Abhängigkeiten:** historische Versuche und optionale Statistikmodule.
- **Nicht enthalten:** Spielerprofil und Live-Verwaltung.
- **Route Load:** Der Statistik-Kern benötigt All-Time 5 und saisonal 6
  Requests; der saisonale Zusatzrequest liest nur die Bestzeit aus
  `season_qualified_official_times`. Events und die nicht
  mehr verwendete Recent-Attempt-Vorschau werden dort nicht geladen.
- **Zeitquoten/Versuchsnummern:** Werden ohne weiteren Request aus den bereits
  für Most Wanted geladenen qualifizierten offiziellen Zeiten des gewählten
  Scopes abgeleitet. Historische Zeiten zählen für Quoten, aber nicht für die
  eventbasierte Versuchnummer.
- **Eventführung:** Die vorhandene saisonfilterbare Abfrage liefert zusätzlich
  strikt gebrochene Eventbestzeiten und wird kompakt innerhalb der
  Ligastatistiken dargestellt.

## 9. Prestige, Badges, Trophäen und Liga-Momente

- **Zweck:** Prestige-Aktivitäten, Badge-Seltenheit, Meilensteine und Trophäen.
- **Einstiege:** `PrestigeActivityFeed`, `BadgeGallery`, `TrophyCabinet`,
  `GroupMilestones` unter `src/components/`.
- **Hooks/Services:** `useEffectivePublicData`, `statsService`,
  `historyProfileService`.
- **Views/RPCs:** `prestige_activity_feed`, `most_wanted_activity_feed`,
  `badge_rarity_statistics`, `group_milestone_progress`,
  `visible_player_badges`, `public_player_badges`, `player_trophies`.
- **Tests:** `npm test -- src/components/common/TrophyCabinet.test.tsx`.
- **Direkte Abhängigkeiten:** Dashboard, Spielerprofil und Statistiken.
- **Award-Grafiken:** ein nicht blockierender globaler Request lädt das kleine
  `award_assets`-Mapping; nur im geöffneten Verwaltungsmodus folgen je ein
  Request für aktive Badge-Definitionen. Trophäen-Slots sind lokal definiert
  und hängen nicht von bereits vergebenen Trophäen ab.
  Badge- und Medaillenbilder bleiben quadratisch; Trophäen unterstützen
  zusätzlich natürliche Hochformate und werden proportional dargestellt.
  Historische Sub-3-, Sub-2- und BINGO-Trophäen besitzen eigene stabile
  Custom-Asset-Slots.
- **Badge-Seltenheit:** lädt die bestehende Rarity-View und in einem zweiten,
  gebündelten Request `public_player_badges` für die Empfänger-Disclosure;
  keine Badge-Einzelrequests und keine zusätzliche globale Datenladung.
- **Profil-Badges:** Der Galerie-RPC liefert nur sichtbare, familiengerankte
  Player-Awards und keine Rarity-, Progress- oder Next-Badge-Aggregate. Rarity
  wird separat über `get_badge_rarity` geladen, im Profil fünf Minuten gecacht
  und fehlertolerant per `badge_key` ergänzt.
- **Pre-P11 Awards:** Die additive Award-Erweiterung ergänzt die vollständige
  BINGO-Kartenfamilie, drei Holz-/Trostpreis-Badges und deterministisch aus
  qualifizierten Zeiten beziehungsweise BINGO-Treffern ermittelte historische
  Trophäen. Bestehende Award-Views bleiben die Grundlage; ein ergänzender
  Read-Model-Zweig wird in `public_player_badges` und `player_trophies`
  zusammengeführt.
- **Nicht enthalten:** Kernladung von Hall of Fame und Spielerübersicht.

## 10. Most Wanted und BINGO

- **Zweck:** globale Most-Wanted-Matrix und persönliches 10×10-BINGO.
- **Einstiege:** `src/components/stats/MostWantedMatrix.tsx`,
  `src/components/players/PersonalBingo.tsx`.
- **Hooks/Services:** `statsService`, `historyProfileService`; Datenzustände über
  `useDataPlatform` beziehungsweise `usePlayerProfileDetail`.
- **Views/RPCs:** `most_wanted_endings`, `most_wanted_progress`,
  `player_bingo_fields`, `player_bingo_statistics`, `player_bingo_hits`.
- **Tests:** `npm test -- src/components/stats/MostWantedMatrix.test.tsx
  src/components/players/PersonalBingo.test.tsx`.
- **Direkte Abhängigkeiten:** Statistiken beziehungsweise Spielerprofil.
- **Nicht enthalten:** Hall-of-Fame-Kernladung und Live-Rohdaten.

## 11. Datenplattform und Realtime

- **Zweck:** routenspezifische Datengruppen, Request-Deduplizierung, lokaler
  Modulstatus sowie Fokus-, Sichtbarkeits- und Realtime-Aktualisierung.
- **Einstiege:** `src/hooks/useDataPlatform.tsx`,
  `src/services/dataGroupService.ts`, `src/services/dataPlatformRepository.ts`.
- **Hooks/Services:** `useDataPlatform`, `useDataGroup`; Player-, Event-, Stats-,
  Attempt- und History-Services.
- **Views/RPCs:** abhängig von der aktiven Gruppe; Realtime beobachtet `players`,
  `events`, `attempts`, `historical_attempts`, `event_participants`,
  `event_guests` und `event_photos`.
- **Tests:** `npm test -- src/services/dataGroupService.test.ts
  src/services/dataPlatformRepository.test.ts`.
- **Direkte Abhängigkeiten:** Supabase-Client und alle datenlesenden Routen.
- **Nicht enthalten:** Darstellung und fachliche Regeln einzelner Pages.

## 12. Supabase, Migrationen und Sicherheit

- **Zweck:** Schema, Views, RPCs, RLS, Storage und Datenbanktests.
- **Einstiege:** `supabase/migrations/`, `supabase/tests/`, `src/lib/supabase.ts`.
- **Hooks/Services:** Repository- und Fachservices unter `src/services/`.
- **Views/RPCs:** im jeweiligen konsumierenden Modul dokumentiert; vollständige
  Datenbankzuordnung ist im begrenzten PR-8B-Scope noch nicht dokumentiert.
- **Tests:** vorhandene pgTAP-Pfade; Ausführung nur bei ausdrücklich
  angeforderter Datenbank- oder Releaseprüfung.
- **Direkte Abhängigkeiten:** sämtliche persistenten Datenmodule.
- **Nicht enthalten:** React-Layout und UX.
