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
  `player_event_history`, `visible_player_badges`,
  `player_attempt_number_statistics`, `player_pb_history`,
  `player_prestige_statistics`, `player_trophies`; separat
  `player_bingo_fields`, `player_bingo_statistics`, `player_bingo_hits`.
- **Tests:** `npm test -- src/components/players/PersonalBingo.test.tsx
  src/components/progression/ProgressionTimeline.test.tsx
  src/components/progression/PersonalBestDetailsToggle.test.tsx`.
- **Direkte Abhängigkeiten:** Spielerübersicht, Prestige/Badges/Trophäen, BINGO.
- **Nicht enthalten:** globale Statistikmodule und Live-Verwaltung.
- **Zeitquoten:** Eine zusätzliche spielerbezogene, season-aware Abfrage auf den
  bestehenden qualifizierten offiziellen Zeiten liefert die kumulativen
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
- **Views/RPCs:** Pro ausgewähltem Spieler nur vorhandener Profil-Core,
  optionales Saisonprofil und `qualified_official_times` beziehungsweise
  `season_qualified_official_times`; für H2H zweimal `player_event_history`
  sowie ein gebündelter `events`-Status-Read für die gemeinsamen Event-IDs.
- **Deep-Compare-Daten:** Genau ein chronologischer, player-scoped Read auf
  `event_attempt_details` je Spieler speist Serien, Event-Dominanz,
  Attempt-Number-Auswertung und Stat Madness. Eventdaten, qualifizierte Zeiten,
  Progression, sichtbare Badges und etablierte Prestige-Werte kommen aus den
  vorhandenen gecachten Profil-Sections. Saison-Deep-Stats filtern Attempts über
  das Eventdatum; Badge- und Prestige-Werte sind im Saisonmodus sichtbar als
  Karriere / All-Time markiert.
- **Route Load:** Die Auswahlliste benötigt gebündelt 2 Requests. Je Spieler
  folgen All-Time 4 Core- und 1 Speed-Request, saisonal zusätzlich 2 vorhandene
  Saison-Core-Requests. H2H ergänzt 2 gecachte player-scoped History-Reads und
  1 gebündelten Closed-Event-Read; All-Time damit maximal 15, saisonal 19
  Route-Requests. P11C ergänzt 2 Attempt-Reads, 4 Progression-Reads, 2 Badge-RPCs
  und 2 Prestige-RPCs. Events und Performance werden mit P11A/P11B geteilt und
  durch den In-Flight-Cache dedupliziert. Damit liegen die Maxima bei 25
  (All-Time) beziehungsweise 29 (Saison), ohne Query pro Statistik oder N+1.
- **Tests:** `npm test -- src/lib/playerCompare.test.ts
  src/lib/playerCompareDeep.test.ts src/services/playerCompareService.test.ts
  src/services/playerDeepCompareService.test.ts src/pages/PlayerComparePage.test.tsx
  src/services/historyProfileService.test.ts src/components/progression/ProgressionTimeline.test.tsx`.
- **Direkte Abhängigkeiten:** Spieler-Stammdaten, Spielerprofil-Core,
  Saisonkontext und Zeitquoten.
- **H2H-Semantik:** Nur abgeschlossene gemeinsame Events mit je mindestens
  einer qualifizierten gültigen Eventbestzeit zählen. Ties beenden Serien und
  werden nicht in den großen A:B-Score eingerechnet.
- **Deep-Sections:** Speed & Peak Performance, Konstanz & Serien,
  Event-Dominanz, season-aware Attempt Numbers, gemeinsame PB-Progression,
  Badge Battle, Prestige & Records, Stat Madness und eine leicht entfernbare,
  ausdrücklich experimentelle Lead-Zusammenfassung ohne Score oder Gewichtung.
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
