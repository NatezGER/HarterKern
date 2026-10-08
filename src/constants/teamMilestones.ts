export type TeamMilestoneKind = "beer-volume" | "team-time";
export interface MilestoneSource { title: string; url: string; publisher?: string; accessedAt?: string }
export type TeamMilestoneDefinition = {
  id: string;
  kind: TeamMilestoneKind;
  /** Liters for beer-volume, seconds for team-time. */
  threshold: number;
  title: string;
  assetKey: string;
  description: string;
} & (
  | { interestingFact: string; source: MilestoneSource }
  | { interestingFact?: null; source?: MilestoneSource | null }
);

// Static product comparisons, not a live world-record database.
// Numeric thresholds change only by explicit product decision.
export const teamMilestones: readonly TeamMilestoneDefinition[] = [
  {
    "threshold": 0.5,
    "title": "Eine Vollblutspende",
    "id": "beer-blood-donation",
    "kind": "beer-volume",
    "assetKey": "beer-blood-donation",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 1,
    "title": "Maßkrug",
    "id": "beer-mass-1l",
    "kind": "beer-volume",
    "assetKey": "beer-mass-1l",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 1.5,
    "title": "täglicher Trinkwasserbedarf eines Menschen",
    "id": "beer-drinking-water",
    "kind": "beer-volume",
    "assetKey": "beer-drinking-water",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 3,
    "title": "Bierstiefel",
    "id": "beer-boot-3l",
    "kind": "beer-volume",
    "assetKey": "beer-boot-3l",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 5,
    "title": "Partyfass",
    "id": "beer-party-keg",
    "kind": "beer-volume",
    "assetKey": "beer-party-keg",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 5.5,
    "title": "Blutmenge eines Erwachsenen",
    "id": "beer-blood-volume",
    "kind": "beer-volume",
    "assetKey": "beer-blood-volume",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 6,
    "title": "eine Toilettenspülung",
    "id": "beer-toilet-flush",
    "kind": "beer-volume",
    "assetKey": "beer-toilet-flush",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 7.92,
    "title": "0,33-Bier-Kiste",
    "id": "beer-crate-033",
    "kind": "beer-volume",
    "assetKey": "beer-crate-033",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 10,
    "title": "20er-Kiste Bier à 0,5 L",
    "id": "beer-crate-05",
    "kind": "beer-volume",
    "assetKey": "beer-crate-05",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 12,
    "title": "Kiste Cola",
    "id": "beer-cola-crate",
    "kind": "beer-volume",
    "assetKey": "beer-cola-crate",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 20.4,
    "title": "Jack Keyes – Meistes Bier in 1 Stunde",
    "id": "beer-keyes-20-4",
    "kind": "beer-volume",
    "assetKey": "beer-keyes-20-4",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 26,
    "title": "Guinness-Rekord: 26 volle Maßkrüge gleichzeitig über 40 m getragen",
    "id": "beer-steins-26",
    "kind": "beer-volume",
    "assetKey": "beer-steins-26",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 36,
    "title": "Milchproduktion einer starken Milchkuh pro Tag",
    "id": "beer-cow-milk",
    "kind": "beer-volume",
    "assetKey": "beer-cow-milk",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 45,
    "title": "Körperwasser eines erwachsenen Mannes",
    "id": "beer-body-water",
    "kind": "beer-volume",
    "assetKey": "beer-body-water",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 50,
    "title": "Dänemark-Fass",
    "id": "beer-denmark-keg-50l",
    "kind": "beer-volume",
    "assetKey": "beer-denmark-keg-50l",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 51.1,
    "title": "Peter Dowdeswell – Meistes Bier in 3 Stunden",
    "id": "beer-dowdeswell-51-1",
    "kind": "beer-volume",
    "assetKey": "beer-dowdeswell-51-1",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 60,
    "title": "virtueller Wasserfußabdruck eines 0,2-L-Bier-Versuchs",
    "id": "beer-water-footprint-02",
    "kind": "beer-volume",
    "assetKey": "beer-water-footprint-02",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 73,
    "title": "André the Giant – legendär überlieferte 156–162 Bier",
    "id": "beer-andre-legend",
    "kind": "beer-volume",
    "assetKey": "beer-andre-legend",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 84.3,
    "title": "Jahresbierverbrauch eines Deutschen",
    "id": "beer-annual-consumption",
    "kind": "beer-volume",
    "assetKey": "beer-annual-consumption",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 99,
    "title": "virtueller Wasserfußabdruck einer 0,33-L-Bierflasche",
    "id": "beer-water-footprint-033",
    "kind": "beer-volume",
    "assetKey": "beer-water-footprint-033",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 117,
    "title": "Guinness-Rekord Champagnerflasche",
    "id": "beer-champagne-117",
    "kind": "beer-volume",
    "assetKey": "beer-champagne-117",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 120,
    "title": "Altpapiertonne",
    "id": "beer-paper-bin-120",
    "kind": "beer-volume",
    "assetKey": "beer-paper-bin-120",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 125,
    "title": "Wasserbedarf einer Kuh an einem heißen/leistungsintensiven Tag",
    "id": "beer-cow-water",
    "kind": "beer-volume",
    "assetKey": "beer-cow-water",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 130,
    "title": "virtueller Wasserfußabdruck einer Tasse Kaffee",
    "id": "beer-coffee",
    "kind": "beer-volume",
    "assetKey": "beer-coffee",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 150,
    "title": "Inhalt eines Einkaufswagens",
    "id": "beer-shopping-cart",
    "kind": "beer-volume",
    "assetKey": "beer-shopping-cart",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 180,
    "title": "klassische Badewanne",
    "id": "beer-bathtub-180l",
    "kind": "beer-volume",
    "assetKey": "beer-bathtub-180l",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 225,
    "title": "DIXI-Toiletten-Tank komplett mit Bier gefüllt",
    "id": "beer-dixi-tank",
    "kind": "beer-volume",
    "assetKey": "beer-dixi-tank",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 240,
    "title": "große Altpapiertonne",
    "id": "beer-paper-bin-240",
    "kind": "beer-volume",
    "assetKey": "beer-paper-bin-240",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 300,
    "title": "virtueller Wasserfußabdruck von 1 Liter Bier",
    "id": "beer-water-footprint-1l",
    "kind": "beer-volume",
    "assetKey": "beer-water-footprint-1l",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 311,
    "title": "Rekord-Whiskyflasche",
    "id": "beer-whisky-bottle",
    "kind": "beer-volume",
    "assetKey": "beer-whisky-bottle",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 370,
    "title": "Porsche-924-S-Kofferraum komplett mit Bier",
    "id": "beer-porsche-924",
    "kind": "beer-volume",
    "assetKey": "beer-porsche-924",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 625.5,
    "title": "größte Bierflasche der Welt",
    "id": "beer-beer-bottle",
    "kind": "beer-volume",
    "assetKey": "beer-beer-bottle",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 795,
    "title": "4-Personen-Whirlpool",
    "id": "beer-whirlpool",
    "kind": "beer-volume",
    "assetKey": "beer-whirlpool",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 1000,
    "title": "IBC-Container",
    "id": "beer-ibc",
    "kind": "beer-volume",
    "assetKey": "beer-ibc",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 2082,
    "title": "größtes Bierglas der Welt",
    "id": "beer-beer-glass",
    "kind": "beer-volume",
    "assetKey": "beer-beer-glass",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 2495,
    "title": "virtueller Wasserfußabdruck eines Baumwoll-T-Shirts",
    "id": "beer-cotton-shirt",
    "kind": "beer-volume",
    "assetKey": "beer-cotton-shirt",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 3094,
    "title": "größte Weinflasche der Welt",
    "id": "beer-wine-bottle",
    "kind": "beer-volume",
    "assetKey": "beer-wine-bottle",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 3370,
    "title": "DIXI-Kabine – hypothetischer Volumenvergleich",
    "id": "beer-dixi-cabin",
    "kind": "beer-volume",
    "description": "Gedankenspiel mit dem gerundeten Außenquader einer DIXI-PLUS-Kabine. Keine tatsächliche Füllkapazität.",
    "assetKey": "beer-dixi-cabin",
    "interestingFact": null
  },
  {
    "threshold": 4500,
    "title": "Gartenpool",
    "id": "beer-pool",
    "kind": "beer-volume",
    "assetKey": "beer-pool",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 9000,
    "title": "Betonmischer",
    "id": "beer-concrete-mixer",
    "kind": "beer-volume",
    "assetKey": "beer-concrete-mixer",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 10000,
    "title": "Löschfahrzeug-Tank",
    "id": "beer-fire-engine",
    "kind": "beer-volume",
    "assetKey": "beer-fire-engine",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 12910,
    "title": "größter Bierkrug der Welt",
    "id": "beer-beer-mug",
    "kind": "beer-volume",
    "assetKey": "beer-beer-mug",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 15500,
    "title": "virtueller Wasserfußabdruck von 1 kg Rindfleisch",
    "id": "beer-beef",
    "kind": "beer-volume",
    "assetKey": "beer-beef",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 17000,
    "title": "Wasserfußabdruck von 1 kg Schokolade (rund)",
    "id": "beer-chocolate",
    "kind": "beer-volume",
    "description": "Gerundeter Vergleichswert für den virtuellen Wasserfußabdruck. Kein exakter Wasserverbrauch jeder Schokolade.",
    "source": {
      "title": "Wasserfußabdruck verstehen",
      "url": "https://environment.ec.europa.eu/news/video-crash-course-understanding-your-water-footprint-2024-07-10_en",
      "publisher": "Europäische Kommission",
      "accessedAt": "2026-10-07"
    },
    "assetKey": "beer-chocolate",
    "interestingFact": null
  },
  {
    "threshold": 30000,
    "title": "Tankauflieger / Tankwagen",
    "id": "beer-tanker",
    "kind": "beer-volume",
    "assetKey": "beer-tanker",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 219000,
    "title": "Das Große Fass im Heidelberger Schloss",
    "id": "beer-heidelberg-barrel",
    "kind": "beer-volume",
    "assetKey": "beer-heidelberg-barrel",
    "description": "Ein Größenvergleich für eure gemeinsam gesammelte Eventmenge.",
    "interestingFact": null
  },
  {
    "threshold": 47,
    "title": "schnellster Bundesliga-Doppelpack (Ebbe Sand)",
    "id": "team-sand-47",
    "kind": "team-time",
    "assetKey": "team-sand-47",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 43.03,
    "title": "400-m-Weltrekord Männer",
    "id": "team-400m-43-03",
    "kind": "team-time",
    "assetKey": "team-400m-43-03",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 43,
    "title": "Marcel Titsch-Rivero – Rote Karte 43 s nach Einwechslung",
    "id": "team-red-card-43",
    "kind": "team-time",
    "assetKey": "team-red-card-43",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 39.1,
    "title": "erster Motorflug auf einem anderen Planeten",
    "id": "team-ingenuity-39-10",
    "kind": "team-time",
    "interestingFact": "Ingenuitys erster kontrollierter Motorflug auf dem Mars fand am 19. April 2021 statt.",
    "source": {
      "title": "Ingenuity: Historic First Flight",
      "url": "https://www.nasa.gov/news-release/nasas-ingenuity-mars-helicopter-succeeds-in-historic-first-flight/",
      "publisher": "NASA",
      "accessedAt": "2026-10-07"
    },
    "assetKey": "team-ingenuity-39-10",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten."
  },
  {
    "threshold": 36.84,
    "title": "4×100-m-Weltrekord Männer",
    "id": "team-relay-36-84",
    "kind": "team-time",
    "assetKey": "team-relay-36-84",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 33.61,
    "title": "500-m-Weltrekord im Eisschnelllauf der Männer",
    "id": "team-speedskating-33-61",
    "kind": "team-time",
    "assetKey": "team-speedskating-33-61",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 30.97,
    "title": "Usain Bolt – 300 m",
    "id": "team-bolt-300m",
    "kind": "team-time",
    "assetKey": "team-bolt-300m",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 29.98,
    "title": "alle 118 Elemente des Periodensystems aufsagen",
    "id": "team-periodic-table",
    "kind": "team-time",
    "assetKey": "team-periodic-table",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 29.49,
    "title": "5×5×5-Rubik’s-Cube-Weltrekord",
    "id": "team-cube-29-49",
    "kind": "team-time",
    "assetKey": "team-cube-29-49",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 29.2,
    "title": "längste Flugzeit eines Papierfliegers",
    "id": "team-paper-plane",
    "kind": "team-time",
    "assetKey": "team-paper-plane",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 29.1,
    "title": "Schall braucht für 10 km",
    "id": "team-sound-10km",
    "kind": "team-time",
    "assetKey": "team-sound-10km",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 26.59,
    "title": "Minesweeper auf „Experte“ – 99 Minen lösen",
    "id": "team-minesweeper-26-59",
    "kind": "team-time",
    "assetKey": "team-minesweeper-26-59",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 25.96,
    "title": "100 Meter Sackhüpfen – Rekord",
    "id": "team-sack-race-25-96",
    "kind": "team-time",
    "assetKey": "team-sack-race-25-96",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 25.95,
    "title": "50 m Brust Männer – Weltrekord",
    "id": "team-breaststroke-25-95",
    "kind": "team-time",
    "assetKey": "team-breaststroke-25-95",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 25.21,
    "title": "mit einem Auto von 0 auf 400 und wieder auf 0",
    "id": "team-jesko-25-21",
    "kind": "team-time",
    "assetKey": "team-jesko-25-21",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 25.01,
    "title": "1 Liter Wasser im Handstand trinken",
    "id": "team-handstand-25-01",
    "kind": "team-time",
    "assetKey": "team-handstand-25-01",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 23,
    "title": "Nedim Bajrami – schnellstes Tor der EM-Geschichte",
    "id": "team-bajrami-23",
    "kind": "team-time",
    "assetKey": "team-bajrami-23",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 21.34,
    "title": "200-m-Weltrekord Frauen",
    "id": "team-200m-women",
    "kind": "team-time",
    "assetKey": "team-200m-women",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 21.05,
    "title": "3 Minecraft-Kuchen herstellen und essen",
    "id": "team-minecraft",
    "kind": "team-time",
    "assetKey": "team-minecraft",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 21,
    "title": "schnellster NHL-Hattrick",
    "id": "team-nhl-21",
    "kind": "team-time",
    "assetKey": "team-nhl-21",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 20.88,
    "title": "50-m-Freistil-Weltrekord Männer",
    "id": "team-freestyle-20-88",
    "kind": "team-time",
    "assetKey": "team-freestyle-20-88",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 19.68,
    "title": "Tetris 40 Lines",
    "id": "team-tetris-19-68",
    "kind": "team-time",
    "assetKey": "team-tetris-19-68",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 19.19,
    "title": "Usain Bolts 200-m-Weltrekord",
    "id": "team-bolt-200m",
    "kind": "team-time",
    "assetKey": "team-bolt-200m",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 18.45,
    "title": "zwei Liter Limonade trinken",
    "id": "team-soda-18-45",
    "kind": "team-time",
    "assetKey": "team-soda-18-45",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  },
  {
    "threshold": 18.15,
    "title": "einen Hotdog ohne Hände essen",
    "id": "team-hotdog-18-15",
    "kind": "team-time",
    "assetKey": "team-hotdog-18-15",
    "description": "Eine Vergleichsmarke für die Summe eurer zehn schnellsten persönlichen Bestzeiten.",
    "interestingFact": null
  }
];
export const beerMilestones = teamMilestones.filter(m => m.kind === "beer-volume").sort((a,b) => a.threshold-b.threshold);
export const teamTimeMilestones = teamMilestones.filter(m => m.kind === "team-time").sort((a,b) => b.threshold-a.threshold);
