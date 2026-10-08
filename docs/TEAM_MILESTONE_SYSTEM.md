# Team Milestone System — PR70
Basis: origin/main 1412ba1 (PR69 enthalten).
Branch: feat/stats-final-polish-milestone-cms. Nur lokal; nicht committed/deployed.

## Audit / unveränderte Regeln
- PR69-Katalog: 46 Bier- und 25 Teamzeitstufen. IDs, Titel und Schwellen bleiben
  in src/constants/teamMilestones.ts; keine zweite Admin-/SQL-Registry.
- 065 liest qualified_official_times / season_qualified_official_times für PBs
  sowie global_statistics / season_global_statistics für Eventmenge.
- 017 qualifiziert PBs inklusive historischer Einträge; 026 ordnet Events anhand
  start_date und historische Einträge anhand attempt_date einer Saison zu.
- Historische Einträge haben ein echtes Datum, aber keine belegte Uhrzeit/Event-ID.
- 063 Most Wanted, 065, 066 Rivalry V2 und alle früheren Migrationen unverändert.
  Badge-Eligibility, Rivalry/Compare-Berechnung, Performance und Save-Hotpath unverändert.
- Vorhandene Upload-Architektur: admin-media prüft signiertes Management-Token,
  anschließend Service-Role-Mutation. award-assets erlaubt nur PNG/WebP und
  awardbezogene IDs; daher dedizierter Bucket statt Aufweichen der Award-Regeln.

## 5-Sekunden-Teamzeit und History
Neue additive Migration 067: get_team_milestones_snapshot_v2(integer,jsonb).
Ein kompakter Snapshot für den gewählten Scope, nicht alle Rohversuche im Browser.
Der Client übergibt id/kind/threshold aus dem einzigen Katalog (maximal 200).
Schwellen sind ausschließlich Read-/Präsentationsparameter, niemals Award-Writes.

Ausgangszustand: 10 Slots × 500 Hundertstel = 50,00 s.
Je regulärem Spieler gilt seine bisherige relevante PB; höchstens zehn schnellste
PBs plus (10-playerCount) × 500. Bestehende Spieler >5 s werden nicht künstlich
auf 5 s gekappt. Dadurch kann das Hinzukommen einer langsamen PB den Teamwert
auch erhöhen; eine frühere nachweisbare Schwellenüberschreitung bleibt History.
Beispiele: 1 × 3,00 s + 9 × 5,00 s = 48,00 s;
7 × 3,00 s + 3 × 5,00 s = 36,00 s; null Spieler = 50,00 s.
Platzhalter zählen für Fortschritt und Erreichung vollständig.
Kein X/10 in der Hauptkarte; playerCount/placeholderCount nur im Snapshot.

067 projiziert dieselbe Qualifikation auf Basistabellen ohne die dekorierte
event_attempt_details-View. Sortierung: occurred_at, source_priority,
source_order (historical sort_order; bei Attempts 0), source_id.
Gleichzeitige Event-Attempts sind durch ID deterministisch geordnet.
Historische Tagesdaten sortieren wie 017 vor echten Attempts am selben Tag;
ihre occurredAt-Ausgabe bleibt null (keine behauptete Mitternachtsmessung).

Ein lokaler PL/pgSQL-Zustand hält PB pro Spieler. Nur erste/bessere persönliche
Zeiten verändern diesen Zustand. Pro Änderung: zehn schnellste PBs, Platzhalter,
neuer Teamwert. Kein Write/Trigger, kein Ledger oder Unified-Aufruf.
First crossing: erste Verbesserung zu <= threshold; mehrere übersprungene Stufen
erhalten denselben Beleg. Team improvement = vorherige minus neue Teamzeit.
Eventbier: gültiger regulärer Eventversuch × 0,2 L; historische/eventlose Zeiten
tragen keine Liter bei. Erster kumulativer Wert >= threshold ist der Trigger.
Belege: sourceId/sourceType, Datum, vorhandener Event/Spieler, Attemptzeit,
Teamverbesserung. Fehlender Kontext wird ausgelassen, nicht erfunden.
Nach Datenkorrektur wird History aus dem aktuellen kanonischen Bestand rekonstruiert;
sie ist kein unveränderliches Award-Ledger.

