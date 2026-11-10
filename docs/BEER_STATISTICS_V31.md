# Bierstatistik V3.1 und ergänzende Darstellung

Basis: origin/main a5f653a. Nur lokale Änderungen; keine produktive Migration,
kein Commit, Push oder Deployment.

## Ursprünglicher Auftrag
- PlayerBeerSections unter Rivalitäten: maximal drei persönliche Marken-PBs und persönliche Menge.
- get_player_beer_profile: ein player-scoped Read auf official_event_attempts,
  Saison am Eventdatum, positive gültige Zeiten; keine historischen Einzelzeiten,
  Gäste, AK, gelöschten oder nicht genehmigten Attempts. Unbekannte Marken zählen zur Menge.
- Markenverbrauch und Powerwert bleiben unverändert. BeerBrandDetail ergänzt einen kleinen Größenvergleich.
- BeerBottle, BeerVolumeCard, resolveBeerVolumeMilestone, MilestoneArtwork und der
  vorhandene gecachte Artwork-Katalog werden wiederverwendet. Keine neuen Schwellen.
- Live-Auswahl am Formularende: Eventstandard, weitere Marken desselben Events,
  Freitext bis 80 Zeichen und optionale unbekannte Marke. Trim/blank-to-null wie bisher.
- Ohne Override bleibt der alte Create-RPC aktiv. Explizite Marke/NULL nutzt v2.
  v2 übernimmt die bisherigen Validierungen und schreibt den Snapshot im INSERT;
  keine Änderung des Events oder vorhandener Attempts. Fehler erhalten die Auswahl,
  Erfolg setzt sie auf den aktuellen Standard zurück. Duplicate-Save-Schutz unverändert.

## Drei Ergänzungen
- BeerPlayerIdentity verwendet ProfileAvatar und verlinkt reguläre Spieler/AK.
  Gäste erhalten den vorhandenen Initialen-Fallback ohne erfundenes Profil.
  get_beer_statistics_dashboard_v31 dekoriert den unveränderten V3-Payload mit
  Avatarinformationen ausschließlich der darin vorkommenden Spieler. Ein Request, kein N+1.
- Beide bestehenden Diagramme stehen vor allen bisherigen Übersichtsinhalten.
  Performance enthält weiter alle bisherigen Kennzahlen, Rankings und das Zeitarchiv.
  WR-Daten kommen aus der vorhandenen statistics-Gruppe; der unnötige WR-Read auf
  Performance entfällt. Versuchsnummern/Roster verwenden denselben gecachten
  Performance-RPC wie zuvor, keine parallele zweite Berechnung.
- EventBeerImages lädt unabhängig genau einen event-scoped Read. Approved,
  nicht gelöscht, nicht DNF, positive Zeit; Gäste und AK zählen. DISTINCT Marken,
  gespeicherte Attemptwerte, kein Eventstandard-Fallback: Legacy-NULL und bewusst markenlose Versuche sind nicht unterscheidbar.
  Bilder rechts im vorhandenen Header; mobil horizontale Reihe, Markennamen per
  native details/summary antippbar und als title beim Hover. Podien unverändert.

## Request- und Aktualisierungsverhalten
- Profil: ein zusätzliches kleines Aggregat, über bestehende Profilqueue und Cache.
  Eigene Lade-/Fehler-/Retry-Zustände, Scope im Cache-Key. Invalidierung bei players,
  attempts, events und beer_brand_images. Ein optionaler gecachter Artwork-Katalogread.
- Bierseite: weiterhin ein Statistik-RPC, zusätzlich optional der gecachte Artwork-Katalog.
- Übersicht: vorhandener statistics-Read plus gecachter Performance-Payload für
  Versuchsnummern/Roster. Navigation zwischen Übersicht/Performance nutzt denselben Cache.
- Eventheader: ein zusätzlicher Read, bei Fehler unabhängig erneut ladbar; bestehende event-detail-Invalidierung
  lädt bei Attempt-, Event- und Bierbildänderungen neu. Keine neue globale Subscription.
- Produktionsähnliche SQL-Laufzeiten/Querypläne wurden nicht gemessen: lokale DB fehlt.

## Bereitstellung, noch manuell
1. Migration 075 auf einer wegwerfbaren lokalen Testdatenbank mit 001–074 prüfen.
2. pgTAP: player_beer_and_live_selection.sql sowie bestehende
   beer_statistics_power.sql und event_attempt_beer_brand.sql ausführen.
3. Nach Freigabe Migration 202611090075_player_beer_and_live_selection.sql
   vor dem Frontend bereitstellen. Bestehende 071–074 bleiben unverändert.
4. Kein neues Edge-Function-Deployment nötig; vorhandene Bild-/Artwork-Infrastruktur vorausgesetzt.

