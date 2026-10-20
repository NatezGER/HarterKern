# Bierstatistik 2.0 (073)

Basis: origin/main 49b285d; 071 und 072 bleiben unverändert.
Lokal implementiert, nicht committed/gepusht/deployt. Regeln aus
BEER_STATISTICS.md gelten weiterhin; folgende Abschnitte ersetzen dessen
Aussagen zu Hero, Payload und fehlender historischer Nachpflege.

## Nachpflege und sichere Ausführungsreihenfolge
1. Vor Migration 073 ausschließlich
   supabase/tests/read_only/beer_statistics_v2_backfill_check.sql ausführen.
   Die erste Abfrage listet die exakten Kandidaten pro Event inklusive Gäste,
   DNF und gelöschter Attempts. Zahlen prüfen; bei unerwartetem Umfang stoppen.
   Keine Produktionszahlen wurden lokal ermittelt.
2. 073 zunächst in einer zurückgerollten Preflight-Transaktion prüfen.
   Die enthaltene Nachpflege schreibt innerhalb dieser Transaktion tatsächlich
   Snapshots und löst bestehende UPDATE-Trigger aus; ROLLBACK am Ende verwenden.
   Das ist kein reiner Read-only-Preflight. Trigger-/Ledger-Kosten können die
   Laufzeit beeinflussen; keine Trigger werden deaktiviert oder verändert.
3. Nach Freigabe additive Migration 202610200073_beer_statistics_v2.sql anwenden.
   Ihre einmalige Nachpflege ruft denselben service-only Helper auf wie v4 und
   meldet die Anzahl per NOTICE. Nur leere Marken und nicht gelöschte,
   abgeschlossene Events mit nichtleerem Default sind Kandidaten. Alle
   bestehenden Snapshots/Overrides bleiben unverändert, auch andere Marken.
   Gäste/DNF sowie gelöschte Attempts bekommen ebenfalls leere Snapshots
   ergänzt; deren Statistik-Eligibility ändert sich nicht. Kein Mengen-Backfill.
4. admin-media mit den zwei neuen Aktionen deployen, anschließend Frontend.
   Ohne 073 fehlen v4 und neue Payload-Felder; ohne Edge-Deployment funktionieren
   Bildaktionen nicht. Keine produktiven Aktionen in diesem Auftrag ausgeführt.
5. Read-only-Kandidatenabfrage wiederholen: keine Zeilen erwartet.
   Dashboard lesen; Königshof nur erwarten, wenn reale qualifizierende
   historische Versuche und entsprechender Eventdefault vorhanden sind.

sync_update_event_v4 sperrt das Event, delegiert Validierung/Metadaten an v3
und ergänzt im selben Commit nur dessen leere Attempts. Bei aktivem Event
oder leerem neuem Default keine Ergänzung. Weglassen des expliziten Updateflags
ändert weder Default noch Attempts. backfill_closed_event_beer ist idempotent,
nicht durch anon/authenticated aufrufbar; der allgemeine Einmalaufruf ist nur
Migration/Service vorbehalten. Keine dauerhaften automatischen Trigger.

## Zentraler Read und Rankings
get_beer_statistics_dashboard(integer) bleibt ein einziger stable,
security-invoker Read mit denselben Populationen/Scope-Filtern aus 072.
Zusätzlich: fastest (maximal zehn reguläre Einzelzeiten, Zeit/Chronologie/ID),
unlucky (ALLE qualifizierten Spieler-Marken-Paare mit positivem Delta),
brands[].imagePath, players und eventDetails.
Events werden einmal pro Marke aggregiert, nicht pro Frontendkarte abgefragt.
Gesamtbaseline enthält weiterhin unbekannte Biere. Mindeststichprobe zwei
für Durchschnittswertungen, eins für Einzelzeit und Sortenvielfalt.

Rekordbuch: Marken-Ø, schnellste Einzelversuche, Liter, Verbesserung,
Sortenvielfalt. Lieblingsbier und Turbo behalten die 072-Tie-Breaker.
Pechvogel sortiert Delta absteigend, Anzahl absteigend, Name, Spieler-ID und
Marke. Keine Kausalitätsaussage. Literumrechnung bleibt gemeinsamer 0,2-L-Helper.
Die UI selektiert nur vorhandene Rankings und sortiert Marken nach ihrem
serverseitig bestimmten Leistungsplatz, keine zweite Eligibility-Engine.

