# PR E – Hall of Fame, Award-Grafiken und persönliches Bierprofil

Stand: 11. November 2026. **Lokal implementiert, nicht committed oder veröffentlicht.**

## Ausgangspunkt

- Branch: `feat/pr-e-hall-of-fame-assets-beer`.
- Ausgangscommit und abgerufener `origin/main`: `45fd1b3ffd54355259440b86b2be929594e00b28`, einschließlich gemergter PR #82.
- Vor Beginn war der Worktree sauber. Bestehender `main` und Migrationen 001–078 wurden nicht verändert.
- Kein Commit, Push, PR, Merge, Vercel-Deployment, produktiver SQL-Lauf oder Edge-Function-Deployment.

## Hall of Fame und unveränderte Fachlogik

`/leaderboard` bietet Bestzeit (weiterhin Standard), Durchschnitt und Medaillenspiegel. Die bisherigen Bestzeit-/Durchschnittskomponenten bleiben unverändert. Der Medaillenspiegel ist von `/stats/performance` entfernt; dessen Performance-Rankings und BINGO-Bereich IX bleiben erhalten. Der zusätzliche, ausschließlich für PR D benötigte Spieler-Read auf der Performance-Route entfällt.

Der neue Modus verwendet das vorhandene `calculatePerformanceMedals` und die bestehende Eligibility-Konfiguration **ohne Änderungen**. Olympische Sortierung, echte Wettbewerbsränge, Fünf-Empfänger-Regel, BINGO, Most Wanted, Unter-3-Kategorie sowie Ausschluss von AK/Gästen bleiben identisch. Es gibt keine Speicherung oder endgültige Vergabe von Medaillen.

Ein spezialisiertes Podium zeigt maximal drei Spieler mit tatsächlichen Rängen (auch 1/1/3). Weitere Gleichplatzierte werden angekündigt. Spieler ohne Medaillen bleiben in der vollständigen Rangliste und erhalten kein künstliches Podest. Karten enthalten Profil-Link, kleine unabhängige Gold-/Silber-/Bronzeslots inklusive Nullwerten und native aufklappbare Belege. Die Belege behalten Statistikwert, Rang, Stichprobe, Bereich und Scope; Links führen jetzt zu `/stats/performance#…`. Profil-Links und Disclosure-Elemente sind getrennt, keine verschachtelten Links. Der All-Time-Hinweis grenzt die Live-Auswertung von späteren Karriere-Medaillen ab.

## Laden, Cache und Saisonwechsel

- Allgemeiner Hall-of-Fame-Routenplan bleibt ausschließlich `leaderboard`: die vorhandenen drei Requests, keine zusätzliche Spielerabfrage.
- Das über `getPlayers(season)` geladene Register enthält alle nicht archivierten Spieler; die unveränderte Medaillenaggregation filtert AK und schließt Null-Medaillen-Spieler ein.
- Erst bei Auswahl von `medals`: ein gecachter Performance-RPC und `loadDataGroup("badge-statistics", season)` mit dem bestehenden BINGO-ReadCache. Beide Quellen laden parallel. Keine N+1-Reads, kein zusätzlicher BINGO-Cache, kein Polling.
- Wiederholte Auswahl nutzt die vorhandene 20-Sekunden-Cachefrist und In-flight-Deduplizierung. Nach Ablauf werden bei erneuter Auswahl aktuelle Daten geladen.
- Saison und Invalidierungsgeneration gehören zum lokalen Ergebniszustand. Alte Werte werden beim Scope-/Generationswechsel bereits vor dem nächsten Effekt ausgeblendet; abgebrochene/veraltete Antworten dürfen keinen neuen Zustand setzen. Keine Teilwertung, wenn eine Quelle fehlt.
- Retry invalidiert die beiden Medaillenquellen; ein fehlerhaftes Spielerregister kann ebenfalls neu geladen werden.
- Bestehende Realtime-Invalidierungen invalidieren jetzt auch die inaktive Performance-Quelle. Ein kleines Invalidierungssignal informiert ausschließlich abonnierte Ansichten, ohne selbst Reads auszulösen. Manuelle/Fokus-Aktualisierung der Hall of Fame invalidiert auch deren zusätzliche Quellen; außerhalb des Medaillenmodus erfolgt dadurch kein Medaillen-Read. Bestehende BINGO-Invalidierungen werden weiterverwendet.

## Grafik-Slots und Admin

