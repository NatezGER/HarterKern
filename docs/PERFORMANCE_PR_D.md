# PR D – Live-Statistikmedaillen

## Stand

Basis: aktuelles `origin/main` nach Fetch,
`b83c3ffc29bed9f33e99342559c739c6ee4a3e2a`, Merge PR #81; PR #79/#80 sind enthalten.
Der bestehende PR-C-Worktree war sauber. Neuer lokaler Branch:
`feat/performance-medal-table`. Keine vorherigen Änderungen überschrieben.

PR D ist ausschließlich lokal geändert, nicht committed, gepusht, als PR
veröffentlicht, gemergt oder deployt. Keine Migration oder produktiven Schreibtests.

## Berechnung

`calculatePerformanceMedals` ist eine reine TypeScript-Ableitung aus geladenen
Rankings. Keine Statistik wird neu berechnet oder umsortiert. Eingaben sind
Saison, beide Rankingquellen mit Ladezustand/Scope/Abdeckungsvertrag und das
aktive reguläre Spielerregister. Das Ergebnis enthält Spieler, Farben, Gesamt,
Wettbewerbsrang, einzelne Medaillenbelege und Kategoriezustände.

Ausschließlich `MetricRankEntry.rank` entscheidet: 1 Gold, 2 Silber, 3 Bronze.
Arraypositionen werden niemals als Rang verwendet. Gleiche Spielereinträge
werden pro Kategorie dedupliziert; widersprüchliche Duplikate und ungültige
Ränge/Werte führen sicherheitshalber zum Auslassen der Kategorie. Gäste,
AK-Spieler und archivierte Spieler erhalten keine Medaillen.

Mehr als fünf unterschiedliche berechtigte Empfänger auf Rang 1–3 schließen
**die ganze Kategorie** aus. Ein, zwei oder genau fünf Empfänger sind erlaubt.
Keine künstliche Auffüllung fehlender Farben. Die Tabelle sortiert Gold, Silber,
Bronze absteigend, dann Name/ID. Gleiche Farbverteilungen erhalten `rank()`-
entsprechende Platzierungen (1, 1, 3), einschließlich Null-Medaillen-Spielern.
Die Gesamtzahl ist kein Sortierkriterium vor Gold.

## Zulassung und vollständiger Katalog

Die zentrale Konfiguration `performanceMedalEligibility.ts` kombiniert die
bestehende `performanceSections`-Komposition mit der tatsächlich sichtbaren
BINGO-Gruppe. Die Gruppenauswahl wird mit `BadgeRankingSections` geteilt.
Es gibt keine zweite unabhängig gepflegte Liste aller sichtbaren Karten.
`excludedKeys` ist zunächst leer; zukünftige Ausschlüsse sind dort möglich.

Aktuell sind bis zu **40 Kategorien** im jeweiligen Scope vorgesehen:

| Bereich | Keys |
| --- | --- |
| I Geschwindigkeit | `fastest`, `average`, `median`, `fastest-five`, `best-five-window`, `sub3` |
| II Konstanz | `consistency`, `dnf`, `streak`, `performance-fastest-consistent` |
| III Präzision | `near-repeat`, `matrix-glitch`, `smooth`, `common` |
| IV Aktivität | `valid`, `event-max`, `two-in-sixty-total`, `two-in-sixty-best` |
| V Start/Endspurt | `fastest-first`, `fast-starter`, `performance-endspurt` |
| VI Entwicklung | `performance-upward-spiral`, `performance-downward-spiral`, `performance-form-rise`, `performance-form-decay`, `performance-plateau` |
| VII Führung/Rivalry | `lead-time`, `takeovers`, `performance-rivalry-events`, `performance-chaos-takeovers` |
| VIII Rekorde | `pb-jump`, `wr-reign`, `wr-improvements`, `wr-jump`, `performance-record-hunter`, `performance-near-legend` |
| IX BINGO/Most Wanted | `bingo-lines`, `bingo-fields`, `rare-hunter`, `most-wanted-firsts` |

Es zählen nur im aktuellen Scope vorhandene Definitionen. Alte Clutch-,
Late-Bloomer-, One-Shot-, gemeinsame Chaos-, Event-Break- und Badge-Familien-
Rankings kommen nicht durch die globale Registry zurück. Negativ-/Spaßwerte
sind wie beauftragt gleichberechtigt enthalten.