## Progress / Scope / UI
Zentraler Resolver: Stufenintervall up=(current-previous)/(next-previous),
down=(previous-current)/(previous-next), geklemmt auf 0..1.
Teamzeit beginnt jetzt explizit bei 50 s (48,20 -> 60 % Richtung 47 s).
Unverändert: 52,4 L zwischen 51,1 und 60 -> 15 %; 26,10 s Richtung 25,96 -> 78 %.
Gleichwertige Hauptkarten ab lg, darunter gestapelt. Solide Goldfüllung auf dunklem
klar umrandetem Track. Keine generischen Erklärungen, Einordnung oder Trivia im UI.
Reihenfolge: Team-Fortschritt, unverändertes Most Wanted, getrennte History-Spalten
(Bier links, Zeit rechts), mobil nacheinander.
Karten/History verwenden weiterhin den synchronen snapshot.season === season-Guard.

StatsHeader mobil nur STATISTIKEN; Desktop kompakter Bereichstitel.
StatsNavigation mobil 3+2 ohne horizontalen Scroll, ab sm eine Reihe,
44px Touchhöhe. Sticky top-20 unter bestehendem 80px Header, z30 unter Header z40;
bestehende Viewport-Gutters bleiben erhalten. Kein zusätzlicher globaler Header.
Performance zeigt Spieler-/Eventzahl nicht mehr; Overview fachlich unverändert.
WR nutzt vorhandenen SVG-Chart und Zeitraum-Zoom/Pan-Tasten. EventModal als Portal,
900px horizontal nutzbare Grafik, 55dvh Höhe. Browser-Zoom bleibt erlaubt.
Rivalry-Score/Namen und Compare-Werte zentriert; fachliche Berechnungen unberührt.
Badge-Empfänger öffnen im zugehörigen Grid-Element direkt unter dem Badge,
kein separates Seitenende und kein automatischer Scroll.

## Supabase Content / Admin / Storage
team_milestone_content(milestone_id PK, info_text nullable max4000,
image_path nullable, updated_at). Kein Threshold- oder Kategorieneditor.
Public SELECT via RLS; keine anon/authenticated Schreibrechte/-Policies.
Änderungen ausschließlich über bestehendes serverseitig geprüftes admin-media.
Kein neues Auth-Modell; Management-Token ist keine auth.users-UUID,
deshalb kein irreführendes updated_by.

Bucket team-milestone-artwork, public Read, max5MB, WebP/PNG/JPEG.
Keine öffentliche Upload-/Replace-/Remove-Policy. Die Edge Function nutzt
erst nach bestehender Tokenprüfung Service-Role-Rechte.
Upload zuerst unter neuer unveränderlicher UUID-Datei; dann DB-Referenz.
Versionsprüfung auf updated_at verhindert veraltete/parallele Saves.
Mehrfachklick gesperrt. Fehlgeschlagener Save lässt alte DB-Referenz bestehen.
Remove setzt image_path null. Alte/fehlgeschlagene Uploads bleiben bewusst
orphan-safe im Bucket; kein konkurrierender Save kann referenzierte Dateien löschen.
Dies benötigt später bewusstes, separat freigegebenes Garbage-Collection-Verfahren.

Adminbereich in bestehendem ManagementPanel; automatisch sortierte zwei Kataloglisten,
Vorschau, Dateiauswahl/Replace/Remove, Textarea, Save/Fehler/Uploadstatus.
Bildempfehlung 1920×1080 / 16:9, akzeptabel ca.1280×720, kein hartes Seitenverhältnis;
object-cover mit mittigem Motiv. CMS-Bild vor lokalem assetKey-Bild, sonst CSS/Icon.
Kaputtes Bild wird durch Fallback ersetzt, neue URL wird erneut versucht.
Info nur wenn nicht leer; lange Texte aufklappbar; keine Quellenpflicht.
Neuer Meilenstein: Katalog erweitern, erscheint ohne DB-Zeile automatisch im Admin.
Bestehende interestingFact/source bleiben im Katalog, werden hier nicht gerendert.

## Reads / Cache / Deployment
/stats/milestones: 063 + 067 V2 + ein gebündelter Content-Read (3 Modul-Reads).
Kein N+1; keine zusätzlichen Overview-Reads. Bestehender 20s Snapshot-ReadCache
mit scopebezogener Deduplizierung/Realtime/Focus bleibt erhalten.
Scope-unabhängiger Content nutzt denselben ReadCache-Typ, kein Polling/Realtimeabo.
Adminsave invalidiert nur Content und benachrichtigt aktive lokale Consumer;
Focus lädt nur bei abgelaufener Stale-Zeit. Fehler blockieren keine Metriken.

