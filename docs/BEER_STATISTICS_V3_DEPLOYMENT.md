# Bierstatistik 3.0 – Bereitstellung und Abnahme

## Geänderte Dateien
- src/components/stats/BeerBottle.tsx
- src/components/stats/BeerStatisticsContent.tsx
- src/components/stats/BeerBrandDetail.tsx (neu)
- src/lib/beerStatisticsFormat.ts
- src/types/beerStatistics.ts
- src/services/beerStatisticsService.ts
- src/services/adminMediaService.ts
- src/components/stats/BeerStatisticsContent.test.tsx
- src/pages/StatsBeerPage.test.tsx
- src/services/beerStatisticsService.test.ts
- src/services/adminMediaService.test.ts
- src/services/beerImageGateway.test.ts
- supabase/migrations/202611080074_beer_statistics_power.sql (neu)
- supabase/tests/database/beer_statistics_power.sql (neu)
- docs/BEER_STATISTICS_V3_DEPLOYMENT.md (neu)

## Stand / Diagnose
Lokal auf origin/main 5509a21 aufgebaut. Keine produktive Ausführung.
Der Client sendet `upload-beer-image` bzw. `remove-beer-image` als FormData an
`admin-media`. Der aktuelle Handler verarbeitet beide Aktionen. Seine allgemeine
Fallback-Antwort lautet exakt „Unbekannte Medienaktion.“; die Adminfreigabe wird
vorher geprüft. Ein alter Handler oder ein anderes Zielprojekt ist deshalb die
wahrscheinlichste Erklärung, kein nachgewiesener Produktionsbefund.

Nicht live geprüft: tatsächlich versendeter Browserrequest, produktiver Handlerstand,
Projektidentität, Migration 073, Bucket, Secrets und JWT-Konfiguration.
Lokal fehlen ein konfiguriertes Supabase-Projekt und eine Datenbank-/CLI-Laufzeit.
Die neue verständliche Meldung gilt nur für diese beiden Aktionen und genau
diesen Fallback. Andere Fehler behalten ihre eigene Meldung.

## Manuelle Bereitstellung (nicht durch diese Arbeit ausgeführt)
1. Im Browser-Netzwerkpanel beim Upload Request-URL und FormData prüfen:
   `/functions/v1/admin-media`, Aktion `upload-beer-image`.
   Keine Tokens oder Schlüssel kopieren/veröffentlichen.
2. Die Projektkennung dieser URL mit der tatsächlich veröffentlichten
   `VITE_SUPABASE_URL` und dem Zielprojekt im Supabase Dashboard abgleichen.
   Bei eigener Domain deren Projektzuordnung im Dashboard prüfen.
   RPCs und Medien benutzen im Code denselben Supabase-Client.
3. Im SQL Editor dieses Projekts ausschließlich lesend Voraussetzungen prüfen:

```sql
select to_regclass('public.beer_brand_images') as image_table,
       to_regprocedure('public.get_beer_image_catalog()') as image_catalog,
       to_regprocedure('public.get_beer_statistics_dashboard(integer)') as statistics_rpc;
select id, public, allowed_mime_types, file_size_limit
from storage.buckets where id = 'beer-brand-images';
```

   Alle Objekte müssen vorhanden sein; fehlende Objekte bedeuten, dass 073
   im Zielprojekt noch nicht vollständig bereitsteht. Kein Ersatzschema anlegen.
4. Mit installierter Supabase CLI aus dem Repository-Verzeichnis, nach bewusstem
   Abgleich des Zielprojekts:

```powershell
supabase login
supabase projects list
$beerProjectRef = Read-Host 'Geprüfte Projektkennung aus dem Supabase Dashboard'
supabase functions list --project-ref $beerProjectRef
supabase secrets list --project-ref $beerProjectRef
supabase functions deploy admin-media --project-ref $beerProjectRef --no-verify-jwt
supabase functions list --project-ref $beerProjectRef
```

   Dies veröffentlicht ausschließlich die vorhandene Edge Function; ein Frontend-
   Deployment oder eine SQL-Migration veröffentlicht sie nicht automatisch.
   `--no-verify-jwt` entspricht der bestehenden Einstellung in `supabase/config.toml`.
   Die eigene signierte Adminautorisierung bleibt unverändert zwingend.
   Benötigt werden serverseitig `ADMIN_ACCESS_CODE`, `ADMIN_TOKEN_SECRET`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Letztere stellt Supabase
   im Funktionskontext bereit. Vorhandene Secrets nicht rotieren oder durch
   neue Werte ersetzen. Insbesondere keinen Service-Role-Key ins Frontend übernehmen.
   CLI-Login/Deploy erfordert Zugriff auf genau dieses Projekt.
