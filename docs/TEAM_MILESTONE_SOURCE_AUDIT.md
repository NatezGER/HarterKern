# Team Milestone Source Audit — vereinfachter Produktstand

Stand 2026-10-07. Die Nutzerfreigabe ersetzt die flächendeckende Recherchepflicht:
Die 46 Bier- und 25 Teamzeit-Stufen sind gewünschter statischer Produktcontent,
keine laufend verifizierte Weltrekord-Datenbank. Kein Blockieren wegen fehlender
Quellen. Keine Behauptung, alle 71 Einträge seien unabhängig geprüft.

## Freigegebene Entscheidungen

| Eintrag | Umsetzung |
|---|---|
| Schokolade | Mit ausdrücklicher Freigabe von 24.000 auf **17.000 L** geändert; Titel enthält „rund“. EU-Kommission beschreibt über 17.000 L/kg, daher gerundete Produktmarke, kein exakter Universalwert. |
| DIXI-Kabine | **3.370 L unverändert**. Titel „hypothetischer Volumenvergleich“, Erklärung: gerundeter Außenquader, keine reale Füllkapazität. |
| Jack Keyes | **20,4 L**, Name und gewünschte Disziplin unverändert übernommen. Kein Zusatzfakt und kein vorgetäuschter Quellenbeleg. |
| Minesweeper Experte | **26,59 s**, gewünschter Titel inklusive 99 Minen übernommen. Kein Zusatzfakt und kein vorgetäuschter Quellenbeleg. |
| Übrige Stufen | Vorgegebene Schwellen erhalten; keine umfassende Einzelprüfung. Kein verworfener Duschen-Eintrag bei 60 L. |

Quellen zu den konkreten Entscheidungen:
- [EU-Kommission, 2024](https://environment.ec.europa.eu/news/video-crash-course-understanding-your-water-footprint-2024-07-10_en):
  über 17.000 Liter für 1 kg Schokolade; 17.000 L ist die freigegebene gerundete Stufe.
- [TOI TOI & DIXI PLUS](https://www.toitoidixi.de/produkte-services/produkt/dixi-plus/):
  Außenmaße 1,20 × 1,20 × 2,34 m ergeben rechnerisch 3.369,6 L Außenquader;
  der separate Tank hat 225 L. Keine reale Befüllbarkeit behaupten.

## Optionale Zusatzfakten

Ein einziger veröffentlichter Zusatzfakt: Ingenuitys erster kontrollierter
Motorflug auf dem Mars am 19. April 2021.
[NASA-Primärquelle](https://www.nasa.gov/news-release/nasas-ingenuity-mars-helicopter-succeeds-in-historic-first-flight/)
belegt Datum und 39,1 Sekunden. Alle anderen interestingFact-Felder sind null.
Die Schokoladenquelle ist eine Quellenangabe ohne zusätzlichen Trivia-Text.

Der TypeScript-Typ verlangt bei gesetztem Fact eine Source. Die UI prüft auch
zur Laufzeit Source-Titel und HTTPS-URL, bevor sie einen Fact anzeigt.
Eine Source allein macht andere unbezogene Aussagen nicht zu verifizierten Fakten.
Die ursprünglichen Audit-Zwischenzahlen sind kein aktueller Freigabestatus
und werden nicht als vollständige Verifikation veröffentlicht.
