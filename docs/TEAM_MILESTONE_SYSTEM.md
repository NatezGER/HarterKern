# Team Milestone System

Basis: origin/main a6cc3bacc7ed549d181297c2242eae18d83da7c4.
Branch: feat/team-milestone-system. Lokal implementiert, nicht deployed.

## Architektur und Daten

- Statischer typisierter Katalog: src/constants/teamMilestones.ts.
  46 beer-volume- und 25 team-time-Einträge; kein category-Feld.
  Schwellen: Liter bzw. Sekunden. IDs und assetKeys sind stabil und eindeutig.
- Ein Resolver: src/lib/teamMilestoneProgress.ts. Kopiert und sortiert die
  Definitionen numerisch, ohne den Katalog zu mutieren.
- src/lib/teamMilestones.ts projiziert Snapshot 065 in beide Fortschritte.
  Bier nutzt weiterhin den gemeinsamen beerVolume-Konverter (0,2 L/Versuch).
  Die kompakte BeerVolumeCard verwendet denselben Katalog/Resolver; keine
  zweite Schwellenliste. Das kompakte Layout bleibt erhalten.
- Migration 065 unverändert. Keine Migration 067, keine neue Tabelle, keine Writes.
  get_team_milestones_snapshot bleibt kanonisch: gültige Eventversuche für
  Volumen, Summe der zehn schnellsten unterschiedlichen Spieler-PBs für Zeit.
  Historische qualifizierte Zeiten können PBs beitragen, aber kein Eventbier.
- Most Wanted/063, Rivalry, Badge-Eligibility, Compare und Save-Hotpath unverändert.

## Progression

previous = zuletzt erreichte Schwelle, next = nächste noch offene Schwelle.
- Up: (current-previous)/(next-previous).
- Down: (previous-current)/(previous-next).
- Clamp 0..1, Anzeige round(progress*100).
- Rest up: next-current; down: current-next. Rest auf 8 Dezimalstellen gegen
  binäre Floating-Point-Artefakte normalisiert, Anzeige maximal zwei.
- Gleiche Schwelle gilt als erreicht; neue Stufe beginnt bei 0 %.
- Bier vor erster Schwelle: Nullpunkt als Start.
- Teamzeit oberhalb erster Schwelle: 0 % und erstes Ziel; keine willkürliche
  langsamere Ausgangszeit erfinden.
- Nach letzter Schwelle: 100 %, kein erfundenes Folgeziel.
- Fehlende/ungültige Messwerte: keine Freischaltung.
- Teilteam X<10: Summe und X/10 bleiben sichtbar, aber keine Teamzeitstufen
  erreicht. Reguläre Freischaltung erst mit zehn Spielern und gültiger Summe.

Referenzen: 52,4 L zwischen 51,1 und 60 = 14,6 %, Anzeige 15 %, Rest 7,6 L.
26,10 s zwischen 26,59 und 25,96 = 77,8 %, Anzeige 78 %, Rest 0,14 s.
Beide Balken wachsen links nach rechts.

## Darstellung und Scope

Team-Fortschritt → unverändertes Most Wanted → erreichte Meilensteine.
Zwei gleichwertige Cards ab lg, darunter gestapelt; min-w-0, umbrechende Titel,
responsive Artwork-Flächen. Historientexte sind aufklappbar, zukünftige Stufen
werden dort nicht gerendert. Keine erfundenen First-Reached-Daten.

Der globale All-Time-/Season-Scope filtert Rohwerte, nicht den statischen Katalog.
Karten UND Historie prüfen synchron snapshot.season === season.
Erreicht bedeutet aktuell im Scope erreicht, keine immutable Award-Historie;
Quellenkorrekturen können erreichte Stufen wieder reduzieren.

## Artwork

src/assets/team-milestones/<assetKey>.webp (oder avif/png/jpg/jpeg/svg).
Vite-Glob entdeckt Dateien beim Build automatisch; Reihenfolge der Formate:
avif, webp, png, jpg, jpeg, svg. Keine HTTP-Probes für nicht vorhandene Bilder.
Fehlende Datei: neutraler CSS/Icon-Fallback. Bild-Ladefehler: derselbe Fallback.
Normale Lazy-Image-Requests nur für vorhandenes Artwork, keine Metadaten-RPCs.
Keine Bilder generiert oder heruntergeladen.

## So fügt man einen neuen Meilenstein hinzu

1. Einen typisierten Katalogeintrag mit eindeutiger ID/Schwelle/assetKey und
   Beschreibung hinzufügen. interestingFact darf null bleiben; andernfalls
   passende Source angeben. Zahlen nicht in JSX eintragen.
2. Optional eigenes Artwork unter dem Asset-Key ablegen und neu bauen.

Keine UI-/Resolver-Änderung nötig. Katalogtests verhindern doppelte IDs,
Schwellen je kind und Asset-Keys. Quellenentscheidungen stehen im vereinfachten
TEAM_MILESTONE_SOURCE_AUDIT.md. Die freigegebene Schokoladenstufe ist 17.000 L.

## Reads und Performance

Weiterhin die bestehenden zwei Inhalts-RPCs: 063 Most Wanted und 065 Teammetriken.
OptionalDataState konsumiert Gruppenstatus, erzeugt auch bei zweimaliger Nutzung
keinen zweiten Snapshot-Read. Cache-Keys bleiben scopebezogen, 20 Sekunden,
In-flight-Deduplizierung, Retry/Realtime/Focus unverändert. Keine N+1-, Unified-,
Badge-, Rivalry- oder Performance-Reads. Fakten/Quellen/Asset-Mapping statisch.
Lade-Reihenfolge der optionalen Gruppen unverändert (Most Wanted, Teammetriken).
Reale Produktionswerte und Network-/Runtime-Messung wurden nicht erhoben.

## Tests und Abnahme

Resolver-/Katalogtests: Grenzwerte, Sortierung, beide Richtungen, Beispiele,
fehlende Werte, kompletter Katalog und Teilteam.
UI: Hauptkarten, Prozent/Rest, Fallback, Fact-Guard, nur erreichte Historie,
Seitenreihenfolge und synchroner Stale-Guard.
Bestehende Service-/Cache-/Route-Tests schützen die Read-Isolation.
Lokale Prüfung: 57 Tests in 10 Dateien bestanden; check:quick (Lint und
TypeScript), Produktionsbuild und git diff --check erfolgreich. Der Build
meldet vier bestehende Asset-Warnungen aus den unveränderten Denmark-Styles.
Browser-Abnahme bleibt offen: 1440 px und 360/390/430 px, lange Titel,
große Literzahlen, Fact-Disclosure und nachgereichte Bilder.
Keine Behauptung, SSR-/Klassentests würden echte Overflow-Messungen ersetzen.