5. Additive Migration `202611080074_beer_statistics_power.sql` separat im
   vorgesehenen DB-Releaseprozess prüfen und anwenden, dann das Frontend veröffentlichen.
   Migrationen 071–073 bleiben unverändert. 074 ersetzt nur den lesenden RPC und
   dessen Grants; keine Tabellen-, Daten-, Trigger- oder Backfill-Änderungen.
   Das neue Frontend meldet einen fehlenden 074-Payload ausdrücklich als Fehler.

Offizielle Befehlsreferenzen:
- https://supabase.com/docs/guides/functions/deploy
- https://supabase.com/docs/reference/cli/introduction

## Read-only Kontrolle nach 074
```sql
with scopes as (
  select null::integer season_year
  union
  select max(extract(year from start_date)::integer)
  from public.events where deleted_at is null and extract(year from start_date) >= 2026
), payloads as materialized (
  select season_year, public.get_beer_statistics_dashboard(season_year) data from scopes
)
select season_year, jsonb_typeof(data) root_type,
       jsonb_typeof(data->'rankings') rankings_type,
       jsonb_array_length(data->'rankings'->'power') power_brands,
       jsonb_array_length(data->'rankings'->'record') record_brands,
       jsonb_array_length(data->'rankings'->'volume') volume_brands,
       jsonb_array_length(data->'rankings'->'turbo') turbo_brands,
       (select count(*) from jsonb_array_elements(data->'brands') b
        where (b->>'powerPlayerCount')::integer > 5
           or jsonb_array_length(b->'powerPlayers') <> (b->>'powerPlayerCount')::integer
           or (b->>'powerQualified')::boolean <> ((b->>'powerPlayerCount')::integer >= 2)
       ) as invalid_power_rows
from payloads;
```
Erwartet: object/object, nichtnegative Anzahlen und invalid_power_rows = 0.
Leere Rankings sind bei fehlender Qualifikation gültig. Die pgTAP-Fixtures unter
`supabase/tests/database/beer_statistics_power.sql` sind ausschließlich für eine
wegwerfbare lokale Testdatenbank, niemals für diesen produktiven Kontrollschritt.

## Fachliche / technische Änderung
Der neue offizielle Powerwert verwendet pro Marke die persönliche Bestzeit jedes
regulären Spielers, daraus maximal fünf unterschiedliche Spieler; qualifiziert ab
zwei. Rohwerte bleiben bei einer Person sichtbar. Unrunde Werte bestimmen die
Reihenfolge vor Stichprobengröße, schnellster Beitragszeit und Biername.
Saison richtet sich unverändert nach Eventdatum. Verbrauch schließt Gäste/AK ein,
Leistung nicht. Keine Ableitung von Marken aus Eventstandards.
Die alten Gesamtmittel, Lieblingsbiere und Legacy-Payloadfelder bleiben kompatibel;
`summary.bestBeer` bleibt ein Legacy-Gesamtmittel-Feld und steuert NICHT das neue Podium.
Offizielle neue Rankings stehen ausschließlich unter `rankings`.

Podium, Liste und Einzelmarkendetails nutzen einen RPC und dieselbe Bildzuordnung.
Turbo/Bremse berücksichtigen alle qualifizierten Spieler-Marken-Paare, auch
Nicht-Lieblingsbiere. Keine neuen Requests je Marke und keine parallele Berechnung
der Rangfolgen im Browser.

## Noch manuell abzunehmen
- Nach Edge-Deployment echte transparente PNG und WebP hochladen, ersetzen,
  neu laden, löschen; Alpha erhalten und neue Pfade sichtbar.
- Gleiche Marke/Bildzuordnung in All-Time und Saison, Podium, Liste und Detail.
- Bestehende Avatar-, Eventfoto-, Meilenstein- und Award-Aktionen weiter nutzbar.
- Ab 360 px sowie Desktop: lange Marken/Spielernamen, Flasche, breite Dose/Fass
  vollständig sichtbar (object-contain), kein horizontaler Überlauf.
- Tastatur: Kategorie/Marke wählen, Podium/Liste aktivieren, zehn/alle umschalten,
  Details öffnen; sichtbarer Fokus. Dieselben Aktionen per Touch.
- Aktuelle reale Daten: zwei bis fünf unterschiedliche Power-Beiträge und
  Rangfolge, Single-Player-Rohwert, Saisonwechsel und leere Kategorien.
Diese realen Upload-, Browser- und SQL-Laufzeitprüfungen wurden lokal nicht
durchgeführt. Der produktive Upload ist bis dahin ausdrücklich nicht als behoben
bestätigt.