`medalThresholdMetricKey = "sub3"` repräsentiert die Unter-X-Karte genau einmal.
Die UI-Auswahl ihrer anderen vier Zeitgrenzen ist unabhängig. Hilfetext und
Aggregation verwenden diese zentrale Konfiguration; kein zweiter Selektor.

## Nachweis der Quellabdeckung

Die aktuell wirksame BINGO-Funktion steht in **Migration 069**, nicht mehr 064.
Sie berechnet `rank()` nach Wert und `row_number()` nach derselben Wertordnung
plus stabilen Tie-Breakern und liefert `display_position <= 10`. Der Service
kürzt nicht zusätzlich. Die drei Performance-Zweige aus 077 (eingebettet in
078) liefern ebenfalls zehn Zeilen; der PR-C-Helper begrenzt `display_order<=10`.
Ein statischer Test sucht die letzte Funktionsdefinition über alle Migrationen.

Deshalb liegen bei höchstens fünf Podiumsempfängern alle vor; bei mehr als fünf
liegen mindestens sechs vor und reichen zur vollständigen Disqualifikation.
Die Kartendarstellung mit fünf Zeilen wird nicht als Eingabe verwendet.
Bei mehr als zehn tatsächlichen Podiumsempfängern ist nur die gelieferte Anzahl
bekannt; der Hinweis sagt deshalb ausdrücklich „im gelieferten Ranking“.
Unbekannte Abdeckungsverträge werden als `unsafe` behandelt, ohne Medaillen.

## Spielerregister und Requests

Der Performance-Payload bildet seine Spieler aus Statistikschlüsseln und enthält
nicht sicher jeden aktiven Spieler ohne Zeiten. Deshalb nutzt die Route die
vorhandene optionale Datengruppe `players`. Ihr bestehender `getPlayers()`-Read
liefert alle nicht archivierten Spieler und Statistiken in zwei gebündelten
Abfragen. Der Algorithmus filtert AK zusätzlich. Fehlende Statistikwerte schließen
keinen aktiven regulären Spieler aus: Null-Medaillen-Zeilen bleiben sichtbar.

Zusatzkosten: maximal zwei bestehende Spielergruppen-Abfragen beim Cache-Miss,
kein Request pro Spieler/Kategorie und kein Request beim Ausklappen. Saisonaler
Performance-Load damit nominell vier Requests (Performance, BINGO, zwei Spieler-
Reads), All-Time fünf inklusive bestehendem historischen Archiv. Cache kann
Reads vermeiden. Keine gemessenen Netzwerklaufzeiten behauptet.

## Scope, Ladezustände und Aktualisierung

Performance- und BINGO-Datensätze tragen ihre tatsächliche Saison. Der Algorithmus
verlangt beide passend zum gewählten Scope plus ein fertig geladenes Register.
Bei Laden, Fehler oder fremdem Scope wird **keine Teilwertung** angezeigt.
Die Komponente benennt die offene Quelle und bietet bei Fehlern einen Retry über
die bestehenden Hook-/Datengruppenfunktionen. Die normale Performance-Seite bleibt
nutzbar, auch bei einem Fehler der optionalen BINGO-/Spielergruppe.

Der Performance-Hook prüft zusätzlich die Refresh-Version: Ein gerade veralteter
Snapshot wird schon beim Versionswechsel ausgeblendet, bevor der neue Effekt
läuft. Bestehende Abort-/Run-Guards verhindern späte alte Antworten. Tests decken
Saisonwechsel, Versionswechsel und Cleanup ab. Kein eigener Cache, Polling oder
zusätzliche Realtime-Subscription. Quellen aktualisieren nach ihren bisherigen
Regeln; insbesondere BINGO/andere Werte können erst beim Eventabschluss folgen.
Live bedeutet verfügbarer offizieller Stand, keine transaktionale Gleichzeitigkeit
aller separat geladenen Quellen und keine Garantie eines Updates pro Versuch.

## Oberfläche

Der Spiegel steht direkt nach der Statistiknavigation und vor „Ligastatistiken“.
Kompakte Dark-Mode-Rangliste mit Avatar/Profillink, Rang und Gold/Silber/Bronze.
Die drei Medaillenspalten bleiben auf schmalen Ansichten nebeneinander; Namen
können kürzen, Detailtexte umbrechen. Gesamtzahl im aufklappbaren Detailtitel.
Native `details`/`summary` bieten Maus-, Touch- und Tastaturbedienung mit Fokusstil.