| Gruppe | IDs |
| --- | --- |
| Eventmedaillen, unverändert | `medal:podium:gold`, `medal:podium:silver`, `medal:podium:bronze` |
| Statistikmedaillen, neu | `medal:statistics:gold`, `medal:statistics:silver`, `medal:statistics:bronze` |
| Rekordsymbole, neu | `record:wr`, `record:sr`, `record:pb`, `record:eb` |
| Badges/Trophäen | Bestehende IDs und historische Trophäen unverändert |

Die bestehende Adminverwaltung bietet alle fünf Gruppen, Vorschau, Upload und Entfernen. Die vorhandene Mapping-Aktualisierung nach Upload/Entfernen bleibt erhalten. Alle Bilder werden proportional dargestellt. Statistikmedaillen bleiben kleine quadratische Slots; sie verwenden nicht die Event-Lorbeerkränze.

Frontend-Typen, Frontend-Dateiprüfung, serverseitige ID-/Bildprüfung und Datenbank-Constraints erlauben dieselben expliziten neuen Varianten. PNG/WebP, 2 MB, mindestens 512 × 512 und quadratische Medaillen-/Record-/Badgebilder bleiben verbindlich. Trophäen behalten ihre Hochformatunterstützung. Transparenz wird nicht entfernt.

Die bestehende Admin-Token-Prüfung erfolgt weiterhin vor Erstellung des privilegierten Datenbankclients. Kein neuer Endpunkt und keine neue Admin-Architektur. Die Edge Function prüft vor Ersetzen oder Entfernen zusätzlich, ob ein gespeicherter Pfad exakt zum ausgewählten Asset-Slot gehört. Neue Uploads werden bei fehlgeschlagenem Datenbank-Update weiterhin bereinigt. Keine beliebigen IDs oder fremden Storage-Pfade werden akzeptiert.

`RecordEmblem` hat die Typen WR/SR/PB/EB und kompakte/große Darstellung. Einsatzorte: `WorldRecordCard`, `RecordCelebration` und `PostAttemptResult`. Die bestehenden Flags werden nur auf die Grafiktypen abgebildet; keine neue Rekorderkennung. Normale Versuche und DNF erhalten keine Rekordauszeichnung.

`PodiumMedal` verwendet bei fehlendem Custom-Bild einen SVG-Lorbeerkranz mit klarer Platznummer. Bestehende Eventbilder haben unverändert Vorrang. Eventergebnisse, Medaillenzahlen und der bestehende `HallOfFameRankEmblem` bleiben unverändert.

## Migration 079 und Abwärtskompatibilität

Datei: `supabase/migrations/202611110079_pr_e_assets_and_beer.sql`.

Wirksame Grundlage geprüft: Award-Tabelle aus 028, Hochformat-Constraint aus 030, Entfernung des alten Quadrat-Constraints aus 031 und historische Trophäen-IDs aus 032. Migration 079 erweitert Asset-ID-, Typ- und Pfad-Constraints. Die bestehenden Größen-, MIME-, Dimensions- und Typ/ID-Konsistenzprüfungen gelten weiterhin, ebenso RLS und Storage-Berechtigungen. Es gibt keine neuen öffentlichen Schreibrechte und keine DML-Änderung bestehender Award-/Attempt-/Spielerdaten.

Zusätzlich verlangt ein `NOT VALID`-Constraint für neue/geänderte Asset-Zeilen, dass das erste Pfadsegment der Asset-ID entspricht. Bestehende Zeilen werden nicht umgeschrieben oder gelöscht. Diese neue Eigentümerprüfung ist für den Altbestand noch nicht validiert. Vor Veröffentlichung den Altbestand rein lesend prüfen:

```sql
select asset_id, storage_path
from public.award_assets
where split_part(storage_path, '/', 1) <> asset_id;
```

Bei Treffern nicht automatisch korrigieren: bestehende Bilder bleiben lesbar, Ersetzen/Entfernen wird durch die neue Edge-Prüfung für diese fehlerhaften Zuordnungen gesperrt. Die übrigen erneuerten Constraints validieren den Bestand und benötigen eine Tabellensperre während der Migration.

Die persönliche Bier-RPC wird mit unveränderter Signatur `get_player_beer_profile(uuid, integer)` per `CREATE OR REPLACE FUNCTION` erweitert. `SECURITY INVOKER`, Suchpfad und bestehende Ausführungsrechte bleiben gleich. `seasonYear`, `validAttempts` und die bisherige deterministische `beers`-Top-3 bleiben erhalten. Neu ist `brandRankings` mit allen dokumentierten Marken, Bildpfad, Anzahl, Minimum, Maximum und einem gemeinsamen Durchschnitt.