Deployment-Reihenfolge: additive 067 prüfen/anwenden, admin-media aktualisieren,
danach Frontend. SQL allein aktiviert den neuen Admin-Endpoint nicht.
Kein produktives Deployment durch diesen Auftrag erfolgt.

## Prüfungen und offene Abnahme
Fokussierte React-/Service-/Resolver-Tests und statische SQL-/Security-Vertragstests.
SQL-fixtures: supabase/tests/database/team_milestone_content_history.sql,
ausschließlich disposable lokale DB; niemals Produktion.
Manueller vollständiger Rollback-Preflight:
supabase/tests/read_only/team_milestones_v2_preflight.sql.
Enthält unveränderte 067, aktuellen Katalog, All-Time/Saison-Parität mit 065 plus
Placeholders, Belege, Grants/Policies und EXPLAIN (ANALYZE,BUFFERS,TIMING OFF).
PL/pgSQL-EXPLAIN zeigt Gesamtlaufzeit, keine nested Scan-Pläne. Echte Kosten sind
erst auf realistischem Bestand bewertbar; noch keine Indexbehauptung/-änderung.

Lokal kein PostgreSQL/pgTAP/Docker/Deno und keine Supabase-.env vorhanden.
Keine SQL-Ausführung, keine gemessene RPC-Runtime, keine All-Time-/Saison-Realwerte
oder drei realen Trigger-Beispiele. Alle Rechenbeispiele sind ausdrücklich Beispiele.
Browser: Navigation/Heading bei 360/390/430/1440 ohne horizontalen Overflow gemessen.
Mangels Daten nur Setup-Zustand: Sticky-Scroll, Chart-Dialog, befüllte Karten,
Admin-Upload, Bildcrop und Badge-Accordion bleiben echte visuelle Abnahme offen.

Abschluss der lokalen automatisierten Prüfung: 77 Tests in 15 Dateien bestanden;
check:quick und Produktionsbuild erfolgreich, git diff --check ohne Fehler.
Vier bereits bekannte unveränderte Denmark-Asset-Platzhalterwarnungen im Build.
Keine vollständige Suite, kein Deno-Typecheck und keine DB-Laufzeitprüfung behauptet.

## Geänderte Dateien PR70

- src/components/management/MilestoneManagement.tsx
- src/components/stats/MilestoneArtwork.test.tsx
- src/components/stats/StatsHeader.tsx
- src/hooks/useMilestoneContent.ts
- src/services/milestoneContentService.test.ts
- src/services/milestoneContentService.ts
- supabase/migrations/202610080067_team_milestone_content_history.sql
- supabase/tests/database/team_milestone_content_history.sql
- supabase/tests/read_only/team_milestones_v2_preflight.sql
- supabase/tests/teamMilestoneCms.test.ts
- docs/MODULES.md
- docs/TEAM_MILESTONE_SYSTEM.md
- src/components/compare/CompareMetricRow.tsx
- src/components/dashboard/WRProgression.tsx
- src/components/management/ManagementPanel.tsx
- src/components/stats/BadgeRarityGrid.test.tsx
- src/components/stats/BadgeRarityGrid.tsx
- src/components/stats/MilestoneArtwork.tsx
- src/components/stats/RivalryHubContent.tsx
- src/components/stats/StatsNavigation.test.tsx
- src/components/stats/StatsNavigation.tsx
- src/components/stats/TeamMilestones.test.tsx
- src/components/stats/TeamMilestones.tsx
- src/lib/teamMilestoneProgress.ts
- src/lib/teamMilestones.test.ts
- src/lib/teamMilestones.ts
- src/pages/StatsBadgesPage.tsx
- src/pages/StatsMostWantedPage.tsx
- src/pages/StatsOverviewPage.tsx
- src/pages/StatsPage.tsx
- src/pages/StatsRivalriesPage.tsx
- src/pages/StatsStructure.test.tsx
- src/services/adminMediaService.ts
- src/services/teamMilestonesService.test.ts
- src/services/teamMilestonesService.ts
- src/types/database.ts
- supabase/functions/admin-media/index.ts