Medaillen sind nach Farbe, Themenbereich und Statistikname geordnet. Sie zeigen
Originaltitel, tatsächlichen Statistikrang, formatierten Wert, vorhandene
Stichprobe und Bereichslink. Bei Null Medaillen steht ein verständlicher Leertext.
Ausgeschlossene/deaktivierte/unsichere Kategorien werden separat erklärt; leere
Podien sind gezählt. Die Fünferregel, feste Zeitgrenze und Spaßkategorien stehen
in einem kompakten Hilfedetail.

Die Hinweise unterscheiden Live-Vorschau, aktuellen All-Time-Vergleich und
spätere endgültige Karriere-Medaillensumme. Keine Event-Podiumsgrafik zweckentfremdet.

## Prüfungen

**77 gezielte Tests in 12 Dateien bestanden.** Abgedeckt: normale/geteilte Podien,
exakt fünf/sechs/zehn Empfänger, wenige Teilnehmer, leere/ungültige Daten,
Duplikate, lexikografische Sortierung, Ranggleichstände, Null-Spieler, Zulassung,
BINGO/Most Wanted, feste Zeitgrenze, Konfigurationswechsel, Scope/Ladefehler,
Refresh/Cleanup, Seiteneinbindung, Belege und deutsche Formatierung.

Gezielte bestehende Regressionen für PR-A-/PR-B-/PR-C-Karten, BINGO-Sichtbarkeit,
Datengruppen sowie Saison-/Cache-Zuordnung bestanden. Ein erster SQL-Vertragstest
fand die neuere BINGO-Definition 069; diese wurde gelesen und die Prüfung auf
sie korrigiert. Auch diese Definition liefert zehn korrekt sortierte Zeilen.

`npm run check:quick`: Lint und TypeScript bestanden, einmal ausgeführt.
Produktionsbuild bestanden, einmal ausgeführt (Vite 15,24 s).
`git diff --check` bestanden; neue Dateien zusätzlich auf nachgestellte
Leerzeichen geprüft. Bekannte Warnungstypen bestehen weiter: vier nicht
zur Buildzeit aufgelöste Public-Asset-Platzhalter und Hauptchunk über 500 kB
(546,88 kB; 148,36 kB gzip). Keine Assets verändert.
**Keine vollständige lokale Suite; vollständige Regression für GitHub-CI vorgesehen.**
Keine SQL-Änderung, deshalb keine neue Migration oder SQL-Fixture erforderlich.

## Dateien

Neu:

- `src/constants/performanceMedalEligibility.ts`
- `src/lib/performanceMedals.ts` und `performanceMedals.test.ts`
- `src/lib/statRankingComposition.ts`
- `src/components/stats/PerformanceMedalTable.tsx` und zugehöriger Test
- `src/hooks/usePerformanceDashboard.test.ts`
- `src/pages/StatsPage.medals.test.tsx`
- `src/services/performanceMedalContracts.test.ts`
- `docs/PERFORMANCE_PR_D.md`

Geändert:

- `src/pages/StatsPage.tsx`
- `src/components/stats/BadgeRankingSections.tsx` (gemeinsame Gruppenauswahl)
- `src/hooks/usePerformanceDashboard.ts` (Refresh-Generation)
- `src/services/dataGroupService.ts` und zugehöriger Test (optionales Register)

Alle Migrationen 001–078, Berechnungen/Keys aus PR A/B/C, Compare, Badges,
Trophäen, Eventpodien, Bier und Spielerprofile bleiben unverändert.

## Offene Browserabnahme und spätere Saisonvergabe

Keine Browserprüfung durchgeführt. Vor Veröffentlichung auf Preview prüfen:
375/390/1440 px, lange Namen, große Medaillenlisten, Tastaturfokus/Details,
Profillinks/Bereichslinks, Saisonwechsel mit verzögerter BINGO-Antwort, Retry,
Realtime/Eventabschluss, Spieler ohne Zeiten und Assetdarstellung.
Server-Top-10-Verträge sind statisch verifiziert; kein produktiver Runtime-Read.

P12 benötigt eingefrorene, auditierbare Saison-Snapshots mit Zeitpunkt,
Quellstand und versionierter Eligibility-Konfiguration. Die reine Aggregation
kann wiederverwendet werden, ihr aktuelles Live-Ergebnis ist kein Award-Ledger.
Keine permanente Speicherung, Profilmedaillen, Zahlenkönig-Stufen oder
Saisonabschlusslogik in PR D. PR E/F bleiben ebenfalls außerhalb dieses Changesets.