Der Quellenfilter aus 075 bleibt identisch: eigene gültige kanonische offizielle Eventzeiten und Saison anhand des Eventdatums. DNF, AK, Gäste, gelöschte/nicht offizielle Zeiten und historische Zeiten ohne Eventzuordnung gelangen nicht in diese Quelle. Markenlose gültige Zeiten bleiben wie bisher im persönlichen Volumen enthalten, jedoch nicht im Markenranking. Keine Änderung der Liga-Bierstatistik.

**Migration zuerst ist nach statischer Prüfung abwärtskompatibel**, da bestehende IDs und RPC-Felder erhalten bleiben. Dies ist keine bestätigte PostgreSQL-Laufzeitfreigabe: lokale Migration-/pgTAP-Ausführung war nicht möglich. Neue Grafik-Uploads benötigen sowohl Migration 079 als auch die aktualisierte Edge Function.

## Persönliches Bierprofil

| Auswahl | Wert je Marke | Sortierung |
| --- | --- | --- |
| Schnellstes Bier, Standard | MIN der gültigen Zeit | aufsteigend |
| Langsamstes Bier | MAX der gültigen Einzelzeit | absteigend |
| Bester Durchschnitt | AVG derselben gültigen Zeiten | aufsteigend |
| Schlechtester Durchschnitt | derselbe AVG | absteigend |
| Meistgetrunken | COUNT derselben gültigen Zeiten | absteigend |

Alle fünf Ansichten werden lokal aus einem geladenen Aggregat sortiert, mit deterministischem Marken-Tiebreak und sichtbarer Stichprobe. Keine Abfrage beim Dropdown-Wechsel, keine neue Mindeststichprobe. Standardmäßig drei Marken, mit „Alle anzeigen“ für weitere. Bestehende Flaschenbilder/Fallbacks bleiben bestehen; Namen dürfen umbrechen.

Falls die ältere RPC noch kein `brandRankings` liefert, bleibt die bisherige Schnellstes-Bier-Top-3 nutzbar. Die vier zusätzlichen Modi sind dann deaktiviert und werden verständlich angekündigt; fehlende Maxima/Durchschnitte werden nicht erfunden. Neue Aggregate werden auf Arraystruktur, Marken, positive Werte und konsistente Min/Avg/Max geprüft. Saisontrennung und Cache des Spielerprofils bleiben bestehen.

Die persönliche Bierkarte bekommt einen eigenen großzügigen Bildbereich, volle verfügbare Breite bis `max-w-md`, und verwendet `object-contain`. Liter, Fortschritt und nächster Meilenstein bleiben erhalten. Teamkarten behalten ihre bisherige Größe und Bildbehandlung; keine neuen Meilenstein-IDs oder Mengenberechnungen.

## Verifikation

- Abschließender fokussierter Lauf: **32 Vitest-Dateien, 256 Tests erfolgreich**. Keine vollständige lokale Testsuite.
- Umfasst PR-D-Aggregation/Eligibility, Hall-of-Fame-Modi und Podium, Nullwerte/Gleichstände, Details, Scope-/Late-Response-/Retry-Verhalten, Cache-Deduplizierung/Invalidierung, bestehende Struktur-/Selektor-/Profilregressionen, fünf Bier-Sortierungen, alte/neue RPC-Payloads, Bild-Fallbacks und persönliche Skalierung.
- Edge-bezogene Vitest-Prüfungen: ID-/Pfad-/Bildvalidierung sowie Upload-Request-Grenze einschließlich neuer Slots. Bestehende Admin-Medien-/Token-Tests ebenfalls erfolgreich. Keine produktiven Aufrufe.
- `npm run check:quick`: abschließend erfolgreich (Lint und TypeScript). Der erste Lauf fand TS7053 in der gemeinsamen Legacy-/Aggregatdarstellung; der Typfehler wurde korrigiert, danach gezielt erneut geprüft.
- Produktionsbuild: erfolgreich, einmal ausgeführt. Vite meldet einen Größenhinweis für den Hauptchunk (553,05 kB minifiziert); kein Buildfehler.
- `git diff --check`: erfolgreich; abschließend nach Berichtserstellung erneut kontrolliert.
- SQL statisch gegen Vorgängermigrationen geprüft; zusätzliche Contract-Tests erfolgreich. Lokale pgTAP-Datei `supabase/tests/database/pr_e_assets_and_beer.sql` ergänzt: alte/neue Slots, falsche IDs/Typen/Pfade/Abmessungen, Trophäen-Hochformat, unveränderte vorhandene Uploads/RLS und persönliche Bierqualifikation/Aggregate/Saisons. **Nicht ausgeführt**, weil PostgreSQL/psql/Docker hier nicht verfügbar sind. Fixtures ausschließlich für eine wegwerfbare lokale Datenbank, niemals Produktion.
- Deno ist nicht verfügbar. Ein echter Edge-Handler-/Storage-/Datenbank-Lauf bleibt offen; die ausgeführten Vitest-Grenztests ersetzen ihn nicht.
- PR-D-Berechnung und Eligibility-Datei sowie Migrationen 001–078 sind im Git-Diff unverändert.