## Bierregal und Medien
Native details/summary-Disclosure: Tastatur/Touch ohne eigene Tastatur-Engine,
stabile Markenkeys erhalten geöffneten Zustand beim erneuten Rendern.
Scoped Loading/Empty/Fehler behalten bestehendes Verhalten (Remount kann
offene Karten schließen). Saisonwahl bleibt im SeasonProvider.
Festes Hochformat, object-contain, lazy loading, Fallback auch bei Ladefehler.
Keine Mengenhero-/Milestone-Grafik und damit kein zusätzlicher Editorial-Read.

Exakte Marke ist globaler Primärschlüssel von beer_brand_images, kein Alias-
oder Katalogsystem. get_beer_image_catalog liefert vorhandene Marken aus
Attempts/Events einmalig bei geöffneter Verwaltung, unabhängig von der Saison.
Keine Base64-Payloads oder Einzelkarten-Reads. Bild-URL-Bildung ist lokal;
Bilddateien benötigen selbstverständlich normale Browser-Assetrequests.

Upload/Delete ausschließlich nach vorhandener signierter Adminfreigabe in
admin-media. Service-Role schreibt Tabelle und Bucket; öffentlich nur Lesen.
PNG/WebP, maximal 5 MB, geprüfte Header/Abmessungen (8192 je Achse und 20 MP).
UUID-Dateinamen ohne Marken im Pfad, immutable Uploads, Vergleich des erwarteten
alten Pfads vor der Aktion UND bedingtes DB-Update/Delete. Bei konkurrierendem
Save wird nur der eigene neue Upload bereinigt. Alte Datei erst nach erfolgreicher
DB-Verknüpfung/Entkopplung löschen. Storage und PostgreSQL können nicht gemeinsam
atomar committen: Cleanup-Fehler werden gemeldet; referenzierte neue Bilder
bleiben korrekt, verwaiste Objekte sind ggf. manuell zu bereinigen.
In Fehlerfällen neu laden vor erneutem Bearbeiten.
Realtime der neuen Mappingtabelle invalidiert den bestehenden Scope-Cache;
keine neue Subscription/Requests pro Marke, bestehender Kanal wird erweitert.

## Geänderte Dateien
- docs/BEER_STATISTICS.md, docs/BEER_STATISTICS_V2.md
- src/components/management/ManagementPanel.tsx, BeerImageManagement.tsx
- src/components/stats/BeerStatisticsContent.tsx, BeerStatisticsContent.test.tsx, BeerBottle.tsx
- src/pages/StatsBeerPage.test.tsx
- src/services/beerStatisticsService.ts, beerStatisticsService.test.ts
- src/services/dataGroupService.ts, dataPlatformRepository.ts
- src/services/mediaService.ts, mediaService.test.ts, adminMediaService.test.ts
- src/services/beerImageGateway.test.ts, beerBrandRepository.test.ts, eventLifecycleRepository.test.ts
- src/types/beerStatistics.ts, database.ts
- supabase/functions/admin-media/index.ts
- supabase/migrations/202610200073_beer_statistics_v2.sql
- supabase/tests/database/beer_statistics.sql, event_attempt_beer_brand.sql
- supabase/tests/read_only/beer_statistics_v2_backfill_check.sql

## Tests und offene Abnahme
SQL: event_attempt_beer_brand.sql und beer_statistics.sql jetzt mit 073 ausführen,
nur disposable lokale DB, synthetische Fixtures, ROLLBACK. Nicht produktiv!
Abgedeckt: Closed/Active/Clear/Override/Einmalnachpflege, Mengen/Leistung,
Einzelrekord, globales Bild, verschlechterte Nicht-Lieblingsmarke, Schreibrechte.
Lokal sind PostgreSQL/pgTAP/Docker/Supabase CLI nicht verfügbar: kein DB-Lauf.

Frontend-/Service-Tests: Struktur, Auswahl, fehlende/defekte Bilder, Scope/Cache,
Media-Aktionen, fehlende Autorisierung. Edge-Handler wird mit realer Tokenprüfung
und injiziertem In-Memory-Storage/DB-Client ausgeführt; kein Netzwerk.
Native Disclosure-Struktur ist getestet, echte Browserinteraktion/Layout nicht.
Manuell: 360/390/430 px und Desktop, lange 80-Zeichen-Namen, große Zahlen,
Tastatur Enter/Space, Touch, alle Kategorien, Scopewechsel, Retry, globale
Bildaktualisierung in zweitem Client, PNG/WebP mit Transparenz, echter Upload/
Replace/Delete und Cleanup-Fehler. Produktionslaufzeit und Triggerkosten messen.
