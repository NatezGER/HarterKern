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
- **Tests:** `npm test -- src/services/historicalAttemptRepository.test.ts`.
- **Direkte Abhängigkeiten:** Statistikroute, Badges/Trophäen, Storage-Fotos.
- **Nicht enthalten:** Live-Erfassung und Spieler-BINGO.

## 8. Statistiken

- **Zweck:** globale Kennzahlen, Rekordverlauf und historische Versuche mit
  unabhängig geladenen Zusatzmodulen.
- **Einstieg:** `src/pages/StatsPage.tsx`.
- **Hooks/Services:** `useEffectivePublicData`, `useDataPlatform`,
  `dataGroupService`, `statsService`, `attemptService`, `eventService`.
- **Views/RPCs:** `global_statistics`, `world_record_history`,
  `event_attempt_details`, `events`, `event_statistics`, `event_participants`,
  `event_guests`, `event_podium`; optionale Views stehen in Modulen 9 und 10.
- **Tests:** `npm test -- src/services/dataGroupService.test.ts`.
- **Direkte Abhängigkeiten:** historische Versuche und optionale Statistikmodule.
- **Nicht enthalten:** Spielerprofil und Live-Verwaltung.

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