## Browserabnahme und verbleibende Grenzen

Lokaler Vite-Server startete erfolgreich. `http://127.0.0.1:5173/leaderboard` und `http://localhost:5173/leaderboard` wurden ausdrücklich im integrierten Browser geöffnet. Beide Aufrufe scheiterten mit `net::ERR_CONNECTION_TIMED_OUT`. Danach wurde der lokale Chrome als Alternative angesprochen; die Windows-Steuerung stoppte, weil sie die aktuelle Browseradresse nicht mit ausreichender Sicherheit ermitteln konnte. Der lokale Entwicklungsserver wurde anschließend beendet.

**Keine erfolgreiche visuelle Browserabnahme und keine belastbaren Screenshots.** 375/390/1440 px, echte Tastatur-/Touch-Interaktionen, lange Namen, große Medaillenzahlen und Custom-Bilder müssen im Preview geprüft werden. Die Fehler beweisen keinen Websitefehler. Die vorhandenen Markup-/Logiktests bestätigen keine Pixelgenauigkeit oder vollständige Browserinteraktion.

Weitere offene Punkte: reale SQL-Ausführung, Edge-Deployment/Storage-Integration, Performance der erweiterten RPC mit realem Datenvolumen und vollständige GitHub-CI. Kein finales Produktions-Go aus ausschließlich lokaler Prüfung.

## Spätere Veröffentlichung – ausdrücklich nicht ausgeführt

1. Änderungen prüfen und erst nach gesonderter Freigabe committen/pushen/PR vorbereiten. GitHub-CI und Vercel-Preview prüfen; vollständige Regression läuft dort.
2. Aktuelle produktive Datensicherung bestätigen. Effektive Constraints/Altpfade rein lesend gegenprüfen; Migration und pgTAP zuerst in einer wegwerfbaren lokalen/Staging-Datenbank ausführen.
3. Migration 079 kontrolliert manuell einspielen.
4. Aktualisierte `admin-media`-Funktion kontrolliert bereitstellen. **Beides muss vor echten neuen Grafik-Uploads vorhanden sein.**
5. Autorisierte echte Admin-Uploads, Ersetzen und Entfernen für einen Statistikmedaillen- und einen Record-Slot prüfen; danach bestehende Event-/Badge-/Trophäenslots gegenprüfen. Keine automatischen produktiven Schreibtests.
6. Bierprofil-RPC read-only für Saison und All-Time gegenprüfen: alte Top-3 unverändert, vollständiges Aggregat und korrekte Werte/Bilder/Filter.
7. Nach erfolgreicher CI, Preview-/Browserabnahme und Backend-Kontrolle finalen Merge beziehungsweise Veröffentlichung gesondert freigeben.

## Konkrete manuelle Abnahme