## Manuelle Abnahme auf Testumgebung
- 1440, 390, 375 px: Profil Top-3, langer Markenname, null/fehlendes Bild,
  persönliche Menge ohne Markenangabe, Empty/Error/Retry und Saisonwechsel.
- Live: Standard, neue Marke, Wiederverwendung, anderer Event, absichtliches NULL,
  Fehler/Retry, DNF, Gast, AK, schneller Doppelklick und geänderter Standard.
- Nach Reload/Realtime müssen individuelle Marken erhalten bleiben; alte Attempts unverändert.
- Bierlisten: Avatar/Initialen, Profilverlinkung, Werte/Power-Rangfolge unverändert.
- Übersicht: beide Charts genau einmal; Zoom, Overlay, Punktdetails, Saison/Empty/Error.
- Eventheader: eine/viele/doppelte Marken, Gast/AK, DNF/deleted ausgeschlossen,
  kein Fallback bei DNF/NULL, Hover/Antippen, lange Namen, keine Seitenüberläufe.

## Grenzen
Keine produktiven Schreibtests. PostgreSQL/Supabase CLI/Docker stehen hier nicht bereit;
SQL/pgTAP und vollständige Datenbank-/Realtime-End-to-End-Abnahme sind offen.
Die Browserprobe verwendet isoliert gerenderte Komponenten, keine Produktionsdaten.

## Dateien
Profil: PlayerBeerSections(.test).tsx, playerBeerService(.test).ts,
playerProfileService.ts, useHistoryProfiles.ts, PlayerProfilePage(.test).tsx,
dataGroupService(.test).ts. Mengenbilder: BeerVolumeArtwork.tsx, BeerVolumeCard.tsx,
BeerBrandDetail.tsx. Live: TimeEntrySheet.tsx, beerSelection(.test).ts,
useLiveEvent.tsx, liveEventCalculations.ts, dataPlatformRepository.ts,
beerBrandRepository.test.ts, types/liveEvent.ts.
Ergänzungen: BeerPlayerIdentity(.test).tsx, beerAvatarContext.ts,
BeerStatisticsContent.tsx, beerStatisticsService(.test).ts, types/beerStatistics.ts,
EventBeerImages(.test).tsx, EventResults(.test).tsx, StatsOverviewPage.tsx,
StatsPage.tsx, StatsChartPlacement.test.ts, StatsRouting.test.ts,
StatsStructure.test.tsx, StatsBeerPage.test.tsx.
Backend: types/dataPlatform.ts, Migration 075, SQL-Regressionsdatei
player_beer_and_live_selection.sql. Zusätzlich normalisiert der bestehende
SQL-Vertragstest guestEventEligibilitySql.test.ts Windows-Zeilenumbrüche;
die geprüfte Migration selbst wurde nicht verändert.

## Ausgeführte Prüfungen (09.11.2026)
- Ursprüngliche fokussierte V3.1-Tests: 32 bestanden.
- Abschließende vollständige Suite: 928 Tests in 182 Dateien bestanden.
- npm run check:quick: bestanden (Lint und TypeScript).
- npm run build: bestanden; bestehender Hinweis auf Chunk über 500 kB.
- git diff --check: bestanden.
- Isolierte Browser-Darstellungsprobe: 375, 390, 1440 px; keine horizontale
  Seitenausdehnung in der Probe; Markennamen per Antippen zugänglich.
  Kein vollständiger integrierter Browser-/Datenbanktest und kein Nachweis aller
  Chart-Interaktionen gegen die neue Datenbank.
- SQL/pgTAP: vorbereitet, mangels lokaler Datenbank nicht ausgeführt.

## Begrenzte Nachbesserung
- Create-v2 behält Event-/Teilnehmer-/Zeitprüfungen und INSERT-Umfang des alten Create-RPC bei; nur der beauftragte Bier-Snapshot ist überschreibbar.
- Bestehende anonyme Schreibberechtigung bleibt unverändert und ist NICHT behoben. Serverseitige Absicherung der Schreibfunktionen bleibt ein separater Backlog-Punkt.
- SQL-Regressionen für NULL-only und DNF-only ergänzt; Ausführung auf isolierter PostgreSQL-Testdatenbank weiterhin offen.

## Nachprüfung der begrenzten Korrekturen (10.11.2026)
- Fokussiert: 47 Tests in 4 Dateien bestanden.
- Vollständig: 930 Tests in 182 Dateien bestanden.
- npm run check:quick (Lint/TypeScript), Produktionsbuild und git diff --check bestanden.
- Bestehender Buildhinweis: Hauptchunk über 500 kB.
- SQL/pgTAP und integrierte Realtime-Abnahme weiterhin offen; keine produktiven Operationen.