- `/leaderboard` bei 375, 390 und 1440 px: Bestzeit standardmäßig, Durchschnitt wie zuvor; Netzwerk zeigt dort keine Performance-/BINGO-Zusatzreads.
- Medaillenmodus öffnen: einmal je Quelle bei kaltem Cache, Wiederwahl innerhalb TTL ohne doppelte Abfragen; genau ein Podium und vollständige Kartenliste. Lange Namen, große Zähler, 0/1/2 Spieler, Null-Medaillen-Spieler und Gleichstände 1/1/3 sowie mehr als drei Gleichplatzierte prüfen.
- Details per Tab/Enter/Space sowie Touch öffnen; Profil-Link separat bedienen, Statistiklink führt zum richtigen Performance-Bereich. Dort kein zweiter Medaillenspiegel, BINGO IX weiterhin vorhanden.
- Saison/All-Time schnell mehrfach wechseln, mit verzögerten Antworten: keine alten Zahlen und keine Teilwertung. Fehler einer Quelle simulieren und Retry prüfen. Offizielle Änderungen nur in autorisierter Testumgebung auslösen; ausgewählter Medaillenspiegel aktualisiert sich ohne Polling.
- Asset-Gruppen und Vorschau prüfen: Custom-Bild fehlt/vorhanden/defekt/entfernt; Event- und Statistikmedaille unabhängig. PNG/WebP und Transparenz, falsches Format, >2 MB, <512 px, nicht quadratisch ablehnen; bestehende Trophäen im Hochformat weiterhin zulassen.
- WR/SR/PB/EB bei passenden vorhandenen Ereignissen prüfen, normale Zeiten/DNF ohne Rekordemblem. Event-Lorbeerkränze samt alten Custom-Bildern, Profil- und Event-Podium prüfen.
- Bierprofil: alle fünf Modi anhand bekannter eigener Zeiten gegenrechnen, besonders MAX statt schlechtester PB; Stichprobe, Gleichstände, All-Time/Saison und >3 Marken prüfen. Dropdown ohne neue Requests. Alte Backend-Antwort zeigt ehrliche Schnellstes-Bier-Rückfallansicht.
- Persönliches Meilensteinbild groß und vollständig sichtbar, Liter/Fortschritt/Ziel lesbar; Teamkarten unverändert.

## Geänderte Dateien

- `src/components/common/PodiumMedal.test.tsx`
- `src/components/common/PodiumMedal.tsx`
- `src/components/dashboard/WorldRecordCard.tsx`
- `src/components/events/PostAttemptResult.tsx`
- `src/components/events/RecordCelebration.tsx`
- `src/components/management/AwardAssetManagement.tsx`
- `src/components/players/PlayerBeerSections.test.tsx`
- `src/components/players/PlayerBeerSections.tsx`
- `src/components/stats/BeerVolumeArtwork.tsx`
- `src/components/stats/BeerVolumeCard.tsx`
- `src/components/stats/MilestoneArtwork.test.tsx`
- `src/components/stats/MilestoneArtwork.tsx`
- `src/components/stats/PerformanceMedalTable.test.tsx`
- `src/components/stats/PerformanceMedalTable.tsx`
- `src/hooks/useDataPlatform.tsx`
- `src/hooks/useLeaderboard.ts`
- `src/lib/awardAssets.ts`
- `src/lib/media.ts`
- `src/pages/LeaderboardPage.tsx`
- `src/pages/StatsPage.medals.test.tsx`
- `src/pages/StatsPage.tsx`
- `src/services/dataGroupService.test.ts`
- `src/services/dataGroupService.ts`
- `src/services/performanceMedalContracts.test.ts`
- `src/services/playerBeerService.test.ts`
- `src/services/playerBeerService.ts`
- `src/types/awardAssets.ts`
- `supabase/functions/admin-media/index.ts`
- `supabase/functions/admin-media/upload.integration.test.ts`
- `supabase/functions/admin-media/validation.ts`
- `docs/PERFORMANCE_PR_E.md` (neu)
- `src/components/common/PrEEmblems.test.tsx` (neu)
- `src/components/common/RecordEmblem.tsx` (neu)
- `src/components/common/StatisticsMedal.tsx` (neu)
- `src/components/events/PostAttemptResult.emblems.test.tsx` (neu)
- `src/components/leaderboard/MedalPodium.test.tsx` (neu)
- `src/components/leaderboard/MedalPodium.tsx` (neu)
- `src/components/management/AwardAssetManagement.prE.test.tsx` (neu)
- `src/hooks/useHallOfFameMedals.test.ts` (neu)
- `src/hooks/useHallOfFameMedals.ts` (neu)
- `src/lib/playerBeerRanking.test.ts` (neu)
- `src/lib/playerBeerRanking.ts` (neu)
- `src/pages/LeaderboardPage.medals.test.tsx` (neu)
- `src/services/prEMigration.test.ts` (neu)
- `supabase/functions/admin-media/prE.test.ts` (neu)
- `supabase/migrations/202611110079_pr_e_assets_and_beer.sql` (neu)
- `supabase/tests/database/pr_e_assets_and_beer.sql` (neu)
